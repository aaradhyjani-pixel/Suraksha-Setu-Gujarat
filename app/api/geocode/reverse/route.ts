import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  try {
    return NextResponse.json({ result: await reverseGeocode(lat, lng) });
  } catch (err) {
    console.error("[geocode/reverse] failed:", err);
    return NextResponse.json({ result: { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng, district: "", state: "" } });
  }
}
