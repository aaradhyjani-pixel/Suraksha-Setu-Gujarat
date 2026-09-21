// Small hand-drawn line icons per hazard, sized to sit next to the hazard
// headline. currentColor so they inherit the severity color.
const PATHS: Record<string, string> = {
  flood: "M3 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M3 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M7 9l3-5 3 5 3-5 3 5",
  cyclone: "M12 3a9 9 0 1 0 8.5 6M12 3a5 5 0 1 1-4.2 7.7M12 3v4",
  heavy_rain: "M7 13a5 5 0 0 1 .3-9.98A6 6 0 0 1 18.6 6 4.5 4.5 0 0 1 18 15H8a5 5 0 0 1-1-2zM8 18l-1.5 3M12.5 18 11 21M17 18l-1.5 3",
  heatwave: "M12 3v6M8 6l1.8 3.2M16 6l-1.8 3.2M12 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  thunderstorm: "M7 13a5 5 0 0 1 .3-9.98A6 6 0 0 1 18.6 6 4.5 4.5 0 0 1 18 15H8a5 5 0 0 1-1-2zM13 14l-3 5h3l-2 4",
  earthquake: "M2 15l3-3 2 2 3-5 2 3 3-4 2 3 3-3 2 2M2 19h20",
  other: "M12 3l9 16H3zM12 9v5M12 17h.01",
};

export default function HazardIcon({ hazard, size = 28 }: { hazard: string; size?: number }) {
  const d = PATHS[hazard] ?? PATHS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
