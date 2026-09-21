import seed from "@/data/seed.json";
import translations from "@/data/translations.json";
import { sql } from "./db";
import { fetchSachetAlerts } from "./sachet";
import { fetchImdAlerts } from "./cap";
import { haversineKm } from "./geo";
import { SEVERITY_RANK } from "./severity";
import type { LiveAlert, Profile } from "./types";

// Live alerts from both real sources, merged. No invented/sample alerts —
// if both feeds are down, there simply are no live alerts.
export async function fetchLiveAlerts(): Promise<{ sachetOk: boolean; imdOk: boolean; alerts: LiveAlert[] }> {
  const [sachet, imd] = await Promise.all([fetchSachetAlerts(), fetchImdAlerts()]);
  return { sachetOk: sachet.ok, imdOk: imd.ok, alerts: [...sachet.alerts, ...imd.alerts] };
}

// An alert "applies" to a point if the point falls inside the alert's warned
// area (SACHET gives a real radius from its area_covered figure, plus a 20km
// buffer for imprecision), or — for alerts with no coordinates (the IMD
// bulletin feed) — if the district/state name appears in the alert's area text.
export function alertsNear(alerts: LiveAlert[], lat: number, lng: number, district: string, state: string): LiveAlert[] {
  return alerts.filter((a) => {
    if (a.lat != null && a.lng != null) {
      const radius = (a.radius_km ?? 25) + 20;
      return haversineKm({ lat, lng }, { lat: a.lat, lng: a.lng }) <= radius;
    }
    const hay = a.area_text.toLowerCase();
    return (!!district && hay.includes(district.toLowerCase())) || (!!state && hay.includes(state.toLowerCase()));
  });
}

// Highest-severity alert in scope, plus every agency reporting the same
// hazard type — if they disagree on severity, the higher one is shown and
// every agency is still listed.
export function currentAlert(alerts: LiveAlert[]) {
  if (!alerts.length) return null;
  const top = [...alerts].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.timestamp.localeCompare(a.timestamp)
  )[0];
  const sources = alerts
    .filter((a) => a.hazard_type === top.hazard_type)
    .map((a) => ({ agency: a.source_agency, severity: a.severity, headline: a.headline }));
  const conflict = new Set(sources.map((s) => s.severity)).size > 1;
  return { alert: top, sources, conflict };
}

type DwellingRule = { dwelling_type: string; hazard_type: string; language: string; action_text: string };
type OccupationTip = { occupation: string; hazard_type: string; language: string; tip_text: string };

function seedDwellingRules(): DwellingRule[] {
  const tr = translations.dwelling_rules as Record<string, Record<string, string>>;
  return seed.dwelling_rules.flatMap((r) => [
    { ...r, language: "en" },
    ...Object.entries(tr[`${r.dwelling_type}|${r.hazard_type}`] ?? {}).map(([language, action_text]) => ({ ...r, language, action_text })),
  ]);
}
const DWELLING_RULES = seedDwellingRules(); // static reference data, computed once
const OCCUPATION_TIPS = seed.occupation_tips.map((t) => ({ ...t, language: "en" })) as OccupationTip[];

export async function actionFor(profile: Profile, hazard: string) {
  const { dwelling_type: d, occupation: o, language } = profile;

  let action = "";
  outer: for (const dd of [d, "*"]) {
    for (const lang of [language, "en"]) {
      const hit = DWELLING_RULES.find((r) => r.dwelling_type === dd && r.hazard_type === hazard && r.language === lang)
        ?? (dd === "*" && lang === "en" ? DWELLING_RULES.find((r) => r.dwelling_type === "*" && r.hazard_type === "*") : undefined);
      if (hit) { action = hit.action_text; break outer; }
    }
  }

  const occupationTip = OCCUPATION_TIPS.find((t) => t.occupation === o && t.hazard_type === hazard)
    ?? OCCUPATION_TIPS.find((t) => t.occupation === o && t.hazard_type === "*");

  const vulnTr = translations.vulnerability_tips as Record<string, Record<string, string>>;
  const vulnEn = seed.vulnerability_tips as Record<string, Record<string, string>>;
  const vulnerabilityTips = profile.vulnerabilities
    .map((v) => {
      const h = vulnEn[v]?.[hazard] ? hazard : "*";
      return vulnTr[`${v}|${h}`]?.[language] ?? vulnEn[v]?.[h];
    })
    .filter(Boolean) as string[];

  return { action, occupationTip: occupationTip?.tip_text ?? null, vulnerabilityTips };
}

export const helplines = seed.helplines;

const HAZARD_GUIDE = seed.hazard_guide as Record<string, { before: string[]; after: string[] }>;
export function hazardGuide(hazard: string) {
  return HAZARD_GUIDE[hazard] ?? null;
}

async function withDb<T>(run: (db: NonNullable<typeof sql>) => Promise<T>, fallback: () => T): Promise<T> {
  if (!sql) return fallback();
  try {
    return await run(sql);
  } catch (err) {
    console.error("[DB] query failed:", err);
    return fallback();
  }
}

export async function saveUser(p: Profile) {
  return withDb<{ saved: boolean }>(
    async (db) => {
      await db`insert into users (label, lat, lng, district, state, dwelling_type, occupation, vulnerabilities, language)
        values (${p.label}, ${p.lat}, ${p.lng}, ${p.district}, ${p.state}, ${p.dwelling_type}, ${p.occupation}, ${p.vulnerabilities}, ${p.language})`;
      return { saved: true };
    },
    () => ({ saved: false })
  );
}

// ESP32 nodes have a fixed physical location (set once in the firmware), so
// they report lat/lng directly rather than a district name.
type NodePing = { node_id: string; lat: number; lng: number; last_cached_ts: number | null; last_seen: string };
const memoryPings = new Map<string, NodePing>();

export async function recordPing(p: Omit<NodePing, "last_seen">) {
  memoryPings.set(p.node_id, { ...p, last_seen: new Date().toISOString() });
  await withDb<unknown>(
    (db) => db`insert into esp32_nodes (node_id, lat, lng, last_cached_ts, last_seen)
      values (${p.node_id}, ${p.lat}, ${p.lng}, ${p.last_cached_ts}, now())
      on conflict (node_id) do update set lat = excluded.lat, lng = excluded.lng,
        last_cached_ts = excluded.last_cached_ts, last_seen = now()`,
    () => null
  );
}

// The nearest node reporting from within 50km, if any.
export async function nearestNode(lat: number, lng: number): Promise<NodePing | null> {
  const fromMemory = () => {
    const near = [...memoryPings.values()].filter((n) => haversineKm({ lat, lng }, n) <= 50);
    return near.sort((a, b) => haversineKm({ lat, lng }, a) - haversineKm({ lat, lng }, b))[0] ?? null;
  };
  return withDb(async (db) => {
    const rows = (await db`select * from esp32_nodes`) as any[];
    const near = rows.filter((n) => haversineKm({ lat, lng }, n) <= 50);
    if (!near.length) return null;
    const closest = near.sort((a, b) => haversineKm({ lat, lng }, a) - haversineKm({ lat, lng }, b))[0];
    return { ...closest, last_cached_ts: closest.last_cached_ts == null ? null : Number(closest.last_cached_ts), last_seen: new Date(closest.last_seen).toISOString() };
  }, fromMemory);
}
