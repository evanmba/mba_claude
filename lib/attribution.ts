import { toNum } from "./sheets";
import { FUNNEL_SHEET_ID, fetchSheetValues } from "./funnel";
import { fetchMetaSpend, MetaLevel } from "./meta";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SourceRow {
  source: string;
  spend: number;         // 0 if not provided
  leads: number;
  bookedCalls: number;
  takenCalls: number;
  noShows: number;
  showUpRate: number;    // %
  deals: number;
  closeRate: number;     // %
  cashCollected: number;
  revenue: number;
  // Computed cost metrics (require spend)
  cpl: number;
  costPerBooked: number;
  costPerTaken: number;
  cpa: number;
  cashRoas: number;
  revenueRoas: number;
  // Meta extras (optional)
  impressions?: number;
  clicks?: number;
  cpm?: number;
  cpc?: number;
  ctr?: number;
  metaStatus?: string;
}

export interface AttributionData {
  rows: SourceRow[];
  hasSpend: boolean;
  metaConnected: boolean;
  level: MetaLevel;
  datePreset: string;
  lastUpdated: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fi = (hdrs: string[], kws: string[]) =>
  hdrs.findIndex((h) => kws.every((k) => h.toLowerCase().includes(k.toLowerCase())));
const cv = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");
const toBool = (s: string) => { const u = s.toUpperCase().trim(); return u === "TRUE" || u === "YES" || u === "1" || u === "X"; };

// Normalize a name for fuzzy matching: lowercase, trim, collapse whitespace, remove punctuation
function normName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Parse calls → aggregate by source
// ---------------------------------------------------------------------------
function aggregateCalls(rows: string[][]): Map<string, { booked: number; taken: number; noShow: number; deals: number; cash: number; revenue: number }> {
  const map = new Map<string, { booked: number; taken: number; noShow: number; deals: number; cash: number; revenue: number }>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().includes("booked date")));
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const cols = {
    first:   fi(hdrs, ["first name"]),
    source:  fi(hdrs, ["source"]),
    noShow:  fi(hdrs, ["no show"]),
    showed:  fi(hdrs, ["showed"]),
    fuClosed: fi(hdrs, ["fu - closed"]),
    closedDate: fi(hdrs, ["closed date"]),
    cash:    fi(hdrs, ["cash collected"]),
    revenue: fi(hdrs, ["revenue"]),
  };

  for (const row of rows.slice(hdrIdx + 1)) {
    if (!cv(row, cols.first)) continue;
    const src = cv(row, cols.source) || "Unknown";
    if (!map.has(src)) map.set(src, { booked: 0, taken: 0, noShow: 0, deals: 0, cash: 0, revenue: 0 });
    const entry = map.get(src)!;
    entry.booked += 1;
    if (toBool(cv(row, cols.showed))) entry.taken += 1;
    if (toBool(cv(row, cols.noShow))) entry.noShow += 1;
    const cash = toNum(cv(row, cols.cash));
    const rev  = toNum(cv(row, cols.revenue));
    if (cash > 0 || toBool(cv(row, cols.closedDate)) || toBool(cv(row, cols.fuClosed))) entry.deals += 1;
    entry.cash    += cash;
    entry.revenue += rev;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Parse leads → count by source
// ---------------------------------------------------------------------------
function aggregateLeads(rows: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().includes("first name") || c.toLowerCase().includes("source")));
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const srcCol = fi(hdrs, ["source"]);
  const firstCol = fi(hdrs, ["first name"]);
  if (srcCol < 0) return map;

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;
    const src = cv(row, srcCol) || "Unknown";
    map.set(src, (map.get(src) ?? 0) + 1);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Parse spend tab → source → spend mapping (fallback when no Meta API)
