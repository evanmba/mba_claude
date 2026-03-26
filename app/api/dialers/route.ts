/**
 * GET /api/dialers
 *
 * Fetches dialer data from Google Sheets if env vars are configured,
 * otherwise falls back to the static mock data in lib/dialer-data.ts.
 *
 * Required env vars:
 *   SETTER_DASHBOARD_SHEET_ID   — the spreadsheet ID from the URL
 *   SHEETS_API_KEY              — Google Sheets API v4 key (or same as existing)
 *
 * Sheet names expected:
 *   "2026 - Dialers"            — team monthly data (A1:AZ20)
 *   "{First Name}- {MON} {YEAR}" — individual dialer data (C3:I4)
 *     e.g. "Julio- MAR 2026"
 *
 * To get the spreadsheet ID: open the sheet → copy the ID from the URL:
 *   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
 */

import { NextResponse } from "next/server";
import {
  GOALS_DATA,
  SPEED_TO_LEAD,
  TEAM_MONTHLY,
  DIALER_METRICS,
  DIALERS,
  type DialerMonthMetrics,
  type TeamMonthRow,
} from "@/lib/dialer-data";
import { toNum } from "@/lib/sheets";

const SHEET_ID  = process.env.SETTER_DASHBOARD_SHEET_ID;
const API_KEY   = process.env.SHEETS_API_KEY;
const MONTHS    = ["JAN 2026", "FEB 2026", "MAR 2026"];

// ─── Google Sheets fetcher ─────────────────────────────────────────────────────

async function fetchSheetRange(sheetName: string, range: string): Promise<string[][]> {
  const encodedSheet = encodeURIComponent(`'${sheetName}'!${range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedSheet}?key=${API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    console.warn(`[dialers] Sheet fetch failed for "${sheetName}": ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.values as string[][] | undefined) ?? [];
}

// ─── Parse team sheet ("2026 - Dialers") ─────────────────────────────────────
// Row 1 = dialer names, Row 2 = column headers, Rows 3-17 = monthly data
// Layout: A=Month, B=Date, C=Booked, D=Taken, E=Sit%, F=Deals, G=Close%
// (this is per-dialer; teams are side-by-side in columns)

async function fetchTeamData(): Promise<TeamMonthRow[]> {
  const rows = await fetchSheetRange("2026 - Dialers", "A3:G17");
  if (!rows.length) return TEAM_MONTHLY;

  const result: TeamMonthRow[] = [];
  for (const row of rows) {
    const month = (row[0] ?? "").trim();
    if (!month || month.toLowerCase() === "monthly avg" || month.toLowerCase() === "sums") continue;
    result.push({
      month,
      date: row[1] ?? "",
      booked: toNum(row[2]),
      taken: toNum(row[3]),
      sitPct: toNum(row[4]),
      deals: toNum(row[5]),
      closePct: toNum(row[6]),
    });
  }
  return result.length ? result : TEAM_MONTHLY;
}

// ─── Parse individual dialer sheet ("{Name}- {MON} {YEAR}") ──────────────────
// C3:I3 = headers, C4:I4 = monthly data values

async function fetchDialerMonthMetrics(setterId: string, month: string): Promise<DialerMonthMetrics | null> {
  const dialer = DIALERS.find((d) => d.id === setterId);
  if (!dialer) return null;

  // Derive sheet name: e.g. "Julio- MAR 2026"
  const [firstName] = dialer.name.split(" ");
  const sheetName = `${firstName}- ${month}`;

  const rows = await fetchSheetRange(sheetName, "C3:I4");
  if (rows.length < 2) return null;

  // Row 0 = headers (we trust the order matches our expected layout)
  const data = rows[1] ?? [];

  // C4=totalDials, D4=linksSent, E4=dialLinkPct, F4=bookedCalls, G4=setPct, H4=takenCalls, I4=showUpRate
  const totalDials    = toNum(data[0]);
  const linksSent     = toNum(data[1]);
  const bookedCalls   = toNum(data[3]);
  const takenCalls    = toNum(data[5]);

  return {
    month,
    totalDials,
    linksSent,
    dialLinkPct: totalDials > 0 ? Math.round((linksSent / totalDials) * 1000) / 10 : 0,
    bookedCalls,
    setPct: linksSent > 0 ? Math.round((bookedCalls / linksSent) * 1000) / 10 : 0,
    takenCalls,
    showUpRate: bookedCalls > 0 ? Math.round((takenCalls / bookedCalls) * 1000) / 10 : 0,
    deals: 0,
    closePct: 0,
  };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const useSheets = !!(SHEET_ID && API_KEY);

  try {
    // Team monthly
    const teamMonthly = useSheets ? await fetchTeamData() : TEAM_MONTHLY;

    // Individual dialer metrics
    const dialerMetrics: Record<string, DialerMonthMetrics[]> = {};

    if (useSheets) {
      for (const dialer of DIALERS) {
        const months: DialerMonthMetrics[] = [];
        for (const month of MONTHS) {
          const m = await fetchDialerMonthMetrics(dialer.id, month);
          if (m) months.push(m);
        }
        dialerMetrics[dialer.id] = months.length ? months : (DIALER_METRICS[dialer.id] ?? []);
      }
    } else {
      Object.assign(dialerMetrics, DIALER_METRICS);
    }

    return NextResponse.json({
      source: useSheets ? "google-sheets" : "mock",
      goals: GOALS_DATA,
      speedToLead: SPEED_TO_LEAD,
      teamMonthly,
      dialerMetrics,
      dialers: DIALERS,
    });
  } catch (err) {
    console.error("[dialers] Error:", err);
    return NextResponse.json({
      source: "mock",
      goals: GOALS_DATA,
      speedToLead: SPEED_TO_LEAD,
      teamMonthly: TEAM_MONTHLY,
      dialerMetrics: DIALER_METRICS,
      dialers: DIALERS,
    });
  }
}
