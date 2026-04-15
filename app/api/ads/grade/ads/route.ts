import { NextRequest }        from "next/server";
import { fetchAdsForAdSet }  from "@/lib/meta";
import { fetchGradeLeads, normalizeAdName } from "@/lib/gradeLeads";
import type { AdWindow }     from "@/lib/meta";
import type { GradeRow }     from "../campaigns/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params  = req.nextUrl.searchParams;
  const adSetId = params.get("adSetId") ?? "";
  const w       = (params.get("window") ?? "7d") as AdWindow;

  if (!adSetId) return Response.json({ error: "adSetId required" }, { status: 400 });

  const [ads, gradeData] = await Promise.all([
    fetchAdsForAdSet(adSetId, w),
    fetchGradeLeads(w),
  ]);

  const rows: GradeRow[] = ads.map((ad) => {
    // Try exact normalized match first, then fallback to raw name lookup
    const normKey  = normalizeAdName(ad.name);
    const stats    = gradeData.byAd.get(normKey) ?? gradeData.byAd.get(ad.name);
    const total     = stats?.totalLeads ?? 0;
    const g11       = stats?.grade11    ?? 0;
    const pct11     = total > 0 ? (g11 / total) * 100 : 0;
    const costPer11 = g11 > 0 ? ad.spend / g11 : 0;
    return { id: ad.id, name: ad.name, spend: ad.spend, totalLeads: total, grade11: g11, pct11, costPer11 };
  }).sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
