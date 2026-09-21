import { NextResponse } from "next/server";
import { actionFor, alertsNear, currentAlert, fetchLiveAlerts, hazardGuide, nearestNode } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  const district = q.get("district") ?? "";
  const state = q.get("state") ?? "";
  const profile = {
    label: q.get("label") ?? "", lat, lng, district, state,
    occupation: q.get("occupation") ?? "general_resident",
    dwelling_type: q.get("dwelling") ?? "ground_floor",
    vulnerabilities: (q.get("vulns") ?? "").split(",").filter(Boolean),
    language: q.get("lang") ?? "en",
  };

  const { sachetOk, imdOk, alerts } = await fetchLiveAlerts();
  const inScope = alertsNear(alerts, lat, lng, district, state);
  const current = currentAlert(inScope);
  const { action, occupationTip, vulnerabilityTips } = await actionFor(profile, current?.alert.hazard_type ?? "*");

  return NextResponse.json({
    sachetOk, imdOk, current, action, occupationTip, vulnerabilityTips,
    guide: hazardGuide(current?.alert.hazard_type ?? ""),
    node: await nearestNode(lat, lng),
    fetchedAt: new Date().toISOString(),
  });
}
