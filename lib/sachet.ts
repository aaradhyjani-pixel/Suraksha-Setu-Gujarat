import type { LiveAlert } from "./types";
import { hazardFrom, severityFromColor } from "./severity";

// SACHET (sachet.ndma.gov.in) is NDMA's national alert aggregator: IMD, CWC and
// every state SDMA publish into it. This endpoint is public, keyless JSON, no
// CAP-XML parsing needed — it already gives lat/lng ("centroid") and the
// warned area in km², which is what lets the app match "is this alert near
// this exact point" instead of matching by a fixed list of district names.
const URL = "http://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails";
const REFRESH_SECONDS = 300;

// Java Date#toString format: "Sat Sep 19 17:35:00 IST 2026". IST has no
// reliable cross-runtime parse, so read the fields and apply the +05:30 offset.
const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseIst(s: string): string {
  const m = /^\w+ (\w+) (\d+) (\d+):(\d+):(\d+) IST (\d+)$/.exec(String(s ?? ""));
  if (!m) return new Date().toISOString();
  const [, mon, day, hh, mm, ss, year] = m;
  const ms = Date.UTC(+year, MONTHS[mon] ?? 0, +day, +hh, +mm, +ss) - (5 * 60 + 30) * 60_000;
  return new Date(ms).toISOString();
}

// "lng,lat" per the API's own samples (India's lng ~68-97, lat ~8-37 — the
// first number is always in the lng range), not GeoJSON's usual [lng,lat] array.
function parseCentroid(s: unknown): { lat: number; lng: number } | null {
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(String(s ?? ""));
  if (!m) return null;
  return { lng: Number(m[1]), lat: Number(m[2]) };
}

// A circle of this area, in km — used as the "is this alert local to you" radius.
function radiusFromArea(sqKm: unknown): number | null {
  const a = Number(sqKm);
  return Number.isFinite(a) && a > 0 ? Math.sqrt(a / Math.PI) : null;
}

export async function fetchSachetAlerts(): Promise<{ ok: boolean; alerts: LiveAlert[] }> {
  try {
    const res = await fetch(URL, { next: { revalidate: REFRESH_SECONDS }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`SACHET returned ${res.status}`);
    const rows = (await res.json()) as any[];
    const alerts: LiveAlert[] = rows.map((r) => {
      const c = parseCentroid(r.centroid);
      return {
        id: `sachet-${r.identifier}`,
        hazard_type: hazardFrom(`${r.disaster_type ?? ""}`),
        severity: severityFromColor(r.severity_color),
        source_agency: String(r.alert_source ?? "SACHET"),
        area_text: String(r.area_description ?? ""),
        headline: String(r.disaster_type ?? "Alert"),
        timestamp: parseIst(r.effective_start_time),
        lat: c?.lat ?? null,
        lng: c?.lng ?? null,
        radius_km: radiusFromArea(r.area_covered),
      };
    });
    return { ok: true, alerts };
  } catch (err) {
    console.error("[SACHET] feed unavailable:", err);
    return { ok: false, alerts: [] };
  }
}
