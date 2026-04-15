import { NextRequest }        from "next/server";
import { fetchAdsForAdSet }  from "@/lib/meta";
import { fetchGradeLeads, normalizeAdName } from "@/lib/gradeLeads";
import { fetchCallSourceLeads }             from "@/lib/callSourceLeads";
import type { AdWindow }     from "@/lib/meta";
import type { GradeRow }     from "../campaigns/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params  = req.nextUrl.searchParams;
  const adSetId = params.get("adSetId") ?? "";
  const w       = (params.get("window") ?? "7d") as AdWindow;

  if (!adSetId) return Response.json({ error: "adSetId required" }, { status: 400 });

  const [ads, gradeData, callData] = await Promise.all([
    fetchAdsForAdSet(adSetId, w),
    fetchGradeLeads(w),
    fetchCallSourceLeads(w),
  ]);

  const rows: GradeRow[] = ads.map((ad) => {
    const normKey = normalizeAdName(ad.name);

    const gradeStats = gradeData.byAd.get(normKey) ?? gradeData.byAd.get(ad.name);

    const callStats = callData.byAd.get(normKey)
      ?? callData.byAd.get(ad.name)
      ?? callData.byAd.get(normalizeAdName(normKey));

    const total  = gradeStats?.totalLeads   ?? 0;
    const graded = gradeStats?.gradedLeads  ?? 0;
    const g11    = gradeStats?.grade11      ?? 0;
    const booked = callStats?.bookedCalls   ?? 0;
    const taken  = callStats?.takenCalls    ?? 0;
    const deals  = callStats?.deals         ?? 0;
    const cash   = callStats?.cashCollected ?? 0;
    const rev    = callStats?.revenue       ?? 0;

    return {
      id:            ad.id,
      name:          ad.name,
      spend:         ad.spend,
      bookedCalls:   booked,
      costPerBooked: booked  > 0 ? ad.spend / booked : 0,
      takenCalls:    taken,
      costPerTaken:  taken   > 0 ? ad.spend / taken  : 0,
      deals,
      costPerDeal:   deals   > 0 ? ad.spend / deals  : 0,
      cashCollected: cash,
      revenue:       rev,
      totalLeads:    total,
      grade11:       g11,
      pct11:         graded > 0 ? (g11 / graded) * 100 : 0,
      costPer11:     g11    > 0 ? ad.spend / g11         : 0,
    };
  }).sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
