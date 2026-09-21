// Caches each alert's AI explanation on-device, keyed by alert id, for 5
// days — the same retention as the rest of the local history. A given
// alert's explanation is fetched from the API at most once per device;
// every view after that, online or offline, reads this cache instantly.
const KEY = "ss:aiExplain";
const RETAIN_MS = 5 * 24 * 60 * 60 * 1000;

type Cache = Record<string, { text: string; timestamp: string }>;

function read(): Cache {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function prune(cache: Cache): Cache {
  const cutoff = Date.now() - RETAIN_MS;
  const out: Cache = {};
  for (const [id, entry] of Object.entries(cache)) {
    if (new Date(entry.timestamp).getTime() >= cutoff) out[id] = entry;
  }
  return out;
}

export function getCachedExplanation(alertId: string): string | null {
  return prune(read())[alertId]?.text ?? null;
}

export function cacheExplanation(alertId: string, text: string) {
  const cache = prune(read());
  cache[alertId] = { text, timestamp: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(cache));
}
