import { fetchSheetValues } from "./funnel";

export const LANDING_PAGE_SHEET_ID = "1BKhVPfM_UJNkxOyx29iar--E9ahxPvpuFWiR01T2M58";
export const LANDING_PAGE_TAB      = "Landing Page Reporting";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PageStats {
  bookings:      number;
  callsShown:    number;
  showRate:      number;  // 0-100
  closes:        number;
  closeRate:     number;  // 0-100
  totalCash:     number;
  avgCashPerClose: number;
}

export interface HeadToHeadRow {
  metric: string;
  page1:  string;
  page2:  string;
  winner: "page1" | "page2" | "tie";
}

export interface LandingPageData {
  overall: {
    totalLeads:  number;
    callsShown:  number;
    totalClosed: number;
    showRate:    number;  // 0-100
    closeRate:   number;  // 0-100
    totalCash:   number;
  };
  page1: PageStats;
  page2: PageStats;
  headToHead: HeadToHeadRow[];
  quality: {
    page1Score: number;  // 0-100
    page2Score: number;
    winner: string;      // "Page 1" | "Page 2" | "Tie"
  };
  note: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const cv  = (row: string[], i: number) => (row[i] ?? "").trim();
const num = (s: string) => parseFloat(s.replace(/[$%,✓]/g, "").trim()) || 0;
const pct = (s: string) => {
  const n = parseFloat(s.replace(/[$%,]/g, "").trim());
  return isNaN(n) ? 0 : n;
};

function winnerCode(s: string): "page1" | "page2" | "tie" {
  const u = s.toLowerCase();
  if (u.includes("page 1") || u.includes("1")) return "page1";
  if (u.includes("page 2") || u.includes("2")) return "page2";
  return "tie";
}

// ─── Parser ────────────────────────────────────────────────────────────────

export function parseLandingPageRows(rows: string[][]): LandingPageData {
  // ── Overall stats ───────────────────────────────────────────────────────
  const overallHeaderIdx = rows.findIndex((r) =>
    cv(r, 0).toUpperCase().includes("OVERALL PERFORMANCE")
  );
  const overallHdr  = rows[overallHeaderIdx + 1] ?? [];
  const overallVals = rows[overallHeaderIdx + 2] ?? [];
  const noteRow     = rows[overallHeaderIdx + 3] ?? [];

  const overall = {
    totalLeads:  num(cv(overallVals, 0)),
    callsShown:  num(cv(overallVals, 1)),
    totalClosed: num(cv(overallVals, 2)),
    showRate:    pct(cv(overallVals, 4)),
    closeRate:   pct(cv(overallVals, 6)),
    totalCash:   num(cv(overallVals, 8)),
  };
  void overallHdr;

  const note = cv(noteRow, 0).replace(/^\^/, "").trim();

  // ── Head-to-head rows ───────────────────────────────────────────────────
  const h2hIdx = rows.findIndex((r) =>
    cv(r, 0).toUpperCase().includes("PAGE 1") &&
    cv(r, 0).toUpperCase().includes("PAGE 2") &&
    cv(r, 0).toUpperCase().includes("HEAD TO HEAD")
  );

  const headToHead: HeadToHeadRow[] = [];
  const page1Stats: Record<string, string> = {};
  const page2Stats: Record<string, string> = {};

  if (h2hIdx >= 0) {
    // skip the sub-header row (row after h2hIdx)
    for (const row of rows.slice(h2hIdx + 2)) {
      const metric = cv(row, 0) || cv(row, 1);
      const p1     = cv(row, 2);
      const p2     = cv(row, 4);
      const winner = cv(row, 6);
      if (!metric || metric.toUpperCase().includes("CALL QUALITY")) break;
      headToHead.push({ metric, page1: p1, page2: p2, winner: winnerCode(winner) });
      page1Stats[metric] = p1;
      page2Stats[metric] = p2;
    }
  }

  const page1: PageStats = {
    bookings:       num(page1Stats["Total Bookings"]         ?? "0"),
    callsShown:     num(page1Stats["Calls Shown"]            ?? "0"),
    showRate:       pct(page1Stats["Show Rate"]              ?? "0"),
    closes:         num(page1Stats["Closes"]                 ?? "0"),
    closeRate:      pct(page1Stats["Close Rate (of Shown)"]  ?? "0"),
    totalCash:      num(page1Stats["Total Cash"]             ?? "0"),
    avgCashPerClose: num(page1Stats["Avg Cash / Close"]      ?? "0"),
  };
  const page2: PageStats = {
    bookings:       num(page2Stats["Total Bookings"]         ?? "0"),
    callsShown:     num(page2Stats["Calls Shown"]            ?? "0"),
    showRate:       pct(page2Stats["Show Rate"]              ?? "0"),
    closes:         num(page2Stats["Closes"]                 ?? "0"),
    closeRate:      pct(page2Stats["Close Rate (of Shown)"]  ?? "0"),
    totalCash:      num(page2Stats["Total Cash"]             ?? "0"),
    avgCashPerClose: num(page2Stats["Avg Cash / Close"]      ?? "0"),
  };

  // ── Quality scores ──────────────────────────────────────────────────────
  const qualIdx = rows.findIndex((r) =>
    cv(r, 0).toUpperCase().includes("CALL QUALITY SCORE") ||
    cv(r, 1).toUpperCase().includes("CALL QUALITY SCORE")
  );

  let quality = { page1Score: 0, page2Score: 0, winner: "Page 2" };
  if (qualIdx >= 0) {
    const p1Row      = rows[qualIdx + 2];
    const p2Row      = rows[qualIdx + 3];
    const winnerRow  = rows[qualIdx + 4];
    quality = {
      page1Score: pct(cv(p1Row  ?? [], 4)),
      page2Score: pct(cv(p2Row  ?? [], 4)),
      winner:     cv(winnerRow ?? [], 4),
    };
  }

  return { overall, page1, page2, headToHead, quality, note };
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

export async function fetchLandingPageData(): Promise<LandingPageData> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
  const rows   = await fetchSheetValues(LANDING_PAGE_SHEET_ID, LANDING_PAGE_TAB, apiKey);
  return parseLandingPageRows(rows);
}
