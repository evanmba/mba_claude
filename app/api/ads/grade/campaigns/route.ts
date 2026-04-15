import { NextRequest } from "next/server";
import { fetchCampaignsWithSpend }   from "@/lib/meta";
import { fetchGradeLeads }           from "@/lib/gradeLeads";
import type { AdWindow }             from "@/lib/meta";

export const dynamic = "force-dynamic";

export interface GradeRow {
  id:         string;
  name:       string;
  spend:      number;
  totalLeads: number;
  grade11:    number;
  pct11:      number;   // 0-100
  costPer11:  number;   // spend / grade11, or 0
}

export async function GET(req: NextRequest) {
  const w = (req.nextUrl.searchParams.get("window") ?? "7d") as AdWindow;

  const [campaigns, gradeData] = await Promise.all([
    fetchCampaignsWithSpend(w),
    fetchGradeLeads(w),
  ]);

  const rows: GradeRow[] = campaigns
    .filter((c) => c.spend > 0)
    .map((c) => {
      const stats = gradeData.byCampaign.get(c.name);
      const total   = stats?.totalLeads ?? 0;
      const g11     = stats?.grade11    ?? 0;
      const pct11   = total > 0 ? (g11 / total) * 100 : 0;
      const costPer11 = g11 > 0 ? c.spend / g11 : 0;
      return { id: c.id, name: c.name, spend: c.spend, totalLeads: total, grade11: g11, pct11, costPer11 };
    })
    .sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
