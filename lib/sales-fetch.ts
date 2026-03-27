/**
 * Data-fetching for the Sales Dashboard.
 * Sheet: MBA | Sales Tracker
 * Env vars:
 *   SALES_DASHBOARD_SHEET_ID   — sheet ID from the URL
 *   GOOGLE_SHEETS_API_KEY      — shared with setter dashboard
 *
 * Monthly sheet layout (e.g. "MAR 2026"), range A1:K14:
 *   Row  1 — "CLOSER #1" header                   | "CLOSER #2" header at G1
 *   Row  2 — Closer name (B2 merged)               | Closer 2 name (H2 merged)
 *   Row  3 — Front End Revenue (B3) / New Cash (E3)
 *   Row  4 — Back End Revenue  (B4) / Back End Cash (E4)
 *   Row  5 — Total Revenue     (B5) / Total Cash    (E5)
 *   Row  6 — (empty)
 *   Row  7 — Show Rate (B7) / Total Call Booked (E7)
 *   Row  8 — Offer %   (B8) / Total Cancels    (E8)
 *   Row  9 — Close %   (B9) / Total Calls Taken (E9)
 *   Row 10 — Cash/Call (B10)/ Total Offers      (E10)
 *   Row 11 — Rev/Call  (B11)/ Total FU Booked   (E11)
 *   Row 12 — Taken→FU% (B12)/ Total FU Taken    (E12)
 *   Row 13 — FU Show   (B13)/ Total FU Closes   (E13)
 *   Row 14 — FU Close  (B14)/ Total Closes      (E14)
 *   Closer 2 mirrors same rows at cols G(6)/H(7)/J(9)/K(10)
 *
 * Year sheet "2026", range A1:I16:
 *   Row  1 — headers (closer name, Call Booked, Calls Taken, Show%, Offers, Closes, Close%, Cash, Cash/Call)
 *   Rows 2–13 — Jan–Dec
 *   Row 15 — MONTHLY AVG
 *   Row 16 — SUMS
 */

import { toNum } from "@/lib/sheets";

