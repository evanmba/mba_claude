import { fetchSheetValues, FUNNEL_SHEET_ID } from "./funnel";
import type { AdWindow } from "./meta";
import { normalizeAdName } from "./gradeLeads";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CallStats {
  bookedCalls: number;
}

export interface CallSourceResult {
  /** Keyed by campaign name (col E) */
  byCampaign: Map<string, CallStats>;
  /**
   * Keyed by `${campaignName}|||${adSetFullName}`.
   * adSetFullName = col F verbatim, e.g. "Parents 13-17 Baseball (1009.6.1.2)"
   */
  byAdSet: Map<string, CallStats>;
  /**
   * Keyed by normalizedAdName (col G, prefix-stripped).
   * e.g. "TOF 1009.6.1.2" → "1009.6.1.2"
   */
  byAd: Map<string, CallStats>;
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

function windowDates(w: AdWindow): { since: Date; until: Date } {
  const days  = w === "7d" ? 7 : w === "14d" ? 14 : 30;
  const until = new Date(); until.setHours(23, 59, 59, 999);
  const since = new Date(); since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);
  return { since, until };
}

function addCall(map: Map<string, CallStats>, key: string) {
  if (!key) return;
  if (!map.has(key)) map.set(key, { bookedCalls: 0 });
  map.get(key)!.bookedCalls++;
}

/**
 * Try to match a Meta ad set name against a Call Source ad set name (col F).
 * Handles cases where they aren't identical:
 *   Meta:         "Parents 13-17 Baseball (1009.6.1.2)"
 *   Call Source:  "Parents 13-17 Baseball (1009.6.1.2)"  ← exact, or slightly different
 */
export function matchAdSetName(metaName: string, csName: string): boolean {
  const a = metaName.toLowerCase().trim();
  const b = csName.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Also try extracting the ID portion inside parentheses
  const idA = a.match(/\(([^)]+)\)/)?.[1] ?? "";
  const idB = b.match(/\(([^)]+)\)/)?.[1] ?? "";
  if (idA && idB && idA === idB) return true;
  return false;
}

// ─── Parser ────────────────────────────────────────────────────────────────────

/**
 * Col A (0): First Name
 * Col B (1): Last Name
 * Col C (2): Booked Date
 * Col D (3): ID / URL
 * Col E (4): Campaign
 * Col F (5): Ad Set
 * Col G (6): Ad Creative
 * Col H (7): Showed
 */
export function parseCallSourceLeads(rows: string[][], since: Date, until: Date): CallSourceResult {
  const byCampaign = new Map<string, CallStats>();
  const byAdSet    = new Map<string, CallStats>();
  const byAd       = new Map<string, CallStats>();

  if (rows.length < 2) return { byCampaign, byAdSet, byAd };

  // Find header row (contains "First Name")
  const hdrIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().includes("first name")));
  if (hdrIdx < 0) return { byCampaign, byAdSet, byAd };

  const hdrs    = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  // Use column index from header detection, but fall back to fixed indices
  // per user spec (E=4, F=5, G=6)
  const dateCol  = hdrs.findIndex((h) => h.includes("booked date") || h === "date");
  const firstCol = hdrs.findIndex((h) => h.includes("first name"));
  const campCol  = hdrs.findIndex((h) => h === "campaign");
  const adSetCol = hdrs.findIndex((h) => h === "ad set");
  const adCol    = hdrs.findIndex((h) => h === "ad");

  // Fallback to user-specified fixed column positions (E=4, F=5, G=6)
  const cCol = campCol  >= 0 ? campCol  : 4;
  const fCol = adSetCol >= 0 ? adSetCol : 5;
  const gCol = adCol    >= 0 ? adCol    : 6;

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;

    // Date filter
    if (dateCol >= 0) {
      const d = parseSheetDate(cv(row, dateCol));
      if (!d || d < since || d > until) continue;
    }

    const campaign = cv(row, cCol);
    const adSet    = cv(row, fCol);
    const ad       = cv(row, gCol);

    // Skip rows with no campaign data (organic, manual, etc.)
    if (!campaign || campaign === "-") continue;

    addCall(byCampaign, campaign);
    if (campaign && adSet) {
      addCall(byAdSet, `${campaign}|||${adSet}`);
    }
    if (ad) {
      addCall(byAd, normalizeAdName(ad));
      // Also store under raw name in case normalization strips too much
      addCall(byAd, ad);
    }
  }

  return { byCampaign, byAdSet, byAd };
}

// ─── Fetcher ───────────────────────────────────────────────────────────────────

export async function fetchCallSourceLeads(window: AdWindow): Promise<CallSourceResult> {
  const apiKey = process.env.SHEETS_API_KEY
    ?? process.env.GOOGLE_SHEETS_API_KEY
    ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY
    ?? "";
  const rows          = await fetchSheetValues(FUNNEL_SHEET_ID, "Call Source", apiKey).catch(() => [] as string[][]);
  const { since, until } = windowDates(window);
  return parseCallSourceLeads(rows, since, until);
}
