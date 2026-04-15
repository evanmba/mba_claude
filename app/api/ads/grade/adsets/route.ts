import { NextRequest } from "next/server";
import { fetchAdSetsForCampaign } from "@/lib/meta";
import { fetchGradeLeads }        from "@/lib/gradeLeads";
import type { AdWindow }          from "@/lib/meta";
import type { GradeRow }          from "../campaigns/route";

export const dynamic = "force-dynamic";

/**
 * Try to match a Meta ad set name against the LEADS ad-set keys
 * (which are source part[2], e.g. "1008.4").
 * Meta ad set name might be "1008.4", "TOF 1008.4", or
 * "Parents 13-17 Baseball | 1008.4" — we check substring both ways.
 */
function matchAdSetKey(metaName: string, leadsKey: string): boolean {
  const a = metaName.toLowerCase();
  const b = leadsKey.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export async function GET(req: NextRequest) {
  const params       = req.nextUrl.searchParams;
  const campaignId   = params.get("campaignId")   ?? "";
  const campaignName = params.get("campaignName") ?? "";
  const w            = (params.get("window")      ?? "7d") as AdWindow;

  if (!campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });

  const [adSets, gradeData] = await Promise.all([
    fetchAdSetsForCampaign(campaignId, w),
    fetchGradeLeads(w),
  ]);

  // Build a lookup: adSetKey → GradeStats (for leads belonging to this campaign)
  const adSetKeys = new Map<string, typeof gradeData.byAdSet extends Map<string, infer V> ? V : never>();
  for (const [key, stats] of gradeData.byAdSet) {
    const [camp, adSetKey] = key.split("|||");
    if (camp === campaignName) adSetKeys.set(adSetKey ?? "", stats);
  }

  const rows: GradeRow[] = adSets.map((as) => {
    // Find matching adSetKey from leads data
    let stats: { totalLeads: number; grade11: number } | undefined;
    for (const [key, s] of adSetKeys) {
      if (matchAdSetKey(as.name, key)) { stats = s; break; }
    }
    const total     = stats?.totalLeads ?? 0;
    const g11       = stats?.grade11    ?? 0;
    const pct11     = total > 0 ? (g11 / total) * 100 : 0;
    const costPer11 = g11 > 0 ? as.spend / g11 : 0;
    return { id: as.id, name: as.name, spend: as.spend, totalLeads: total, grade11: g11, pct11, costPer11 };
  }).sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
