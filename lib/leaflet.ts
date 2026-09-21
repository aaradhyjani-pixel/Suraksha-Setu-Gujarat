declare global {
  interface Window { L?: any }
}

let leafletPromise: Promise<any> | null = null;

// Loads Leaflet (JS + CSS) from a CDN once, cached for reuse. No API key —
// OpenStreetMap tiles are free for light, non-commercial-scale use like this.
export function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => { leafletPromise = null; reject(new Error("failed to load Leaflet")); };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

// Dims the OpenStreetMap tiles to fit the app's dark theme, without also
// inverting marker icons and popups (which sit in separate Leaflet panes).
export function darkenTiles(map: any) {
  const pane = map.getPane("tilePane");
  if (pane) pane.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.7)";
}