// "AD SPEND" tab format: Source | Spend
// ---------------------------------------------------------------------------
function parseSpend(rows: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) => r.some((c) => /source|ad set|campaign/i.test(c)));
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const srcCol   = fi(hdrs, ["source"]) >= 0 ? fi(hdrs, ["source"]) : fi(hdrs, ["ad set"]) >= 0 ? fi(hdrs, ["ad set"]) : fi(hdrs, ["campaign"]);
  const spendCol = fi(hdrs, ["spend"]);
  if (srcCol < 0 || spendCol < 0) return map;

  for (const row of rows.slice(hdrIdx + 1)) {
    const src = cv(row, srcCol);
    const amt = toNum(cv(row, spendCol));
    if (src && amt > 0) map.set(src, (map.get(src) ?? 0) + amt);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Match Meta name → calls source name (best-effort fuzzy)
// Returns the calls source key that best matches the Meta name, or null.
// ---------------------------------------------------------------------------
function matchMetaToSource(
  metaName: string,
  callsKeys: string[],
): string | null {
  const needle = normName(metaName);
  // 1. Exact normalized match
  for (const k of callsKeys) {
    if (normName(k) === needle) return k;
  }
  // 2. One contains the other
  for (const k of callsKeys) {
    const hay = normName(k);
    if (needle.includes(hay) || hay.includes(needle)) return k;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main fetch
// ---------------------------------------------------------------------------
export async function fetchAttributionData(
  level: MetaLevel = "adset",
  datePreset = "this_month",
): Promise<AttributionData> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? "";
  const lastUpdated = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  try {
    // Fetch calls, leads, Meta spend, and optional sheet spend in parallel
    const [callsRows, leadsRows, metaData, spendRows] = await Promise.all([
      fetchSheetValues(FUNNEL_SHEET_ID, "CALLS", apiKey),
      fetchSheetValues(FUNNEL_SHEET_ID, "LEADS", apiKey),
      fetchMetaSpend(level, datePreset),
      fetchSheetValues(FUNNEL_SHEET_ID, "AD SPEND", apiKey).catch(() => [] as string[][]),
    ]);

    const callsBySource  = aggregateCalls(callsRows);
    const leadsBySource  = aggregateLeads(leadsRows);
    const metaConnected  = !metaData.error && metaData.rows.length > 0;
    const sheetSpendMap  = parseSpend(spendRows);

    const callsKeys = [...callsBySource.keys()];

    if (metaConnected) {
      // ── Meta-driven: one row per Meta adset/campaign/ad ──────────────────
      // Map each Meta row to the best-matching calls source
      const rows: SourceRow[] = metaData.rows.map((mr) => {
        const matchedKey = matchMetaToSource(mr.name, callsKeys);
        const c = matchedKey ? (callsBySource.get(matchedKey) ?? null) : null;
        const leads = matchedKey ? (leadsBySource.get(matchedKey) ?? 0) : 0;
        const spend = mr.spend;

        const booked  = c?.booked  ?? 0;
        const taken   = c?.taken   ?? 0;
        const noShow  = c?.noShow  ?? 0;
        const deals   = c?.deals   ?? 0;
        const cash    = c?.cash    ?? 0;
        const revenue = c?.revenue ?? 0;

        return {
          source:        mr.name,
          spend,
          leads,
          bookedCalls:   booked,
          takenCalls:    taken,
          noShows:       noShow,
          showUpRate:    booked > 0 ? (taken  / booked) * 100 : 0,
          deals,
          closeRate:     taken  > 0 ? (deals  / taken)  * 100 : 0,
          cashCollected: cash,
          revenue,
          cpl:           spend > 0 && leads   > 0 ? spend / leads   : 0,
          costPerBooked: spend > 0 && booked  > 0 ? spend / booked  : 0,
          costPerTaken:  spend > 0 && taken   > 0 ? spend / taken   : 0,
          cpa:           spend > 0 && deals   > 0 ? spend / deals   : 0,
          cashRoas:      spend > 0 ? cash    / spend : 0,
          revenueRoas:   spend > 0 ? revenue / spend : 0,
          impressions:   mr.impressions,
          clicks:        mr.clicks,
          cpm:           mr.cpm,
          cpc:           mr.cpc,
          ctr:           mr.ctr,
          metaStatus:    mr.status,
        };
      }).sort((a, b) => b.spend - a.spend);

      return { rows, hasSpend: true, metaConnected: true, level, datePreset, lastUpdated };
    }

    // ── Sheet-driven fallback ─────────────────────────────────────────────
    const hasSpend = sheetSpendMap.size > 0;
    const allSources = new Set([...callsBySource.keys(), ...leadsBySource.keys()]);

    const rows: SourceRow[] = Array.from(allSources)
      .filter((s) => s && s !== "Unknown" || callsBySource.has(s))
      .map((source) => {
        const c       = callsBySource.get(source) ?? { booked: 0, taken: 0, noShow: 0, deals: 0, cash: 0, revenue: 0 };
        const leads   = leadsBySource.get(source) ?? 0;
        const spend   = sheetSpendMap.get(source) ?? 0;

        return {
          source,
          spend,
          leads,
          bookedCalls:   c.booked,
          takenCalls:    c.taken,
          noShows:       c.noShow,
          showUpRate:    c.booked > 0 ? (c.taken / c.booked) * 100 : 0,
          deals:         c.deals,
          closeRate:     c.taken > 0 ? (c.deals / c.taken) * 100 : 0,
          cashCollected: c.cash,
          revenue:       c.revenue,
          cpl:           spend > 0 && leads   > 0 ? spend / leads    : 0,
          costPerBooked: spend > 0 && c.booked > 0 ? spend / c.booked : 0,
          costPerTaken:  spend > 0 && c.taken  > 0 ? spend / c.taken  : 0,
          cpa:           spend > 0 && c.deals  > 0 ? spend / c.deals  : 0,
          cashRoas:      spend > 0 ? c.cash    / spend : 0,
          revenueRoas:   spend > 0 ? c.revenue / spend : 0,
        };
      })
      .filter((r) => r.bookedCalls > 0 || r.leads > 0)
      .sort((a, b) => b.bookedCalls - a.bookedCalls);

    return { rows, hasSpend, metaConnected: false, level, datePreset, lastUpdated };
  } catch (err) {
    return { rows: [], hasSpend: false, metaConnected: false, level, datePreset, lastUpdated, error: err instanceof Error ? err.message : String(err) };
  }
}
