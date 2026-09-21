import { XMLParser } from "fast-xml-parser";
import type { LiveAlert } from "./types";
import { hazardFrom, normalizeSeverity } from "./severity";

// IMD's own district-bulletin CAP feed — a different product from the
// nowcasts SACHET carries (bulletin-level vs. short-range nowcast), so both
// are worth keeping. No lat/lng in this format, only place names, so alerts
// from here are matched by district/state text rather than distance.
const RSS_URL = "https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml";
const MAX_ITEMS = 30;
const REFRESH_SECONDS = 600;

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
const list = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const text = (x: unknown) => (x && typeof x === "object" && "#text" in x ? String((x as any)["#text"]) : String(x ?? ""));

async function fetchText(url: string) {
  const res = await fetch(url, { next: { revalidate: REFRESH_SECONDS }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

async function itemToAlert(item: any): Promise<LiveAlert> {
  const title = text(item.title);
  const alert: LiveAlert = {
    id: `imd-${text(item.guid) || text(item.link) || title}`,
    hazard_type: hazardFrom(title),
    severity: "Moderate",
    source_agency: "IMD",
    area_text: text(item.description),
    headline: title,
    timestamp: new Date(text(item.pubDate) || Date.now()).toISOString(),
    lat: null,
    lng: null,
    radius_km: null,
  };
  if (!item.link) return alert;
  try {
    const cap = parser.parse(await fetchText(text(item.link)))?.alert;
    const infos = list<any>(cap?.info);
    const info = infos.find((i) => text(i.language || "en").startsWith("en")) ?? infos[0];
    if (!info) return alert;
    alert.severity = normalizeSeverity(info.severity);
    alert.hazard_type = hazardFrom(`${text(info.event)} ${text(info.headline)}`);
    alert.headline = text(info.headline) || text(info.event) || title;
    const areas = list<any>(info.area).map((a) => text(a.areaDesc)).filter(Boolean);
    if (areas.length) alert.area_text = areas.join(", ");
    if (cap.sent) alert.timestamp = new Date(text(cap.sent)).toISOString();
  } catch {
    // keep the RSS-level fields if the linked CAP document can't be read
  }
  return alert;
}

export async function fetchImdAlerts(): Promise<{ ok: boolean; alerts: LiveAlert[] }> {
  try {
    const rss = parser.parse(await fetchText(RSS_URL));
    const items = list<any>(rss?.rss?.channel?.item).slice(0, MAX_ITEMS);
    const alerts = await Promise.all(items.map(itemToAlert));
    return { ok: alerts.length > 0, alerts };
  } catch (err) {
    console.error("[IMD] feed unavailable:", err);
    return { ok: false, alerts: [] };
  }
}
