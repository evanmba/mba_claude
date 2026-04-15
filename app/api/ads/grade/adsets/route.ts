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
  const gradeByAdSetKey = new Map<string, { totalLeads: number; grade11: number }>();
  for (const [key, stats] of gradeData.byAdSet) {
    const [camp, adSetKey] = key.split("|||");
    if (camp === campaignName) gradeByAdSetKey.set(adSetKey ?? "", stats);
  }

  const callsByAdSetName = new Map<string, number>();
  for (const [key, stats] of callData.byAdSet) {
    const [camp, adSetFull] = key.split("|||");
    if (camp === campaignName) callsByAdSetName.set(adSetFull ?? "", stats.bookedCalls);
  }

  const rows: GradeRow[] = adSets.map((as) => {
    // Grade: match by adSetKey ↔ Meta adset name (flexible)
    let gradeStats: { totalLeads: number; grade11: number } | undefined;
    for (const [key, s] of gradeByAdSetKey) {
      const a = as.name.toLowerCase(), b = key.toLowerCase();
      if (a === b || a.includes(b) || b.includes(a)) { gradeStats = s; break; }
    }

    // Calls: match by full ad set name (matchAdSetName helper)
    let booked = 0;
    for (const [csAdSet, count] of callsByAdSetName) {
      if (matchAdSetName(as.name, csAdSet)) { booked = count; break; }
    }

    const total = gradeStats?.totalLeads ?? 0;
    const g11   = gradeStats?.grade11    ?? 0;
    return {
      id:            as.id,
      name:          as.name,
      spend:         as.spend,
      bookedCalls:   booked,
      costPerBooked: booked > 0 ? as.spend / booked : 0,
      totalLeads:    total,
      grade11:       g11,
      pct11:         total > 0 ? (g11 / total) * 100 : 0,
      costPer11:     g11 > 0 ? as.spend / g11 : 0,
    };
  }).sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
