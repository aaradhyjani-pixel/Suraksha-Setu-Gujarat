import { NextResponse } from "next/server";
import { alertsNear, currentAlert, fetchLiveAlerts, recordPing } from "@/lib/data";
import { HAZARD_LABEL } from "@/lib/severity";

export const dynamic = "force-dynamic";

// ESP32 nodes have a fixed physical install location, set once in the
// firmware as NODE_LAT/NODE_LNG. Body: { node_id, lat, lng, last_cached_timestamp }
// Returns what the node's own GET /api/alert serves: { payload, timestamp, online }
async function sync(nodeId: string, lat: number, lng: number, lastCached?: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  if (nodeId) await recordPing({ node_id: nodeId, lat, lng, last_cached_ts: lastCached ?? null });

  const { alerts } = await fetchLiveAlerts();
  const current = currentAlert(alertsNear(alerts, lat, lng, "", ""));
  const payload = current
    ? `${current.alert.severity.toUpperCase()} ${HAZARD_LABEL[current.alert.hazard_type] ?? "Alert"} (${current.alert.source_agency}): ${current.alert.headline}`
    : "No active alert";

  return NextResponse.json({
    payload: payload.slice(0, 120),
    timestamp: current ? Math.floor(new Date(current.alert.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000),
    online: true,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return sync(String(body.node_id ?? ""), Number(body.lat), Number(body.lng), Number(body.last_cached_timestamp) || undefined);
}

// Handy for testing in a browser: /api/esp32-sync?lat=25.59&lng=85.15
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return sync(q.get("node_id") ?? "", Number(q.get("lat")), Number(q.get("lng")), Number(q.get("last_cached_timestamp")) || undefined);
}
