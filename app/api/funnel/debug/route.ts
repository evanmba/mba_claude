import { NextResponse } from "next/server";
import { FUNNEL_SHEET_ID, getCurrentMonthTab, fetchFunnelData } from "@/lib/funnel";

export const dynamic = "force-dynamic";

async function fetchRaw(sheetName: string, apiKey: string): Promise<{ status: number; rows: string[][] }> {
  const range = encodeURIComponent(`'${sheetName}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${FUNNEL_SHEET_ID}/values/${range}?key=${apiKey}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { status: res.status, rows: [] };
    const json = await res.json() as { values?: string[][] };
    return { status: res.status, rows: (json.values ?? []).slice(0, 20) };
  } catch (err) {
    return { status: -1, rows: [[String(err)]] };
  }
}

export async function GET() {
  const apiKey = process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
  const monthTab = getCurrentMonthTab();

  const [monthData, ytdData, data] = await Promise.all([
    fetchRaw(monthTab, apiKey),
    fetchRaw("2026", apiKey),
    fetchFunnelData(apiKey).catch(() => null),
  ]);

  return NextResponse.json({
    apiKeySet: !!apiKey,
    monthTab,
    monthStatus: monthData.status,
    monthFirst20Rows: monthData.rows,
    ytdStatus: ytdData.status,
    ytdFirst20Rows: ytdData.rows,
    // Parsed summary rows — shows what isSummary rows were detected
    parsedYtdRows: data?.ytd.map((r) => ({ month: r.month, isSummary: r.isSummary, leads: r.leads, takenCalls: r.takenCalls, cash: r.cash })) ?? [],
  });
}
