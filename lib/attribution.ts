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
  cpl: number;
  costPerBooked: number;
  costPerTaken: number;
  cpa: number;
  cashRoas: number;
  revenueRoas: number;
  metaStatus?: string;
}

export interface AttributionData {
  rows: SourceRow[];
  hasSpend: boolean;
  metaConnected: boolean;
  usesCallSource: boolean;   // true = Call Source tab; false = old CALLS tab fallback
  level: MetaLevel;
  datePreset: string;
  lastUpdated: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const fi = (hdrs: string[], kws: string[]) =>
  hdrs.findIndex((h) => kws.every((k) => h.toLowerCase().includes(k.toLowerCase())));
const cv = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");
const toBool = (s: string) => {
  const u = s.toUpperCase().trim();
  return u === "TRUE" || u === "YES" || u === "1" || u === "X";
};

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// Strip trailing version-number suffixes so ad variants merge cleanly.
// "Ad Name 1.0.0.2" → "Ad Name",  "Ad Name v1.3" → "Ad Name"
function normalizeCreativeName(name: string): string {
  return name
    .replace(/\s+[-–]?\s*v\d+(\.\d+)*\s*$/i, "")
    .replace(/\s+\d+(\.\d+)+\s*$/, "")
    .replace(/\s*\(\s*v?\d+(\.\d+)*\s*\)\s*$/, "")
    .trim();
}

type CallEntry = { booked: number; taken: number; noShow: number; deals: number; cash: number; revenue: number };

// ---------------------------------------------------------------------------
// "Call Source" tab  ← preferred  (has campaign / ad set / ad columns)
// ---------------------------------------------------------------------------
function aggregateCallSource(
  rows: string[][],
  groupBy: "campaign" | "adset" | "ad",
): Map<string, CallEntry> {
  const map = new Map<string, CallEntry>();
  if (rows.length < 2) return map;

  // Find header row
  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => /campaign|ad set|ad name|first name/i.test(c))
  );
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());

  // Column index for the group-by dimension
  const keyCol =
    groupBy === "campaign" ? fi(hdrs, ["campaign"])
    : groupBy === "adset"  ? fi(hdrs, ["ad set"])
    : fi(hdrs, ["ad"]);          // "ad" – matches "ad" column (not "ad set")

  if (keyCol < 0) return map;

  const cols = {
    first:    fi(hdrs, ["first name"]),
    showed:   fi(hdrs, ["showed"]),
    closed:   fi(hdrs, ["closed"]),
    cash:     fi(hdrs, ["cash collected"]),
    revenue:  fi(hdrs, ["revenue"]),
  };

  for (const row of rows.slice(hdrIdx + 1)) {
    // Skip blank rows
    if (cols.first >= 0 && !cv(row, cols.first)) continue;

    let key = cv(row, keyCol) || "Unknown";

    // At creative level, normalize so version variants merge
    if (groupBy === "ad") key = normalizeCreativeName(key) || key;

    if (!map.has(key)) map.set(key, { booked: 0, taken: 0, noShow: 0, deals: 0, cash: 0, revenue: 0 });
    const e = map.get(key)!;

    e.booked += 1;
    if (toBool(cv(row, cols.showed))) e.taken += 1;
    const cash = toNum(cv(row, cols.cash));
    const rev  = toNum(cv(row, cols.revenue));
    if (toBool(cv(row, cols.closed)) || cash > 0) e.deals += 1;
    e.cash    += cash;
    e.revenue += rev;
  }
  return map;
}

// ---------------------------------------------------------------------------
// "CALLS" tab  ← legacy fallback  (groups by "source" column)
// ---------------------------------------------------------------------------
function aggregateCallsLegacy(rows: string[][]): Map<string, CallEntry> {
  const map = new Map<string, CallEntry>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) => r.some((c) => /booked date/i.test(c)));
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const cols = {
    first:      fi(hdrs, ["first name"]),
    source:     fi(hdrs, ["source"]),
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
    const e = map.get(src)!;
    e.booked += 1;
    if (toBool(cv(row, cols.showed))) e.taken += 1;
    const cash = toNum(cv(row, cols.cash));
    const rev  = toNum(cv(row, cols.revenue));
    if (cash > 0 || toBool(cv(row, cols.closedDate)) || toBool(cv(row, cols.fuClosed))) e.deals += 1;
    e.cash    += cash;
    e.revenue += rev;
  }
  return map;
}

// ---------------------------------------------------------------------------
// LEADS tab  (still keyed by "source")
// ---------------------------------------------------------------------------
function aggregateLeads(rows: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => /first name|source/i.test(c))
  );
  if (hdrIdx < 0) return map;

  const hdrs    = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const srcCol  = fi(hdrs, ["source"]);
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
// Meta creative grouping (sum spend across variant ads)
// ---------------------------------------------------------------------------
function groupMetaByCreative(metaRows: MetaInsightRow[]): MetaInsightRow[] {
  const grouped = new Map<string, MetaInsightRow>();

  for (const r of metaRows) {
    const key = normalizeCreativeName(r.name);
    if (!grouped.has(key)) {
      grouped.set(key, { ...r, name: key });
    } else {
      const g = grouped.get(key)!;
      g.spend       += r.spend;
      g.impressions += r.impressions;
      g.clicks      += r.clicks;
      g.reach       += r.reach;
      if (r.status === "ACTIVE") g.status = "ACTIVE";
    }
  }

  return [...grouped.values()].map((g) => ({
    ...g,
    cpm: g.impressions > 0 ? (g.spend / g.impressions) * 1000 : 0,
    cpc: g.clicks > 0 ? g.spend / g.clicks : 0,
    ctr: g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0,
  }));
}

