import { NextResponse } from "next/server";
import { gujaratDistricts, gujaratTalukas, gujaratVillages } from "@/lib/gujarat";

// One endpoint, three granularities, so the client only ever downloads the
// slice it needs — never the whole 18,651-village dataset at once.
//   /api/gujarat                              -> districts
//   /api/gujarat?district=X                   -> talukas in X
//   /api/gujarat?district=X&taluka=Y           -> villages in X/Y
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const district = q.get("district");
  const taluka = q.get("taluka");

  if (district && taluka) return NextResponse.json({ villages: gujaratVillages(district, taluka) });
  if (district) return NextResponse.json({ talukas: gujaratTalukas(district) });
  return NextResponse.json({ districts: gujaratDistricts() });
}
