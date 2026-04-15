import { NextRequest } from "next/server";
import { fetchCampaignsWithSpend, fetchAllAdsWithSpend } from "@/lib/meta";
import { fetchGradeLeads, normalizeAdName }              from "@/lib/gradeLeads";
import { fetchCallSourceLeads }                          from "@/lib/callSourceLeads";
import type { AdWindow, MetaAdRow }                      from "@/lib/meta";

export const dynamic = "force-dynamic";

export interface GradeRow {
  id:            string;
  name:          string;
  thumbnailUrl?: string;  // only populated at the ad-creative level
  spend:         number;
  bookedCalls:   number;
  costPerBooked: number;
  takenCalls:    number;
  costPerTaken:  number;
  deals:         number;
  costPerDeal:   number;
  cashCollected: number;
  revenue:       number;
  totalLeads:    number;
  grade11:       number;
  pct11:         number;   // 0-100
  costPer11:     number;
}

/** Sum attribution stats from a list of ads using byAd maps (same logic as ads route). */
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
  const w = (req.nextUrl.searchParams.get("window") ?? "7d") as AdWindow;

  // Campaign spend from Meta (authoritative) + all ads for bottom-up attribution rollup
  const [campaigns, allAds, gradeData, callData] = await Promise.all([
    fetchCampaignsWithSpend(w),
    fetchAllAdsWithSpend(w),
    fetchGradeLeads(w),
    fetchCallSourceLeads(w),
  ]);

  // Group ads by campaignId for bottom-up aggregation
  const adsByCampaign = new Map<string, MetaAdRow[]>();
  for (const ad of allAds) {
    if (!adsByCampaign.has(ad.campaignId)) adsByCampaign.set(ad.campaignId, []);
    adsByCampaign.get(ad.campaignId)!.push(ad);
  }

  const rows: GradeRow[] = campaigns
    .filter((c) => c.spend > 0)
    .map((c) => {
      const ads = adsByCampaign.get(c.id) ?? [];
      const { totalLeads, graded, g11, booked, taken, deals, cash, rev } =
        sumAdStats(ads, gradeData, callData);

      return {
        id:            c.id,
        name:          c.name,
        spend:         c.spend,
        bookedCalls:   booked,
        costPerBooked: booked  > 0 ? c.spend / booked : 0,
        takenCalls:    taken,
        costPerTaken:  taken   > 0 ? c.spend / taken  : 0,
        deals,
        costPerDeal:   deals   > 0 ? c.spend / deals  : 0,
        cashCollected: cash,
        revenue:       rev,
        totalLeads,
        grade11:       g11,
        pct11:         graded > 0 ? (g11 / graded) * 100 : 0,
        costPer11:     g11    > 0 ? c.spend / g11         : 0,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
