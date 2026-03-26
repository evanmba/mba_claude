/**
 * GET /api/dialers
 *
 * Fetches dialer data from Google Sheets if env vars are configured,
 * otherwise falls back to the static mock data in lib/dialer-data.ts.
 *
 * Required env vars:
 *   SETTER_DASHBOARD_SHEET_ID   — the spreadsheet ID from the URL
 *   SHEETS_API_KEY              — Google Sheets API v4 key
 *
 * Sheet names expected:
 *   "2026 - Dialers"              — team totals in columns AQ:AU
 *                                   AQ=Booked, AR=Taken, AS=Sit%, AT=Deals, AU=Close%
 *                                   Row 3 = January, row 4 = February, etc.
 *   "{First Name}- {MON} {YEAR}"  — individual dialer data (C3:I4)
 *                                   C=Dials, D=Links Sent, E=Dial:Link%, F=Booked,
 *                                   G=Set%, H=Taken, I=Show-Up Rate
 *                                   Values are pre-formatted text (e.g. "3.3%", "83")
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

const SHEET_ID = process.env.SETTER_DASHBOARD_SHEET_ID;
const API_KEY  = process.env.SHEETS_API_KEY;
const MONTHS   = ["JAN 2026", "FEB 2026", "MAR 2026"];

// Maps month label → 0-based month index (Jan=0, Feb=1, …)
const MONTH_LABEL_TO_IDX: Record<string, number> = {
  "JAN 2026": 0, "FEB 2026": 1, "MAR 2026": 2,
  "APR 2026": 3, "MAY 2026": 4, "JUN 2026": 5,
  "JUL 2026": 6, "AUG 2026": 7, "SEP 2026": 8,
  "OCT 2026": 9, "NOV 2026": 10, "DEC 2026": 11,
};

// Month names in row order (row 3 = index 0 = January, etc.)
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Google Sheets fetcher ─────────────────────────────────────────────────────

async function fetchSheetRange(sheetName: string, range: string): Promise<string[][]> {
  const encodedSheet = encodeURIComponent(`'${sheetName}'!${range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedSheet}?key=${API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    console.warn(`[dialers] Sheet fetch failed for "${sheetName}" ${range}: ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.values as string[][] | undefined) ?? [];
}

// ─── Parse team totals from "2026 - Dialers" AQ3:AU17 ─────────────────────────
// Columns: AQ=Booked, AR=Taken, AS=Sit%, AT=Deals, AU=Close%
// Row 3 (index 0) = January, row 4 = February, ... row 14 = December

async function fetchTeamData(): Promise<TeamMonthRow[]> {
  // Fetch 2 extra rows in case there are header/avg rows at the top
  const rows = await fetchSheetRange("2026 - Dialers", "AQ3:AU17");
  if (!rows.length) return TEAM_MONTHLY;

  const result: TeamMonthRow[] = [];

  rows.forEach((row, i) => {
    const monthName = MONTH_NAMES[i];
    if (!monthName) return;

    // Skip summary rows (e.g. "MONTHLY AVG", "SUMS") — they have no numeric Booked value in AQ
    // or the booked cell is blank/zero in a clearly labelled row
    const booked = toNum(row[0]);

    result.push({
      month: monthName,
      date: "",
      booked,
      taken:    toNum(row[1]),
      sitPct:   toNum(row[2]),
      deals:    toNum(row[3]),
      closePct: toNum(row[4]),
    });
  });

  return result.length ? result : TEAM_MONTHLY;
}

// ─── Parse individual dialer sheet ("{First Name}- {MON} {YEAR}") ─────────────
// C3:I3 = headers row (ignored — we use positional mapping)
// C4:I4 = data row, values are pre-formatted text:
//   C4 = Total Manual Outbound Dials   (plain number, e.g. "2515")
//   D4 = # Links Sent                  (plain number, e.g. "83")
//   E4 = Dial:Link %                   (formatted %, e.g. "3.3%")
//   F4 = # Qualified Set Booked Calls  (plain number, e.g. "11")
//   G4 = Set %                         (formatted %, e.g. "13.3%")
//   H4 = Taken Set Calls               (plain number, e.g. "4")
//   I4 = Show-Up Rate                  (formatted %, e.g. "36.4%")

async function fetchDialerMonthMetrics(
  setterId: string,
  month: string,
  dialersSheet: string[][],
): Promise<DialerMonthMetrics | null> {
  const dialer = DIALERS.find((d) => d.id === setterId);
  if (!dialer) return null;

  const [firstName] = dialer.name.split(" ");
  const sheetName = `${firstName}- ${month}`;

  const rows = await fetchSheetRange(sheetName, "C3:I4");
  if (rows.length < 2) return null;

  // data = row index 1 (C4:I4), offset 0 = column C
  const data = rows[1] ?? [];

  // ── Extract individual deals from "2026 - Dialers" sheet ──
  // Row 1 of A1:AZ17 (index 0) = header row with dialer names.
  // Each dialer's column group is: Booked(+0), Taken(+1), Sit%(+2), Deals(+3), Close%(+4).
  // Monthly data starts at row 3 (sheet) = array index 2 (A1: offset 0 = row 1).
  let deals = 0;
  if (dialersSheet.length > 0) {
    const header = dialersSheet[0];
    const colIdx = header.findIndex(
      (cell) => cell?.toLowerCase().includes(firstName.toLowerCase())
    );
    if (colIdx >= 0) {
      const monthIdx = MONTH_LABEL_TO_IDX[month] ?? -1;
      if (monthIdx >= 0) {
        // array index 2 = January (monthIdx 0), index 3 = February, etc.
        const rowIdx = monthIdx + 2;
        const monthRow = dialersSheet[rowIdx];
        if (monthRow) {
          deals = toNum(monthRow[colIdx + 3]);
        }
      }
    }
  }

  return {
    month,
    totalDials:  toNum(data[0]),  // C4
    linksSent:   toNum(data[1]),  // D4
    dialLinkPct: toNum(data[2]),  // E4 — read directly, e.g. "3.3%" → 3.3
    bookedCalls: toNum(data[3]),  // F4
    setPct:      toNum(data[4]),  // G4 — read directly, e.g. "13.3%" → 13.3
    takenCalls:  toNum(data[5]),  // H4
    showUpRate:  toNum(data[6]),  // I4 — read directly, e.g. "36.4%" → 36.4
    deals,
    closePct: 0,
  };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const useSheets = !!(SHEET_ID && API_KEY);

  try {
    const teamMonthly = useSheets ? await fetchTeamData() : TEAM_MONTHLY;

    const dialerMetrics: Record<string, DialerMonthMetrics[]> = {};

    // Fetch full "2026 - Dialers" sheet once for individual deals extraction
    const dialersSheet = useSheets
      ? await fetchSheetRange("2026 - Dialers", "A1:AZ17")
      : [];

    if (useSheets) {
      for (const dialer of DIALERS) {
        const months: DialerMonthMetrics[] = [];
        for (const month of MONTHS) {
          const m = await fetchDialerMonthMetrics(dialer.id, month, dialersSheet);
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
