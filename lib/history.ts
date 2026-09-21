import type { Severity } from "./types";

const KEY = "ss:history";
const RETAIN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days, per-device
const HARD_CAP = 200; // safety ceiling regardless of age

export type HistoryEntry = {
  timestamp: string; // when this was recorded on this device, ISO
  label: string;
  hazard_type: string | null;
  severity: Severity | null;
  headline: string | null;
  source_agency: string | null;
  action: string | null;
};

function read(): HistoryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function prune(entries: HistoryEntry[]): HistoryEntry[] {
  const cutoff = Date.now() - RETAIN_MS;
  return entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff).slice(0, HARD_CAP);
}

// Appends only when the situation actually changed since the last recorded
// entry — a five-day log of *changes*, not a bloated dump of every 5-minute
// poll. Also records the calm return to "no alert" so gaps are visible.
export function recordHistory(entry: Omit<HistoryEntry, "timestamp">): HistoryEntry[] {
  const entries = prune(read());
  const last = entries[0];
  const changed = !last || last.hazard_type !== entry.hazard_type || last.severity !== entry.severity || last.headline !== entry.headline;
  if (changed) entries.unshift({ ...entry, timestamp: new Date().toISOString() });
  const pruned = prune(entries);
  localStorage.setItem(KEY, JSON.stringify(pruned));
  return pruned;
}

export function readHistory(): HistoryEntry[] {
  const entries = prune(read());
  localStorage.setItem(KEY, JSON.stringify(entries)); // persist the prune even without a new write
  return entries;
}
