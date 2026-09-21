import { NextResponse } from "next/server";
import { searchPlace } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  try {
    return NextResponse.json({ results: await searchPlace(q) });
  } catch (err) {
    console.error("[geocode/search] failed:", err);
    return NextResponse.json({ results: [], error: "search unavailable" }, { status: 502 });
  }
}
