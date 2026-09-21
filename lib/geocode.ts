import type { Location } from "./types";

// OpenStreetMap's Nominatim — free, keyless geocoding. Its usage policy asks
// callers to identify themselves with a real User-Agent, which browsers
// refuse to let client-side JS set — so both search and reverse lookups are
// proxied through these server routes rather than called from the browser.
const UA = "SurakshaSetu/1.0 (disaster-alert app; https://github.com/aary-create/Suraksha-setu)";
const BASE = "https://nominatim.openstreetmap.org";

function pickDistrict(a: Record<string, string>): string {
  return a.state_district || a.county || a.city_district || a.city || a.town || a.village || "";
}

function toGeoResult(row: any): Location {
  const a = row.address ?? {};
  return {
    label: row.display_name ?? "",
    lat: Number(row.lat),
    lng: Number(row.lon),
    district: pickDistrict(a),
    state: a.state ?? "",
  };
}

export async function searchPlace(query: string): Promise<Location[]> {
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=6&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Nominatim search returned ${res.status}`);
  const rows = (await res.json()) as any[];
  return rows.map(toGeoResult);
}

export async function reverseGeocode(lat: number, lng: number): Promise<Location> {
  const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Nominatim reverse returned ${res.status}`);
  const row = await res.json();
  const g = toGeoResult(row);
  return g.label ? g : { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng, district: "", state: "" };
}
