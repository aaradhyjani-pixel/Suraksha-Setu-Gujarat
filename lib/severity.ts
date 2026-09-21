import type { Severity } from "./types";

export const SEVERITY_RANK: Record<Severity, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 };

// SACHET's severity_color is the one field every source in the feed sets consistently.
export function severityFromColor(color: unknown): Severity {
  switch (String(color ?? "").trim().toLowerCase()) {
    case "red": return "Extreme";
    case "orange": return "Severe";
    case "green": return "Minor";
    default: return "Moderate"; // yellow and anything unrecognized
  }
}

export function normalizeSeverity(s: unknown): Severity {
  const v = String(s ?? "").trim().toLowerCase();
  if (v === "extreme") return "Extreme";
  if (v === "severe") return "Severe";
  if (v === "minor") return "Minor";
  return "Moderate";
}

export const HAZARD_LABEL: Record<string, string> = {
  flood: "Flood",
  cyclone: "Cyclone",
  heavy_rain: "Heavy rain",
  heatwave: "Heatwave",
  thunderstorm: "Thunderstorm",
  earthquake: "Earthquake",
  other: "Weather alert",
};

// SACHET and IMD both write disaster type as free text ("Moderate Thunderstorms
// with surface wind", "Very Heavy Rain", "Squally weather"...) — bucket it into
// the categories the app has precautions for.
export function hazardFrom(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("cyclon")) return "cyclone";
  if (t.includes("flood")) return "flood";
  if (t.includes("heat")) return "heatwave";
  if (t.includes("earthquake") || t.includes("quake") || t.includes("seismic")) return "earthquake";
  if (t.includes("thunder") || t.includes("lightning") || t.includes("squall")) return "thunderstorm";
  if (t.includes("rain")) return "heavy_rain";
  return "other";
}
