import { NextResponse } from "next/server";
import { nearbyHospitals } from "@/lib/hospitals";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  try {
    return NextResponse.json({ hospitals: await nearbyHospitals(lat, lng) });
  } catch (err) {
    console.error("[hospitals] failed:", err);
    return NextResponse.json({ hospitals: [], error: "hospital search unavailable" }, { status: 502 });
  }
}
