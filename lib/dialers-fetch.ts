/**
 * Shared data-fetching logic for the Setter Dashboard.
 * Used directly by app/dialers/page.tsx (server component) and
 * re-exported via app/api/dialers/route.ts for external API access.
 *
 * Required env vars:
 *   SETTER_DASHBOARD_SHEET_ID   — the spreadsheet ID from the URL
 *   GOOGLE_SHEETS_API_KEY       — Google Sheets API v4 key
 */

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

const MONTHS = ["JAN 2026", "FEB 2026", "MAR 2026"];

const MONTH_LABEL_TO_IDX: Record<string, number> = {
  "JAN 2026": 0, "FEB 2026": 1, "MAR 2026": 2,
  "APR 2026": 3, "MAY 2026": 4, "JUN 2026": 5,
  "JUL 2026": 6, "AUG 2026": 7, "SEP 2026": 8,
  "OCT 2026": 9, "NOV 2026": 10, "DEC 2026": 11,
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Google Sheets fetcher ─────────────────────────────────────────────────────

async function fetchSheetRange(
  sheetId: string,
  apiKey: string,
  sheetName: string,
  range: string,
): Promise<string[][]> {
  const encodedSheet = encodeURIComponent(`'${sheetName}'!${range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedSheet}?key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    console.warn(`[dialers] Sheet fetch failed for "${sheetName}" ${range}: ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.values as string[][] | undefined) ?? [];
}

// ─── Parse team totals ─────────────────────────────────────────────────────────

async function fetchTeamData(sheetId: string, apiKey: string): Promise<TeamMonthRow[]> {
  const rows = await fetchSheetRange(sheetId, apiKey, "2026 - Dialers", "AQ3:AU17");
  if (!rows.length) return TEAM_MONTHLY;

  const result: TeamMonthRow[] = [];
  rows.forEach((row, i) => {
    const monthName = MONTH_NAMES[i];
    if (!monthName) return;
    result.push({
      month: monthName,
      date: "",
      booked:   toNum(row[0]),
      taken:    toNum(row[1]),
      sitPct:   toNum(row[2]),
      deals:    toNum(row[3]),
      closePct: toNum(row[4]),
    });
  });

  return result.length ? result : TEAM_MONTHLY;
}

// ─── Parse individual dialer sheet ────────────────────────────────────────────

async function fetchDialerMonthMetrics(
  sheetId: string,
  apiKey: string,
  setterId: string,
  month: string,
  dialersSheet: string[][],
): Promise<DialerMonthMetrics | null> {
  const dialer = DIALERS.find((d) => d.id === setterId);
  if (!dialer) return null;

  const [firstName] = dialer.name.split(" ");
  const rows = await fetchSheetRange(sheetId, apiKey, `${firstName}- ${month}`, "C3:I4");
  if (rows.length < 2) return null;

  const data = rows[1] ?? [];

  let deals = 0;
  if (dialersSheet.length > 0) {
    const header = dialersSheet[0];
    const colIdx = header.findIndex(
      (cell) => cell?.toLowerCase().includes(firstName.toLowerCase())
    );
    if (colIdx >= 0) {
      const monthIdx = MONTH_LABEL_TO_IDX[month] ?? -1;
      if (monthIdx >= 0) {
        const monthRow = dialersSheet[monthIdx + 2];
        if (monthRow) deals = toNum(monthRow[colIdx + 3]);
      }
    }
  }

  return {
    month,
    totalDials:  toNum(data[0]),
    linksSent:   toNum(data[1]),
    dialLinkPct: toNum(data[2]),
    bookedCalls: toNum(data[3]),
    setPct:      toNum(data[4]),
    takenCalls:  toNum(data[5]),
    showUpRate:  toNum(data[6]),
    deals,
    closePct: 0,
  };
}

// ─── Main export ───────────────────────────────────────────────────────────────

export interface DialerDashboardPayload {
  source: string;
  goals: typeof GOALS_DATA;
  speedToLead: typeof SPEED_TO_LEAD;
  teamMonthly: TeamMonthRow[];
  dialerMetrics: Record<string, DialerMonthMetrics[]>;
  dialers: typeof DIALERS;
}

export async function getDialerDashboardData(): Promise<DialerDashboardPayload> {
  const sheetId = process.env.SETTER_DASHBOARD_SHEET_ID;
  const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;
  const useSheets = !!(sheetId && apiKey);

  const mock: DialerDashboardPayload = {
    source: "mock",
    goals: GOALS_DATA,
    speedToLead: SPEED_TO_LEAD,
    teamMonthly: TEAM_MONTHLY,
    dialerMetrics: DIALER_METRICS,
    dialers: DIALERS,
  };

  if (!useSheets) return mock;

  try {
    const teamMonthly = await fetchTeamData(sheetId, apiKey);
    const dialersSheet = await fetchSheetRange(sheetId, apiKey, "2026 - Dialers", "A1:AZ17");
    const dialerMetrics: Record<string, DialerMonthMetrics[]> = {};

    for (const dialer of DIALERS) {
      const months: DialerMonthMetrics[] = [];
      for (const month of MONTHS) {
        const m = await fetchDialerMonthMetrics(sheetId, apiKey, dialer.id, month, dialersSheet);
        if (m) months.push(m);
      }
      dialerMetrics[dialer.id] = months.length ? months : (DIALER_METRICS[dialer.id] ?? []);
    }

    return {
      source: "google-sheets",
      goals: GOALS_DATA,
      speedToLead: SPEED_TO_LEAD,
      teamMonthly,
      dialerMetrics,
      dialers: DIALERS,
    };
  } catch (err) {
    console.error("[dialers] Error fetching from Google Sheets:", err);
    return mock;
  }
}
