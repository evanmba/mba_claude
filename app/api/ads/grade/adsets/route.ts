import { NextRequest } from "next/server";
import { fetchAdSetsForCampaign, fetchAdsForCampaign } from "@/lib/meta";
import { fetchGradeLeads, normalizeAdName } from "@/lib/gradeLeads";
import { fetchCallSourceLeads }             from "@/lib/callSourceLeads";
import type { AdWindow, MetaAdRow }         from "@/lib/meta";
import type { GradeRow }                    from "../campaigns/route";

export const dynamic = "force-dynamic";

/** Sum stats from a list of ads using the same byAd lookup as the ads route. */
function sumAdStats(
  ads: MetaAdRow[],
  gradeData: Awaited<ReturnType<typeof fetchGradeLeads>>,
  callData:  Awaited<ReturnType<typeof fetchCallSourceLeads>>,
) {
  let totalLeads = 0, graded = 0, g11 = 0;
  let booked = 0, taken = 0, deals = 0, cash = 0, rev = 0;

  for (const ad of ads) {
    const normKey    = normalizeAdName(ad.name);
    const gradeStats = gradeData.byAd.get(normKey) ?? gradeData.byAd.get(ad.name);
    const callStats  = callData.byAd.get(normKey)
      ?? callData.byAd.get(ad.name)
      ?? callData.byAd.get(normalizeAdName(normKey));

    totalLeads += gradeStats?.totalLeads  ?? 0;
    graded     += gradeStats?.gradedLeads ?? 0;
    g11        += gradeStats?.grade11     ?? 0;
    booked     += callStats?.bookedCalls   ?? 0;
    taken      += callStats?.takenCalls    ?? 0;
    deals      += callStats?.deals         ?? 0;
    cash       += callStats?.cashCollected ?? 0;
    rev        += callStats?.revenue       ?? 0;
  }

  return { totalLeads, graded, g11, booked, taken, deals, cash, rev };
}

export async function GET(req: NextRequest) {
  const params       = req.nextUrl.searchParams;
  const campaignId   = params.get("campaignId")   ?? "";
  const w            = (params.get("window")      ?? "7d") as AdWindow;

  if (!campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });

  // Fetch ad sets + all ads in this campaign + sheet data in parallel
  const [adSets, campaignAds, gradeData, callData] = await Promise.all([
    fetchAdSetsForCampaign(campaignId, w),
    fetchAdsForCampaign(campaignId, w),
    fetchGradeLeads(w),
    fetchCallSourceLeads(w),
  ]);

  // Group ads by adSetId
  const adsBySet = new Map<string, MetaAdRow[]>();
  for (const ad of campaignAds) {
    if (!adsBySet.has(ad.adSetId)) adsBySet.set(ad.adSetId, []);
    adsBySet.get(ad.adSetId)!.push(ad);
  }

  const rows: GradeRow[] = adSets.map((as) => {
    const ads = adsBySet.get(as.id) ?? [];
    const { totalLeads, graded, g11, booked, taken, deals, cash, rev } =
      sumAdStats(ads, gradeData, callData);

    return {
      id:            as.id,
      name:          as.name,
      spend:         as.spend,
      bookedCalls:   booked,
      costPerBooked: booked  > 0 ? as.spend / booked : 0,
      takenCalls:    taken,
      costPerTaken:  taken   > 0 ? as.spend / taken  : 0,
      deals,
      costPerDeal:   deals   > 0 ? as.spend / deals  : 0,
      cashCollected: cash,
      revenue:       rev,
      totalLeads,
      grade11:       g11,
      pct11:         graded > 0 ? (g11 / graded) * 100 : 0,
      costPer11:     g11    > 0 ? as.spend / g11        : 0,
    };
  }).sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
