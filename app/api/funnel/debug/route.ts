import { NextResponse } from "next/server";
import { getCurrentMonthTab, fetchFunnelData } from "@/lib/funnel";

export const dynamic = "force-dynamic";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSC4-xQoouhaHtJkQ5OADfQ7BCnX9MDiQXAqRwiO9sD1Agmte1WwDsQ-3DGzQ6_bW-1nOYV_MX_Sggd/pub?output=csv&sheet=2026";

export async function GET() {
  const apiKey = process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
  const monthTab = getCurrentMonthTab();

  // Fetch raw CSV to see actual sheet content
  let csvPreview: string[] = [];
  let csvStatus = 0;
  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    csvStatus = res.status;
    if (res.ok) {
      const text = await res.text();
      csvPreview = text.split("\n").slice(0, 30);
    }
  } catch (err) {
    csvPreview = [String(err)];
  }

  const data = await fetchFunnelData(apiKey).catch(() => null);

  return NextResponse.json({
    monthTab,
    apiKeySet: !!apiKey,
    csvStatus,
    csvFirst30Lines: csvPreview,
    scoreboard: data?.scoreboard ?? [],
    ytdRows: data?.ytd.map((r) => ({
      month: r.month,
      isSummary: r.isSummary,
      leads: r.leads,
      takenCalls: r.takenCalls,
      cash: r.cash,
    })) ?? [],
  });
}