const MONTH_SHEETS = [
  "JAN 2026", "FEB 2026", "MAR 2026", "APR 2026",
  "MAY 2026", "JUN 2026", "JUL 2026", "AUG 2026",
  "SEP 2026", "OCT 2026", "NOV 2026", "DEC 2026",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CloserData {
  name: string;
  // Revenue / Cash
  frontEndRevenue: number;
  backEndRevenue: number;
  totalRevenue: number;
  newCash: number;
  backEndCash: number;
  totalCash: number;
  // Rate metrics (numbers like 37 = 37%)
  showRate: number;
  offerPct: number;
  closePct: number;
  cashPerCall: number;
  revenuePerCall: number;
  takenToFUPct: number;
  fuShowRate: number;
  fuCloseRate: number;
  // Volume counts
  totalBooked: number;
  totalCancels: number;
  totalTaken: number;
  totalOffers: number;
  totalFUBooked: number;
  totalFUTaken: number;
  totalFUCloses: number;
  totalCloses: number;
}

export interface MonthSalesData {
  month: string;      // e.g. "MAR 2026"
  closer1: CloserData;
  closer2: CloserData | null;
}

export interface YearRow {
  month: string;
  booked: number;
  taken: number;
  showPct: number;
  offers: number;
  closes: number;
  closePct: number;
  cashCollected: number;
  cashPerCall: number;
}

export interface SalesDashboardPayload {
  source: string;
  closer1Name: string;
  yearRows: YearRow[];        // months with data only
  sums: YearRow | null;
  monthlyAvg: YearRow | null;
  monthlyData: MonthSalesData[];
  currentMonth: MonthSalesData | null;
}

// ─── Mock / Fallback ─────────────────────────────────────────────────────────

function emptyCloser(name = "Closer 1"): CloserData {
  return {
    name,
    frontEndRevenue: 0, backEndRevenue: 0, totalRevenue: 0,
    newCash: 0, backEndCash: 0, totalCash: 0,
    showRate: 0, offerPct: 0, closePct: 0,
    cashPerCall: 0, revenuePerCall: 0, takenToFUPct: 0,
    fuShowRate: 0, fuCloseRate: 0,
    totalBooked: 0, totalCancels: 0, totalTaken: 0, totalOffers: 0,
    totalFUBooked: 0, totalFUTaken: 0, totalFUCloses: 0, totalCloses: 0,
  };
}

const MOCK_JAN: CloserData = {
  ...emptyCloser("Evan Mendoza"),
  frontEndRevenue: 1000, totalRevenue: 1000, newCash: 1000, totalCash: 1000,
  showRate: 25, offerPct: 100, closePct: 100,
  cashPerCall: 1000, revenuePerCall: 1000,
  totalBooked: 4, totalCancels: 3, totalTaken: 1,
  totalOffers: 1, totalCloses: 1,
};
const MOCK_FEB: CloserData = {
  ...emptyCloser("Evan Mendoza"),
  frontEndRevenue: 5833, totalRevenue: 5833, newCash: 5833, totalCash: 5833,
  showRate: 23, offerPct: 86, closePct: 50,
  cashPerCall: 833, revenuePerCall: 833,
  totalBooked: 30, totalCancels: 23, totalTaken: 7,
  totalOffers: 6, totalCloses: 3,
};
const MOCK_MAR: CloserData = {
  name: "Evan Mendoza",
  frontEndRevenue: 45500, backEndRevenue: 0, totalRevenue: 45500,
  newCash: 22333, backEndCash: 0, totalCash: 22333,
  showRate: 37, offerPct: 94, closePct: 27,
  cashPerCall: 698, revenuePerCall: 1422, takenToFUPct: 75,
  fuShowRate: 17, fuCloseRate: 75,
  totalBooked: 87, totalCancels: 35, totalTaken: 32,
  totalOffers: 30, totalFUBooked: 24, totalFUTaken: 4,
  totalFUCloses: 3, totalCloses: 8,
};

const MOCK_MONTHLY_DATA: MonthSalesData[] = [
  { month: "JAN 2026", closer1: MOCK_JAN, closer2: null },
  { month: "FEB 2026", closer1: MOCK_FEB, closer2: null },
  { month: "MAR 2026", closer1: MOCK_MAR, closer2: null },
];

const MOCK_YEAR: YearRow[] = [
  { month: "January",  booked: 4,  taken: 1,  showPct: 25, offers: 1,  closes: 1, closePct: 100, cashCollected: 1000,  cashPerCall: 1000 },
  { month: "February", booked: 30, taken: 7,  showPct: 23, offers: 6,  closes: 3, closePct: 50,  cashCollected: 5833,  cashPerCall: 833  },
  { month: "March",    booked: 87, taken: 32, showPct: 37, offers: 30, closes: 8, closePct: 27,  cashCollected: 22333, cashPerCall: 698  },
];

const MOCK_SUMS: YearRow = {
  month: "Total", booked: 121, taken: 40, showPct: 33,
  offers: 37, closes: 12, closePct: 30, cashCollected: 29166, cashPerCall: 729,
};

const MOCK_AVG: YearRow = {
  month: "Monthly Avg", booked: 40, taken: 13, showPct: 0,
  offers: 12, closes: 4, closePct: 0, cashCollected: 0, cashPerCall: 0,
};

export const MOCK_SALES_PAYLOAD: SalesDashboardPayload = {
  source: "mock",
  closer1Name: "Evan Mendoza",
  yearRows: MOCK_YEAR,
  sums: MOCK_SUMS,
  monthlyAvg: MOCK_AVG,
  monthlyData: MOCK_MONTHLY_DATA,
  currentMonth: MOCK_MONTHLY_DATA[2],
};

// ─── Sheets API fetcher ───────────────────────────────────────────────────────

async function fetchRange(
  sheetId: string,
  apiKey: string,
  sheetName: string,
  range: string,
  noCache = false,
): Promise<string[][]> {
  const encoded = encodeURIComponent(`'${sheetName}'!${range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encoded}?key=${apiKey}`;
  const res = await fetch(url, noCache ? { cache: "no-store" } : { next: { revalidate: 300 } });
  if (!res.ok) {
    console.warn(`[sales] Fetch failed "${sheetName}"!${range}: ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.values as string[][] | undefined) ?? [];
}

// Safe toNum — returns 0 for #DIV/0!, NaN, etc.
function n(rows: string[][], ri: number, ci: number): number {
  const val = rows[ri]?.[ci] ?? "";
  const result = toNum(val);
  return isNaN(result) ? 0 : result;
}

// ─── Parse monthly sheet ──────────────────────────────────────────────────────

function parseCloser(rows: string[][], col: number, countCol: number, fallbackName: string): CloserData {
  // col   = value column for rate metrics (B=1 for C1, H=7 for C2)
  // countCol = value column for counts     (E=4 for C1, K=10 for C2)
  const name = (rows[1]?.[col] || rows[1]?.[col - 1] || fallbackName).trim();
  return {
    name:             name === "NAME" ? fallbackName : name,
    frontEndRevenue:  n(rows, 2, col),
    backEndRevenue:   n(rows, 3, col),
    totalRevenue:     n(rows, 4, col),
    newCash:          n(rows, 2, countCol),
    backEndCash:      n(rows, 3, countCol),
    totalCash:        n(rows, 4, countCol),
    showRate:         n(rows, 6, col),
    offerPct:         n(rows, 7, col),
    closePct:         n(rows, 8, col),
    cashPerCall:      n(rows, 9, col),
    revenuePerCall:   n(rows, 10, col),
    takenToFUPct:     n(rows, 11, col),
    fuShowRate:       n(rows, 12, col),
    fuCloseRate:      n(rows, 13, col),
    totalBooked:      n(rows, 6, countCol),
    totalCancels:     n(rows, 7, countCol),
    totalTaken:       n(rows, 8, countCol),
    totalOffers:      n(rows, 9, countCol),
    totalFUBooked:    n(rows, 10, countCol),
    totalFUTaken:     n(rows, 11, countCol),
    totalFUCloses:    n(rows, 12, countCol),
    totalCloses:      n(rows, 13, countCol),
  };
}

async function fetchMonthData(
  sheetId: string, apiKey: string, month: string, noCache: boolean,
): Promise<MonthSalesData | null> {
  const rows = await fetchRange(sheetId, apiKey, month, "A1:K14", noCache);
  if (!rows.length) return null;

  const c1 = parseCloser(rows, 1, 4, "Closer 1");
  // Only include if there's some actual data
  if (c1.totalBooked === 0 && c1.totalRevenue === 0 && c1.totalCash === 0) return null;

  // Closer 2: value col H=7, count col K=10
  const c2Raw = parseCloser(rows, 7, 10, "");
  const c2 = (c2Raw.name && c2Raw.name !== "Closer 1" && (c2Raw.totalBooked > 0 || c2Raw.totalRevenue > 0))
    ? c2Raw : null;

  return { month, closer1: c1, closer2: c2 };
}

// ─── Parse year overview sheet ────────────────────────────────────────────────

function parseYearSheet(rows: string[][]): {
  closer1Name: string;
  yearRows: YearRow[];
  sums: YearRow | null;
  monthlyAvg: YearRow | null;
} {
  if (!rows.length) return { closer1Name: "Evan Mendoza", yearRows: [], sums: null, monthlyAvg: null };

  const closer1Name = (rows[0]?.[0] ?? "Evan Mendoza").trim() || "Evan Mendoza";

  // rows[1..12] = January–December (sheet rows 2–13)
  const MONTH_NAMES = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];

  const yearRows: YearRow[] = [];
  for (let i = 1; i <= 12; i++) {
    const row = rows[i] ?? [];
    const booked = toNum(row[1] ?? "");
    const taken  = toNum(row[2] ?? "");
    if (booked === 0 && taken === 0) continue;
    yearRows.push({
      month:         row[0] || MONTH_NAMES[i - 1],
      booked,
      taken,
      showPct:       toNum(row[3] ?? ""),
      offers:        toNum(row[4] ?? ""),
      closes:        toNum(row[5] ?? ""),
      closePct:      toNum(row[6] ?? ""),
      cashCollected: toNum(row[7] ?? ""),
      cashPerCall:   toNum(row[8] ?? ""),
    });
  }

  // Row index 14 = sheet row 15 = MONTHLY AVG
  // Row index 15 = sheet row 16 = SUMS
  const avgRow  = rows[14] ?? [];
  const sumsRow = rows[15] ?? [];

  const monthlyAvg: YearRow | null = avgRow.length > 1 ? {
    month: "Monthly Avg",
    booked:        toNum(avgRow[1] ?? ""),
    taken:         toNum(avgRow[2] ?? ""),
    showPct:       toNum(avgRow[3] ?? ""),
    offers:        toNum(avgRow[4] ?? ""),
    closes:        toNum(avgRow[5] ?? ""),
    closePct:      toNum(avgRow[6] ?? ""),
    cashCollected: toNum(avgRow[7] ?? ""),
    cashPerCall:   toNum(avgRow[8] ?? ""),
  } : null;

  const sums: YearRow | null = sumsRow.length > 1 ? {
    month: "Total",
    booked:        toNum(sumsRow[1] ?? ""),
    taken:         toNum(sumsRow[2] ?? ""),
    showPct:       toNum(sumsRow[3] ?? ""),
    offers:        toNum(sumsRow[4] ?? ""),
    closes:        toNum(sumsRow[5] ?? ""),
    closePct:      toNum(sumsRow[6] ?? ""),
    cashCollected: toNum(sumsRow[7] ?? ""),
    cashPerCall:   toNum(sumsRow[8] ?? ""),
  } : null;

  return { closer1Name, yearRows, sums, monthlyAvg };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getSalesDashboardData(noCache = false): Promise<SalesDashboardPayload> {
  const sheetId = process.env.SALES_DASHBOARD_SHEET_ID;
  const apiKey  = process.env.GOOGLE_SHEETS_API_KEY;

  if (!sheetId || !apiKey) return MOCK_SALES_PAYLOAD;

  try {
    // Fetch year overview + all month sheets in parallel
    const [yearRows, ...monthResults] = await Promise.all([
      fetchRange(sheetId, apiKey, "2026", "A1:I16", noCache),
      ...MONTH_SHEETS.map(m => fetchMonthData(sheetId, apiKey, m, noCache)),
    ]);

    const { closer1Name, yearRows: parsedYear, sums, monthlyAvg } = parseYearSheet(yearRows);
    const monthlyData = monthResults.filter((m): m is MonthSalesData => m !== null);

    // Current month = most recent with data
    const currentMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;

    return {
      source: "google-sheets",
      closer1Name,
      yearRows: parsedYear.length ? parsedYear : MOCK_YEAR,
      sums:       sums       ?? MOCK_SUMS,
      monthlyAvg: monthlyAvg ?? MOCK_AVG,
      monthlyData: monthlyData.length ? monthlyData : MOCK_MONTHLY_DATA,
      currentMonth: currentMonth ?? MOCK_MONTHLY_DATA[2],
    };
  } catch (err) {
    console.error("[sales] Error:", err);
    return MOCK_SALES_PAYLOAD;
  }
}
