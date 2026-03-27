import { toNum } from "./sheets";
import { FUNNEL_SHEET_ID, fetchSheetValues } from "./funnel";
import { fetchMetaSpend, MetaLevel, MetaInsightRow } from "./meta";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SourceRow {
  source: string;
  spend: number;
  leads: number;
  bookedCalls: number;
  takenCalls: number;
  noShows: number;
  deals: number;
  cashCollected: number;
  revenue: number;
  // Computed cost metrics (require spend > 0)
  cpl: number;
  costPerBooked: number;
  costPerTaken: number;
  cpa: number;
  cashRoas: number;
  revenueRoas: number;
  // Meta status
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

// Normalize a name for fuzzy matching
function normName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// Strip trailing version-number suffixes from ad names so variants group together.
// Handles: "Ad Name 1.0.0.2", "Ad Name 0.2.1.7", "Ad Name v1.3", "Ad Name - V2"
function normalizeCreativeName(name: string): string {
  return name
    .replace(/\s+[-–]?\s*v\d+(\.\d+)*\s*$/i, "")   // " v1.3" / " - V2"
    .replace(/\s+\d+(\.\d+)+\s*$/, "")               // " 1.0.0.2" / " 0.2.1.7.3"
    .replace(/\s*\(\s*v?\d+(\.\d+)*\s*\)\s*$/, "")   // " (v2)" / " (1.0)"
    .trim();
}

// Group Meta rows by normalized creative name, summing spend + other fields
function groupByCreative(metaRows: MetaInsightRow[]): MetaInsightRow[] {
  const grouped = new Map<string, MetaInsightRow & { _count: number }>();

  for (const r of metaRows) {
    const key = normalizeCreativeName(r.name);
    if (!grouped.has(key)) {
      grouped.set(key, { ...r, name: key, _count: 1 });
    } else {
      const g = grouped.get(key)!;
      g.spend       += r.spend;
      g.impressions += r.impressions;
      g.clicks      += r.clicks;
      g.reach       += r.reach;
      g._count      += 1;
      // Status: prefer ACTIVE over others
      if (r.status === "ACTIVE") g.status = "ACTIVE";
    }
  }

  // Recompute derived rates
  const result: MetaInsightRow[] = [];
  for (const g of grouped.values()) {
    result.push({
      ...g,
      cpm: g.impressions > 0 ? (g.spend / g.impressions) * 1000 : 0,
      cpc: g.clicks > 0 ? g.spend / g.clicks : 0,
      ctr: g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0,
    });
  }
  return result;
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
    first:      fi(hdrs, ["first name"]),
    source:     fi(hdrs, ["source"]),
    noShow:     fi(hdrs, ["no show"]),
    showed:     fi(hdrs, ["showed"]),
    fuClosed:   fi(hdrs, ["fu - closed"]),
    closedDate: fi(hdrs, ["closed date"]),
    cash:       fi(hdrs, ["cash collected"]),
    revenue:    fi(hdrs, ["revenue"]),
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
  const srcCol   = fi(hdrs, ["source"]);
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
// Fuzzy match Meta name → calls source key
// ---------------------------------------------------------------------------
function matchMetaToSource(metaName: string, callsKeys: string[]): string | null {
  const needle = normName(metaName);
  for (const k of callsKeys) if (normName(k) === needle) return k;
  for (const k of callsKeys) { const hay = normName(k); if (needle.includes(hay) || hay.includes(needle)) return k; }
  return null;
}

// ---------------------------------------------------------------------------
// Build SourceRow from components
// ---------------------------------------------------------------------------
function buildRow(
  source: string,
  spend: number,
  leads: number,
  calls: { booked: number; taken: number; noShow: number; deals: number; cash: number; revenue: number } | null,
  metaStatus?: string,
): SourceRow {
  const booked  = calls?.booked  ?? 0;
  const taken   = calls?.taken   ?? 0;
  const noShows = calls?.noShow  ?? 0;
  const deals   = calls?.deals   ?? 0;
  const cash    = calls?.cash    ?? 0;
  const revenue = calls?.revenue ?? 0;

  return {
    source,
    spend,
    leads,
    bookedCalls:   booked,
    takenCalls:    taken,
    noShows,
    deals,
    cashCollected: cash,
    revenue,
    cpl:           spend > 0 && leads  > 0 ? spend / leads  : 0,
    costPerBooked: spend > 0 && booked > 0 ? spend / booked : 0,
    costPerTaken:  spend > 0 && taken  > 0 ? spend / taken  : 0,
    cpa:           spend > 0 && deals  > 0 ? spend / deals  : 0,
    cashRoas:      spend > 0 ? cash    / spend : 0,
    revenueRoas:   spend > 0 ? revenue / spend : 0,
    metaStatus,
  };
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
    const [callsRows, leadsRows, metaData] = await Promise.all([
      fetchSheetValues(FUNNEL_SHEET_ID, "CALLS", apiKey),
      fetchSheetValues(FUNNEL_SHEET_ID, "LEADS", apiKey),
      fetchMetaSpend(level, datePreset),
    ]);

    const callsBySource = aggregateCalls(callsRows);
    const leadsBySource = aggregateLeads(leadsRows);
    const callsKeys     = [...callsBySource.keys()];
    const metaConnected = !metaData.error && metaData.rows.length > 0;

    if (metaConnected) {
      // At the "ad" level, group variants by normalized creative name
      const metaRows = level === "ad"
        ? groupByCreative(metaData.rows)
        : metaData.rows;

      const rows: SourceRow[] = metaRows
        .map((mr) => {
          const matchKey = matchMetaToSource(mr.name, callsKeys);
          const calls    = matchKey ? (callsBySource.get(matchKey) ?? null) : null;
          const leads    = matchKey ? (leadsBySource.get(matchKey) ?? 0) : 0;
          return buildRow(mr.name, mr.spend, leads, calls, mr.status);
        })
        .sort((a, b) => b.spend - a.spend);

      return { rows, hasSpend: true, metaConnected: true, level, datePreset, lastUpdated };
    }

    // ── Sheet-driven fallback (no Meta tokens) ────────────────────────────
    const allSources = new Set([...callsBySource.keys(), ...leadsBySource.keys()]);
    const rows: SourceRow[] = Array.from(allSources)
      .map((source) => {
        const calls  = callsBySource.get(source) ?? null;
        const leads  = leadsBySource.get(source) ?? 0;
        return buildRow(source, 0, leads, calls);
      })
      .filter((r) => r.bookedCalls > 0 || r.leads > 0)
      .sort((a, b) => b.bookedCalls - a.bookedCalls);

    return { rows, hasSpend: false, metaConnected: false, level, datePreset, lastUpdated };
  } catch (err) {
    return {
      rows: [], hasSpend: false, metaConnected: false, level, datePreset, lastUpdated,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
