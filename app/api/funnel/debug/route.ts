import { NextResponse } from "next/server";
import { fetchFunnelData, FUNNEL_SHEET_ID } from "@/lib/funnel";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";

  const results: Record<string, unknown> = {
    apiKeySet: !!apiKey,
    apiKeyPreview: apiKey ? apiKey.slice(0, 8) + "..." : "MISSING",
    spreadsheetId: FUNNEL_SHEET_ID,
  };

  try {
    const data = await fetchFunnelData(apiKey);
    results.monthLabel = data.monthLabel;
    results.monthlyRows = data.monthly.length;
    results.ytdRows = data.ytd.length;
    results.scoreboardRows = data.scoreboard.length;
    results.leadsRows = data.leads.length;
    results.callsRows = data.calls.length;
    results.customersRows = data.customers.length;
    results.salesDashboard = data.salesDashboard;
    results.scoreboardSample = data.scoreboard.slice(0, 3);
    results.ytdSample = data.ytd.slice(0, 3);
  } catch (err) {
    results.error = String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
