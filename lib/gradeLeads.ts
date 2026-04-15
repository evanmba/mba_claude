import { fetchSheetValues, FUNNEL_SHEET_ID } from "./funnel";
import type { AdWindow } from "./meta";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GradeStats {
  totalLeads: number;
  grade9:  number;
  grade10: number;
  grade11: number;
  grade12: number;
}

export interface GradeLeadsResult {
  /** Keyed by campaign name (source part [1]) */
  byCampaign: Map<string, GradeStats>;
  /**
   * Keyed by `${campaignName}|||${adSetKey}`.
   * adSetKey = source part [2] (e.g. "1008.4")
   */
  byAdSet: Map<string, GradeStats>;
  /**
   * Keyed by normalized ad name (last pipe segment, prefix-stripped).
   * e.g. "TOF 1008.4" → "1008.4"
   */
  byAd: Map<string, GradeStats>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const cv = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");

function parseSheetDate(s: string): Date | null {
  const p = s.split("/");
  if (p.length < 3) return null;
  const m = parseInt(p[0], 10), d = parseInt(p[1], 10);
  let   y = parseInt(p[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (y < 100) y += 2000;
  return new Date(y, m - 1, d);
}

/** Strip "TOF ", "CBO ", "MBA | " etc. from ad names for matching. */
export function normalizeAdName(name: string): string {
  const pipeIdx = name.indexOf(" | ");
  if (pipeIdx >= 0) return name.slice(pipeIdx + 3).trim();
  return name.trim().replace(/^(TOF|CBO|BOF|MOF|MBA)\s+/i, "").trim();
}

function parseGrade(s: string): 9 | 10 | 11 | 12 | null {
  if (!s) return null;
  const digits = s.replace(/[^0-9]/g, "");
  const n = parseInt(digits, 10);
  if (n >= 9 && n <= 12) return n as 9 | 10 | 11 | 12;
  const l = s.toLowerCase();
  if (l.includes("fresh") || l.includes("ninth"))    return 9;
  if (l.includes("soph")  || l.includes("tenth"))    return 10;
  if (l.includes("jun")   || l.includes("eleventh")) return 11;
  if (l.includes("sen")   || l.includes("twelfth"))  return 12;
  return null;
}

function empty(): GradeStats {
  return { totalLeads: 0, grade9: 0, grade10: 0, grade11: 0, grade12: 0 };
}

function add(map: Map<string, GradeStats>, key: string, grade: 9 | 10 | 11 | 12 | null) {
  if (!key) return;
  if (!map.has(key)) map.set(key, empty());
  const s = map.get(key)!;
  s.totalLeads++;
  if      (grade === 9)  s.grade9++;
  else if (grade === 10) s.grade10++;
  else if (grade === 11) s.grade11++;
  else if (grade === 12) s.grade12++;
}

/**
 * Parse a LEADS source string into its hierarchy parts.
 * Format: "Facebook | {Campaign} | {AdSetKey} | {Audience} | {AdName}"
 */
export function parseLeadSource(source: string): {
  campaignName: string;
  adSetKey: string;     // e.g. "1008.4"
  adName: string;       // last segment, e.g. "TOF 1008.4"
  normalizedAdName: string;
} {
  const parts = source.split(" | ");
  // [0]=Platform [1]=Campaign [2]=AdSetKey [3]=Audience [4]=AdName
  const campaignName      = (parts[1] ?? "").trim();
  const adSetKey          = (parts[2] ?? "").trim();
  const adName            = (parts[parts.length - 1] ?? "").trim();
  const normalizedAdName  = normalizeAdName(adName);
  return { campaignName, adSetKey, adName, normalizedAdName };
}

// ─── Main parser ───────────────────────────────────────────────────────────────

export function parseGradeLeads(rows: string[][], since: Date, until: Date): GradeLeadsResult {
  const byCampaign = new Map<string, GradeStats>();
  const byAdSet    = new Map<string, GradeStats>();
  const byAd       = new Map<string, GradeStats>();

  if (rows.length < 2) return { byCampaign, byAdSet, byAd };

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().includes("first name")));
  if (hdrIdx < 0) return { byCampaign, byAdSet, byAd };

  const hdrs     = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const dateCol  = hdrs.findIndex((h) => h === "date");
  const firstCol = hdrs.findIndex((h) => h.includes("first name"));
  const srcCol   = hdrs.findIndex((h) => h === "source" || h.includes("source"));
  const gradeCol = hdrs.findIndex((h) => h.includes("grade"));

  if (srcCol < 0) return { byCampaign, byAdSet, byAd };

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;

    if (dateCol >= 0) {
      const d = parseSheetDate(cv(row, dateCol));
      if (!d || d < since || d > until) continue;
    }

    const source = cv(row, srcCol);
    if (!source) continue;

    const grade = parseGrade(cv(row, gradeCol));
    const { campaignName, adSetKey, normalizedAdName } = parseLeadSource(source);

    if (campaignName) {
      add(byCampaign, campaignName, grade);
    }
    if (campaignName && adSetKey) {
      add(byAdSet, `${campaignName}|||${adSetKey}`, grade);
    }
    if (normalizedAdName) {
      add(byAd, normalizedAdName, grade);
    }
  }

  return { byCampaign, byAdSet, byAd };
}

// ─── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Grade tracking started on April 15, 2026 — the date column K was added.
 * Leads before this date have no grade data and must be excluded so they
 * don't drag the 11th-grade percentage down artificially.
 * This date is independent of the Meta spend window.
 */
const GRADE_TRACKING_START = new Date(2026, 3, 15); // month is 0-based → April

export async function fetchGradeLeads(_window: AdWindow): Promise<GradeLeadsResult> {
  const apiKey = process.env.SHEETS_API_KEY
    ?? process.env.GOOGLE_SHEETS_API_KEY
    ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY
    ?? "";
  const rows  = await fetchSheetValues(FUNNEL_SHEET_ID, "LEADS", apiKey).catch(() => [] as string[][]);
  const since = GRADE_TRACKING_START;
  const until = new Date(); until.setHours(23, 59, 59, 999);
  return parseGradeLeads(rows, since, until);
}
