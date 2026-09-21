import { haversineKm } from "./geo";
import type { HelpPlace } from "./types";

// Overpass API — free, keyless queries against OpenStreetMap data. Finds
// real hospitals (amenity=hospital) within a radius of a point. Proxied
// server-side to keep one consistent place to adjust the query/timeout,
// same pattern as the geocoding routes.
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 8000; // 8km search radius

export async function nearbyHospitals(lat: number, lng: number): Promise<HelpPlace[]> {
  const query = `[out:json][timeout:15];nwr(around:${RADIUS_M},${lat},${lng})["amenity"="hospital"];out center 25;`;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
  const data = await res.json();
  const elements = (data.elements ?? []) as any[];

  const places: HelpPlace[] = elements
    .map((e) => {
      const elat = e.lat ?? e.center?.lat;
      const elng = e.lon ?? e.center?.lon;
      if (elat == null || elng == null) return null;
      const tags = e.tags ?? {};
      const name = tags.name || tags["name:en"] || "Hospital";
      const phone = tags.phone || tags["contact:phone"] || undefined;
      return {
        name,
        lat: elat,
        lng: elng,
        place_id: `${e.type}/${e.id}`,
        phone,
        distance_km: haversineKm({ lat, lng }, { lat: elat, lng: elng }),
      } as HelpPlace;
    })
    .filter((p): p is HelpPlace => p !== null);

  places.sort((a, b) => a.distance_km - b.distance_km);
  return places.slice(0, 10);
}
