export type Severity = "Extreme" | "Severe" | "Moderate" | "Minor";

export type Location = {
  label: string;   // what the person searched or the reverse-geocoded address
  lat: number;
  lng: number;
  district: string; // best-effort, from geocoding — used as a text fallback match
  state: string;
};

export type LiveAlert = {
  id: string;
  hazard_type: string;
  severity: Severity;
  source_agency: string;
  area_text: string;
  headline: string;
  timestamp: string; // ISO
  lat: number | null;
  lng: number | null;
  radius_km: number | null; // derived from the source's reported area, null if unknown
};

export type Profile = Location & {
  dwelling_type: string;
  occupation: string;
  vulnerabilities: string[];
  language: string;
};

export type HelpPlace = {
  name: string;
  lat: number;
  lng: number;
  place_id: string;
  phone?: string;
  distance_km: number;
};
