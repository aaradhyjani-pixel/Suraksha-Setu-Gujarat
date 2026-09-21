import type { Profile } from "./types";

// Labels for these ids live in lib/i18n.ts (d_*, o_*, v_*, h_*)
export const DWELLINGS = ["flood_prone_lane", "ground_floor", "mid_floor", "high_rise", "kutcha_house", "higher_ground"] as const;
export const OCCUPATIONS = ["farmer", "fisherman", "daily_wage_worker", "healthcare_worker", "school_parent", "general_resident"] as const;
export const VULNERABILITIES = ["elderly", "infant_or_pregnant", "disability", "chronic_illness", "livestock"] as const;
export const HAZARDS = ["flood", "cyclone", "heavy_rain", "heatwave", "thunderstorm", "earthquake", "other"] as const;

const PROFILE_KEY = "ss:profile";
export const CACHE_KEY = "ss:lastDashboard";

export function loadProfile(): Profile | null {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
  } catch {
    return null;
  }
}
export const saveProfile = (p: Profile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
