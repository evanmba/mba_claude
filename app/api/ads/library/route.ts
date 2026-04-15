import { NextRequest } from "next/server";
import { fetchAllAdSetsWithSpend, fetchAdThumbnailsForAdSets } from "@/lib/meta";
import { fetchGradeLeads } from "@/lib/gradeLeads";
import { fetchCallSourceLeads, matchAdSetName } from "@/lib/callSourceLeads";
import type { AdWindow } from "@/lib/meta";

export const dynamic = "force-dynamic";

export interface LibraryAdSetRow {
  id:            string;
  name:          string;
  campaignName:  string;
  thumbnailUrl:  string;
  adCount:       number;   // number of ads in this adset (determines drillability)
  spend:         number;
  totalLeads:    number;
  gradedLeads:   number;
  grade11:       number;
  pct11:         number;
  costPer11:     number;
  bookedCalls:   number;
  costPerBooked: number;
  takenCalls:    number;
  costPerTaken:  number;
  deals:         number;
  costPerDeal:   number;
  cashCollected: number;
  revenue:       number;
}

export async function GET(req: NextRequest) {
  const w = (req.nextUrl.searchParams.get("window") ?? "7d") as AdWindow;

  const [adSets, gradeData, callData] = await Promise.all([
    fetchAllAdSetsWithSpend(w),
    fetchGradeLeads(w),
    fetchCallSourceLeads(w),
  ]);

  // Fetch thumbnails for all adsets in parallel with metrics
  const adSetIds    = adSets.map((a) => a.id);
  const thumbData   = await fetchAdThumbnailsForAdSets(adSetIds);

  // Group thumbnails by adset: first thumbnail URL + total ad count
  const thumbByAdSet = new Map<string, { thumbnailUrl: string; adCount: number }>();
  for (const t of thumbData) {
    if (!thumbByAdSet.has(t.adSetId)) {
      thumbByAdSet.set(t.adSetId, { thumbnailUrl: "", adCount: 0 });
    }
    const entry = thumbByAdSet.get(t.adSetId)!;
    entry.adCount++;
    if (!entry.thumbnailUrl && t.thumbnailUrl) entry.thumbnailUrl = t.thumbnailUrl;
  }

  const rows: LibraryAdSetRow[] = adSets.map((as) => {
    const thumb = thumbByAdSet.get(as.id);

    // Grade match: campaign name + flexible adset key match
    let gradeStats: { totalLeads: number; gradedLeads: number; grade11: number } | undefined;
    for (const [key, stats] of gradeData.byAdSet) {
      const [camp, adSetKey] = key.split("|||");
      if (camp !== as.campaignName) continue;
      const a = as.name.toLowerCase(), b = (adSetKey ?? "").toLowerCase();
      if (a === b || a.includes(b) || b.includes(a)) { gradeStats = stats; break; }
    }

    // Call source match: campaign name + matchAdSetName
    let callStats: { bookedCalls: number; takenCalls: number; deals: number; cashCollected: number; revenue: number } | undefined;
    for (const [key, stats] of callData.byAdSet) {
      const [camp, adSetFull] = key.split("|||");
      if (camp !== as.campaignName) continue;
      if (matchAdSetName(as.name, adSetFull ?? "")) { callStats = stats; break; }
    }

    const total  = gradeStats?.totalLeads   ?? 0;
    const graded = gradeStats?.gradedLeads  ?? 0;
    const g11    = gradeStats?.grade11      ?? 0;
    const booked = callStats?.bookedCalls   ?? 0;
    const taken  = callStats?.takenCalls    ?? 0;
    const deals  = callStats?.deals         ?? 0;
    const cash   = callStats?.cashCollected ?? 0;
    const rev    = callStats?.revenue       ?? 0;

    return {
      id:            as.id,
      name:          as.name,
      campaignName:  as.campaignName,
      thumbnailUrl:  thumb?.thumbnailUrl ?? "",
      adCount:       thumb?.adCount ?? 1,
      spend:         as.spend,
      totalLeads:    total,
      gradedLeads:   graded,
      grade11:       g11,
      pct11:         graded > 0 ? (g11 / graded) * 100 : 0,
      costPer11:     g11    > 0 ? as.spend / g11         : 0,
      bookedCalls:   booked,
      costPerBooked: booked  > 0 ? as.spend / booked : 0,
      takenCalls:    taken,
      costPerTaken:  taken   > 0 ? as.spend / taken  : 0,
      deals,
      costPerDeal:   deals   > 0 ? as.spend / deals  : 0,
      cashCollected: cash,
      revenue:       rev,
    };
  });

  return Response.json(rows);
}
