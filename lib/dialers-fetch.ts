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

const MONTHS = ["JAN 2026", "FEB 2026", "MAR 2026", "APR 2026"];

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
  noCache = false,
  silent = false,
): Promise<string[][]> {
  const encodedSheet = encodeURIComponent(`'${sheetName}'!${range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedSheet}?key=${apiKey}`;
  const res = await fetch(url, noCache ? { cache: "no-store" } : { next: { revalidate: 300 } });
  if (!res.ok) {
    if (!silent) console.warn(`[dialers] Sheet fetch failed for "${sheetName}" ${range}: ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.values as string[][] | undefined) ?? [];
}

// ─── Parse team totals ─────────────────────────────────────────────────────────

async function fetchTeamData(sheetId: string, apiKey: string, noCache = false): Promise<TeamMonthRow[]> {
  const rows = await fetchSheetRange(sheetId, apiKey, "2026 - Dialers", "AQ3:AU17", noCache);
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

// ─── Parse GOALS sheet ────────────────────────────────────────────────────────

async function fetchGoalsData(sheetId: string, apiKey: string, noCache = false): Promise<typeof GOALS_DATA> {
  try {
    const [summaryRows, weekMetaRows, setterRows] = await Promise.all([
      fetchSheetRange(sheetId, apiKey, "GOALS", "A2:H4", noCache),
      fetchSheetRange(sheetId, apiKey, "GOALS", "C6:E7", noCache),
      fetchSheetRange(sheetId, apiKey, "GOALS", "C8:F20", noCache),
    ]);

    // A2:H4 → row 0 = monthly, row 1 = weekly, row 2 = daily
    // Columns: A=label, B=booked, C-F=bar chart cells (skip), G=goal, H=%
    // Indices:  0        1         2-5                           6       7
    const monthlyRow = summaryRows[0] ?? [];
    const weeklyRow  = summaryRows[1] ?? [];
    const dailyRow   = summaryRows[2] ?? [];
    const monthly = { booked: toNum(monthlyRow[1]), goal: toNum(monthlyRow[6]) };
    const weekly  = { booked: toNum(weeklyRow[1]),  goal: toNum(weeklyRow[6])  };
    const daily   = { booked: toNum(dailyRow[1]),   goal: toNum(dailyRow[6])   };

    // C6:E7 → row 0 = headers, row 1 = values (weekNum, startDate, endDate)
    const weekVals = weekMetaRows[1] ?? [];
    const weekNum  = Math.round(toNum(weekVals[0]));
    const startStr = (weekVals[1] ?? "").trim();
    const endStr   = (weekVals[2] ?? "").trim();

    // Calculate daysElapsed from start date to today (1-indexed, capped at 7)
    let daysElapsed = GOALS_DATA.currentWeek.daysElapsed;
    if (startStr) {
      const parts = startStr.split("/");
      if (parts.length >= 3) {
        const fullYear = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        const weekStart = new Date(parseInt(fullYear), parseInt(parts[0]) - 1, parseInt(parts[1]));
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - weekStart.getTime()) / 86_400_000);
        daysElapsed = Math.max(1, Math.min(diffDays + 1, 7));
      }
    }

    // C8:F20 → row 0 = headers, rows 1+ = setter name (col 0) + booked (col 1)
    const setters: { name: string; id: string; booked: number }[] = [];
    for (let i = 1; i < setterRows.length; i++) {
      const row = setterRows[i];
      if (!row?.[0]) continue;
      const name = row[0].trim();
      const booked = toNum(row[1]);
      const dialer = DIALERS.find(
        (d) =>
          d.name.toLowerCase() === name.toLowerCase() ||
          d.name.toLowerCase().startsWith(name.toLowerCase().split(" ")[0].toLowerCase())
      );
      if (dialer) {
        setters.push({ name: dialer.name, id: dialer.id, booked });
      } else {
        setters.push({ name, id: name.toLowerCase().replace(/\s+/g, "-"), booked });
      }
    }

    return {
      monthly: monthly.goal > 0 ? monthly : GOALS_DATA.monthly,
      weekly:  weekly.goal  > 0 ? weekly  : GOALS_DATA.weekly,
      daily:   daily.goal   > 0 ? daily   : GOALS_DATA.daily,
      currentWeek: {
        weekNum:      weekNum || GOALS_DATA.currentWeek.weekNum,
        start:        startStr || GOALS_DATA.currentWeek.start,
        end:          endStr   || GOALS_DATA.currentWeek.end,
        daysElapsed,
        totalWorkdays: 7,
        setters:      setters.length > 0 ? setters : GOALS_DATA.currentWeek.setters,
      },
    };
  } catch (err) {
    console.warn("[dialers] Failed to fetch goals data:", err);
    return GOALS_DATA;
  }
}

// ─── Parse individual dialer sheet ────────────────────────────────────────────

/**
 * Build all plausible sheet-name candidates for a given setter + month.
 * Tries first-name-only and full-name variants with every dash/space combo.
 */
function sheetNameCandidates(firstName: string, fullName: string, month: string): string[] {
  const variants = (base: string) => [
    `${base}- ${month}`,   // "Daneile- APR 2026"
    `${base} - ${month}`,  // "Daneile - APR 2026"
    `${base} -${month}`,   // "Daneile -APR 2026"
    `${base}-${month}`,    // "Daneile-APR 2026"
    `${base} ${month}`,    // "Daneile APR 2026"
  ];
  // First-name variants first (most common), then full-name variants
  return [...variants(firstName), ...variants(fullName)];
}

async function fetchDialerMonthMetrics(
  sheetId: string,
  apiKey: string,
  setterId: string,
  month: string,
  dialersSheet: string[][],
  noCache = false,
): Promise<DialerMonthMetrics | null> {
  const dialer = DIALERS.find((d) => d.id === setterId);
  if (!dialer) return null;

  const [firstName] = dialer.name.split(" ");
  const fullName = dialer.name; // e.g. "Daneile Brown"

  // Try each name variation; fetch rows 4–5 (Monthly TOTALS + GOALS).
  // Only row 4 is required — avoids failures when API skips empty cells.
  // Pass silent=true so 404s on non-matching candidates don't flood the logs.
  let data: string[] = [];
  let goalsRow: string[] = [];
  for (const candidate of sheetNameCandidates(firstName, fullName, month)) {
    const rows = await fetchSheetRange(sheetId, apiKey, candidate, "C4:I5", noCache, true);
    if (rows.length >= 1 && rows[0].length >= 1) {
      console.log(`[dialers] Matched sheet "${candidate}" for ${setterId} ${month}`);
      data     = rows[0];
      goalsRow = rows[1] ?? [];
      break;
    }
  }
  if (!data.length) return null;

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
    ...(goalsRow.length ? {
      goals: {
        dials:      toNum(goalsRow[0]),
        links:      toNum(goalsRow[1]),
        dialLinkPct: toNum(goalsRow[2]),
        booked:     toNum(goalsRow[3]),
        setPct:     toNum(goalsRow[4]),
        taken:      toNum(goalsRow[5]),
        showRate:   toNum(goalsRow[6]),
      },
    } : {}),
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

export async function getDialerDashboardData(noCache = false): Promise<DialerDashboardPayload> {
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
    const [teamMonthly, goals, dialersSheet] = await Promise.all([
      fetchTeamData(sheetId, apiKey, noCache),
      fetchGoalsData(sheetId, apiKey, noCache),
      fetchSheetRange(sheetId, apiKey, "2026 - Dialers", "A1:AZ17", noCache),
    ]);
    const dialerMetrics: Record<string, DialerMonthMetrics[]> = {};

    for (const dialer of DIALERS) {
      const months: DialerMonthMetrics[] = [];
      for (const month of MONTHS) {
        const m = await fetchDialerMonthMetrics(sheetId, apiKey, dialer.id, month, dialersSheet, noCache);
        if (m) months.push(m);
      }
      dialerMetrics[dialer.id] = months.length ? months : (DIALER_METRICS[dialer.id] ?? []);
    }

    return {
      source: "google-sheets",
      goals,
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
