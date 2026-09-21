import data from "@/data/gujarat-places.json";

// Real government data (India's Local Government Directory, Ministry of
// Panchayati Raj) — every district, taluka and inhabited village in
// Gujarat: 33 districts, 270 talukas, 18,651 villages. Loaded once, held
// in memory; the file itself is ~210KB so this costs nothing meaningful.
type Tree = Record<string, Record<string, string[]>>;
const TREE = data as Tree;

export function gujaratDistricts(): string[] {
  return Object.keys(TREE).sort();
}

export function gujaratTalukas(district: string): string[] {
  return Object.keys(TREE[district] ?? {}).sort();
}

export function gujaratVillages(district: string, taluka: string): string[] {
  return TREE[district]?.[taluka] ?? [];
}
