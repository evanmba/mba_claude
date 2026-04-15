import { NextRequest } from "next/server";
import { fetchAdSetsForCampaign }         from "@/lib/meta";
import { fetchGradeLeads }                from "@/lib/gradeLeads";
import { fetchCallSourceLeads, matchAdSetName } from "@/lib/callSourceLeads";
import type { AdWindow }                  from "@/lib/meta";
import type { GradeRow }                  from "../campaigns/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params       = req.nextUrl.searchParams;
  const campaignId   = params.get("campaignId")   ?? "";
  const campaignName = params.get("campaignName") ?? "";
  const w            = (params.get("window")      ?? "7d") as AdWindow;

  if (!campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });

  const [adSets, gradeData, callData] = await Promise.all([
    fetchAdSetsForCampaign(campaignId, w),
    fetchGradeLeads(w),
    fetchCallSourceLeads(w),
  ]);

  // Build sub-maps for this campaign only
  const gradeByAdSetKey = new Map<string, { totalLeads: number; gradedLeads: number; grade11: number }>();
  for (const [key, stats] of gradeData.byAdSet) {
    const [camp, adSetKey] = key.split("|||");
    if (camp === campaignName) gradeByAdSetKey.set(adSetKey ?? "", stats);
  }

  type CallEntry = { bookedCalls: number; takenCalls: number; deals: number; cashCollected: number; revenue: number };
  const callsByAdSetName = new Map<string, CallEntry>();
  for (const [key, stats] of callData.byAdSet) {
    const [camp, adSetFull] = key.split("|||");
    if (camp === campaignName) {
      callsByAdSetName.set(adSetFull ?? "", {
        bookedCalls:   stats.bookedCalls,
        takenCalls:    stats.takenCalls,
        deals:         stats.deals,
        cashCollected: stats.cashCollected,
        revenue:       stats.revenue,
      });
    }
  }

  const rows: GradeRow[] = adSets.map((as) => {
    let gradeStats: { totalLeads: number; gradedLeads: number; grade11: number } | undefined;
    for (const [key, s] of gradeByAdSetKey) {
      const a = as.name.toLowerCase(), b = key.toLowerCase();
      if (a === b || a.includes(b) || b.includes(a)) { gradeStats = s; break; }
    }

    let callEntry: CallEntry | undefined;
    for (const [csAdSet, entry] of callsByAdSetName) {
      if (matchAdSetName(as.name, csAdSet)) { callEntry = entry; break; }
    }

    const total  = gradeStats?.totalLeads   ?? 0;
    const graded = gradeStats?.gradedLeads  ?? 0;
    const g11    = gradeStats?.grade11      ?? 0;
    const booked = callEntry?.bookedCalls   ?? 0;
    const taken  = callEntry?.takenCalls    ?? 0;
    const deals  = callEntry?.deals         ?? 0;
    const cash   = callEntry?.cashCollected ?? 0;
    const rev    = callEntry?.revenue       ?? 0;

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
      totalLeads:    total,
      grade11:       g11,
      pct11:         graded > 0 ? (g11 / graded) * 100 : 0,
      costPer11:     g11    > 0 ? as.spend / g11         : 0,
    };
  }).sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
