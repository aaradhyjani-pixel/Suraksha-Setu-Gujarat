"use client";
import HazardIcon from "@/components/HazardIcon";
import type { HistoryEntry } from "@/lib/history";
import type { Key, T } from "@/lib/i18n";

// A breakdown of the person's own 5-day local log — built entirely from
// data already stored on-device, nothing new collected, nothing sent
// anywhere. Counts real alert-changes, not raw polls.
export default function PersonalStats({ history, t }: { history: HistoryEntry[]; t: T }) {
  const alertEntries = history.filter((h) => h.hazard_type);
  if (alertEntries.length === 0) return null;

  const byHazard = new Map<string, number>();
  for (const h of alertEntries) byHazard.set(h.hazard_type!, (byHazard.get(h.hazard_type!) ?? 0) + 1);
  const sorted = [...byHazard.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="stats-grid">
      {sorted.map(([hazard, count]) => (
        <div key={hazard} className="stat-card">
          <HazardIcon hazard={hazard} size={20} />
          <span className="stat-count">{count}</span>
          <span className="muted" style={{ fontSize: 13 }}>{t(`h_${hazard}` as Key)}</span>
        </div>
      ))}
    </div>
  );
}