// ---------------------------------------------------------------------------
// Match Meta name → calls map key (exact normalized, then substring)
// ---------------------------------------------------------------------------
function matchKey(metaName: string, callsKeys: string[]): string | null {
  const needle = normName(metaName);
  for (const k of callsKeys) if (normName(k) === needle) return k;
  for (const k of callsKeys) {
    const hay = normName(k);
    if (needle.includes(hay) || hay.includes(needle)) return k;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build SourceRow
// ---------------------------------------------------------------------------
function buildRow(
  source: string,
  spend: number,
  leads: number,
  c: CallEntry | null,
  metaStatus?: string,
): SourceRow {
  const booked  = c?.booked  ?? 0;
  const taken   = c?.taken   ?? 0;
  const deals   = c?.deals   ?? 0;
  const cash    = c?.cash    ?? 0;
  const revenue = c?.revenue ?? 0;

  return {
    source,
    spend,
    leads,
    bookedCalls:   booked,
    takenCalls:    taken,
    noShows:       c?.noShow ?? 0,
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
// Match a Call Source creative name → sum spend from all matching Meta ads
// "Matching" = either name contains the other (after normalization)
// ---------------------------------------------------------------------------
function sumMetaSpendForCreative(
  creativeName: string,
  metaAdRows: MetaInsightRow[],
): { spend: number; status: string } {
  const needle = normName(creativeName);
  let spend = 0;
  let status = "UNKNOWN";

  for (const r of metaAdRows) {
    const hay = normName(r.name);
    if (hay.includes(needle) || needle.includes(hay)) {
      spend += r.spend;
      if (r.status === "ACTIVE") status = "ACTIVE";
      else if (status === "UNKNOWN") status = r.status;
    }
  }
  return { spend, status };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function fetchAttributionData(
  level: MetaLevel = "adset",
  datePreset = "this_month",
): Promise<AttributionData> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? "";
  const lastUpdated = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const groupBy: "campaign" | "adset" | "ad" =
    level === "campaign" ? "campaign" : level === "adset" ? "adset" : "ad";

  try {
    const [callSourceRows, callsLegacyRows, leadsRows, metaData] = await Promise.all([
      fetchSheetValues(FUNNEL_SHEET_ID, "Call Source", apiKey).catch(() => [] as string[][]),
      fetchSheetValues(FUNNEL_SHEET_ID, "CALLS",       apiKey).catch(() => [] as string[][]),
      fetchSheetValues(FUNNEL_SHEET_ID, "LEADS",       apiKey).catch(() => [] as string[][]),
      fetchMetaSpend(level === "ad" ? "ad" : level, datePreset),
    ]);

    const usesCallSource = callSourceRows.length > 2;
    const callsMap  = usesCallSource
      ? aggregateCallSource(callSourceRows, groupBy)
      : aggregateCallsLegacy(callsLegacyRows);

    const leadsMap      = aggregateLeads(leadsRows);
    const callsKeys     = [...callsMap.keys()];
    const leadsKeys     = [...leadsMap.keys()];
    const metaConnected = !metaData.error && metaData.rows.length > 0;

    // ── Creative level: Call Source drives rows, Meta searched for spend ──
    if (level === "ad" && usesCallSource) {
      const rows: SourceRow[] = callsKeys.map((creativeName) => {
        const calls  = callsMap.get(creativeName)!;
        const leads  = matchKey(creativeName, leadsKeys)
          ? (leadsMap.get(matchKey(creativeName, leadsKeys)!) ?? 0)
          : 0;

        let spend  = 0;
        let status: string | undefined;
        if (metaConnected) {
          const m = sumMetaSpendForCreative(creativeName, metaData.rows);
          spend  = m.spend;
          status = m.status !== "UNKNOWN" ? m.status : undefined;
        }

        return buildRow(creativeName, spend, leads, calls, status);
      })
      // Filter noise: must have at least 1 booked call OR meaningful spend
      .filter((r) => r.bookedCalls >= 1 || r.spend >= 500)
      .sort((a, b) => b.bookedCalls - a.bookedCalls || b.spend - a.spend);

      return { rows, hasSpend: metaConnected, metaConnected, usesCallSource, level, datePreset, lastUpdated };
    }

    // ── Campaign / Ad Set: Meta drives rows, Call Source joined in ────────
    if (metaConnected) {
      const rows: SourceRow[] = metaData.rows.map((mr) => {
        const key   = matchKey(mr.name, callsKeys);
        const calls = key ? (callsMap.get(key) ?? null) : null;
        const leads = matchKey(mr.name, leadsKeys)
          ? (leadsMap.get(matchKey(mr.name, leadsKeys)!) ?? 0)
          : 0;
        return buildRow(mr.name, mr.spend, leads, calls, mr.status);
      }).sort((a, b) => b.spend - a.spend);

      return { rows, hasSpend: true, metaConnected: true, usesCallSource, level, datePreset, lastUpdated };
    }

    // ── Sheet-only fallback ───────────────────────────────────────────────
    const allKeys = new Set([...callsKeys, ...leadsKeys]);
    const rows: SourceRow[] = Array.from(allKeys)
      .map((key) => buildRow(key, 0, leadsMap.get(key) ?? 0, callsMap.get(key) ?? null))
      .filter((r) => r.bookedCalls > 0 || r.leads > 0)
      .sort((a, b) => b.bookedCalls - a.bookedCalls);

    return { rows, hasSpend: false, metaConnected: false, usesCallSource, level, datePreset, lastUpdated };
  } catch (err) {
    return {
      rows: [], hasSpend: false, metaConnected: false, usesCallSource: false,
      level, datePreset, lastUpdated,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
