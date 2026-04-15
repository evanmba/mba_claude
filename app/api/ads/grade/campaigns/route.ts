import { NextRequest } from "next/server";
import { fetchCampaignsWithSpend }   from "@/lib/meta";
import { fetchGradeLeads }           from "@/lib/gradeLeads";
import { fetchCallSourceLeads }      from "@/lib/callSourceLeads";
import type { AdWindow }             from "@/lib/meta";

export const dynamic = "force-dynamic";

export interface GradeRow {
  id:            string;
  name:          string;
  spend:         number;
  bookedCalls:   number;
  costPerBooked: number;
  totalLeads:    number;
  grade11:       number;
  pct11:         number;   // 0-100
  costPer11:     number;
}

export async function GET(req: NextRequest) {
  const w = (req.nextUrl.searchParams.get("window") ?? "7d") as AdWindow;

  const [campaigns, gradeData, callData] = await Promise.all([
    fetchCampaignsWithSpend(w),
    fetchGradeLeads(w),
    fetchCallSourceLeads(w),
  ]);

  const rows: GradeRow[] = campaigns
    .filter((c) => c.spend > 0)
    .map((c) => {
      const grade   = gradeData.byCampaign.get(c.name);
      const calls   = callData.byCampaign.get(c.name);

      const total        = grade?.totalLeads ?? 0;
      const g11          = grade?.grade11    ?? 0;
      const booked       = calls?.bookedCalls ?? 0;

      return {
        id:            c.id,
        name:          c.name,
        spend:         c.spend,
        bookedCalls:   booked,
        costPerBooked: booked > 0 ? c.spend / booked : 0,
        totalLeads:    total,
        grade11:       g11,
        pct11:         total > 0 ? (g11 / total) * 100 : 0,
        costPer11:     g11 > 0 ? c.spend / g11 : 0,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return Response.json(rows);
}
