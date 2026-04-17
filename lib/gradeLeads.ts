import { fetchSheetValues, FUNNEL_SHEET_ID } from "./funnel";
import type { AdWindow } from "./meta";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GradeStats {
  totalLeads:  number;  // ALL leads in the selected window (used for CPL)
  gradedLeads: number;  // Leads that have grade data (Apr 15 2026+) — pct11 denominator
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

  // Graduation year format (e.g. 2026, 2027, 2028, 2029)
  // 12th = current senior year, which is the calendar year in spring (Jan–Aug)
  // or calendar year + 1 in fall (Sep–Dec).
  if (n >= 2020 && n <= 2040) {
    const now = new Date();
    const seniorYear = now.getMonth() < 8 ? now.getFullYear() : now.getFullYear() + 1;
    const grade = 12 - (n - seniorYear);
    if (grade >= 9 && grade <= 12) return grade as 9 | 10 | 11 | 12;
    return null;
  }

  // Direct grade number (9–12)
  if (n >= 9 && n <= 12) return n as 9 | 10 | 11 | 12;

  // Text / word form
  const l = s.toLowerCase();
  if (l.includes("fresh") || l.includes("ninth"))    return 9;
  if (l.includes("soph")  || l.includes("tenth"))    return 10;
  if (l.includes("jun")   || l.includes("eleventh")) return 11;
  if (l.includes("sen")   || l.includes("twelfth"))  return 12;
  return null;
}

function empty(): GradeStats {
  return { totalLeads: 0, gradedLeads: 0, grade9: 0, grade10: 0, grade11: 0, grade12: 0 };
}

function ensure(map: Map<string, GradeStats>, key: string): GradeStats {
  if (!map.has(key)) map.set(key, empty());
  return map.get(key)!;
}

/**
 * Parse a LEADS source string into its hierarchy parts.
 * Format: "Facebook | {Campaign} | {AdSetKey} | {Audience} | {AdName}"
 */
export function parseLeadSource(source: string): {
  campaignName: string;
  adSetKey: string;
  adName: string;
  normalizedAdName: string;
} {
  const parts = source.split(" | ");
  const campaignName     = (parts[1] ?? "").trim();
  const adSetKey         = (parts[2] ?? "").trim();
  const adName           = (parts[parts.length - 1] ?? "").trim();
  const normalizedAdName = normalizeAdName(adName);
  return { campaignName, adSetKey, adName, normalizedAdName };
}

// ─── Main parser ───────────────────────────────────────────────────────────────

/**
 * Single-pass parser using two date windows:
 *   windowSince/windowUntil → counts totalLeads (for CPL accuracy)
 *   gradeSince/gradeUntil   → counts gradedLeads + grade9/10/11/12
 *
 * A lead only needs to fall within the window range to increment totalLeads.
 * It only increments grade counts if it also falls within the grade range.
 */
export function parseGradeLeads(
  rows: string[][],
  windowSince: Date,
  windowUntil: Date,
  gradeSince: Date,
  gradeUntil: Date,
): GradeLeadsResult {
  const byCampaign = new Map<string, GradeStats>();
  const byAdSet    = new Map<string, GradeStats>();
  const byAd       = new Map<string, GradeStats>();

  if (rows.length < 2) return { byCampaign, byAdSet, byAd };

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().includes("first name")));
  if (hdrIdx < 0) return { byCampaign, byAdSet, byAd };

  const hdrs     = rows[hdrIdx].map((h) => h.replace(/\n/g, " ").toLowerCase().trim());
  const dateCol  = hdrs.findIndex((h) => h === "date");
  const firstCol = hdrs.findIndex((h) => h.includes("first name"));
  const srcCol   = hdrs.findIndex((h) => h === "source" || h.includes("source"));
  const gradeCol = hdrs.findIndex((h) => h.includes("grade") || h.includes("graduation") || h.includes("grad year"));

  if (srcCol < 0) return { byCampaign, byAdSet, byAd };

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;

    const source = cv(row, srcCol);
    if (!source) continue;

    // Parse lead date
    let leadDate: Date | null = null;
    if (dateCol >= 0) {
      leadDate = parseSheetDate(cv(row, dateCol));
      if (!leadDate) continue;
    }

    const inWindow = !leadDate || (leadDate >= windowSince && leadDate <= windowUntil);
    const inGrade  = !leadDate || (leadDate >= gradeSince  && leadDate <= gradeUntil);

    // Must be in at least one range to matter
    if (!inWindow && !inGrade) continue;

    const { campaignName, adSetKey, normalizedAdName } = parseLeadSource(source);

    if (campaignName) {
      const s = ensure(byCampaign, campaignName);
      if (inWindow) s.totalLeads++;
      if (inGrade) {
        s.gradedLeads++;
        const g = parseGrade(cv(row, gradeCol));
        if      (g === 9)  s.grade9++;
        else if (g === 10) s.grade10++;
        else if (g === 11) s.grade11++;
        else if (g === 12) s.grade12++;
      }
    }
    if (campaignName && adSetKey) {
      const s = ensure(byAdSet, `${campaignName}|||${adSetKey}`);
      if (inWindow) s.totalLeads++;
      if (inGrade) {
        s.gradedLeads++;
        const g = parseGrade(cv(row, gradeCol));
        if      (g === 9)  s.grade9++;
        else if (g === 10) s.grade10++;
        else if (g === 11) s.grade11++;
        else if (g === 12) s.grade12++;
      }
    }
    if (normalizedAdName) {
      const s = ensure(byAd, normalizedAdName);
      if (inWindow) s.totalLeads++;
      if (inGrade) {
        s.gradedLeads++;
        const g = parseGrade(cv(row, gradeCol));
        if      (g === 9)  s.grade9++;
        else if (g === 10) s.grade10++;
        else if (g === 11) s.grade11++;
        else if (g === 12) s.grade12++;
      }
    }
  }

  return { byCampaign, byAdSet, byAd };
}

// ─── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Grade tracking started April 15, 2026 — the date column K was added.
 * Leads before this date have no grade data.
 * totalLeads counts ALL leads in the selected window (accurate CPL).
 * gradedLeads + grade stats only count leads from Apr 15 onward.
 */
const GRADE_TRACKING_START = new Date(2026, 3, 15); // April 15 2026

export async function fetchGradeLeads(window: AdWindow): Promise<GradeLeadsResult> {
  const apiKey = process.env.SHEETS_API_KEY
    ?? process.env.GOOGLE_SHEETS_API_KEY
    ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY
    ?? "";
  const rows = await fetchSheetValues(FUNNEL_SHEET_ID, "LEADS", apiKey).catch(() => [] as string[][]);

  const days = window === "7d" ? 7 : window === "14d" ? 14 : 30;
  const windowUntil = new Date(); windowUntil.setHours(23, 59, 59, 999);
  const windowSince = new Date(); windowSince.setHours(0, 0, 0, 0);
  windowSince.setDate(windowSince.getDate() - days);

  const gradeUntil = windowUntil;
  const gradeSince = GRADE_TRACKING_START;

  return parseGradeLeads(rows, windowSince, windowUntil, gradeSince, gradeUntil);
}
