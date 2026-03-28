import { toNum } from "./sheets";
import { FUNNEL_SHEET_ID, fetchSheetValues } from "./funnel";
import { fetchMetaSpend, MetaLevel, MetaInsightRow } from "./meta";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SourceRow {
  source: string;
  spend: number;
  bookedCalls: number;
  takenCalls: number;
  deals: number;
  cashCollected: number;
  revenue: number;
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
  usesCallSource: boolean;
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
const toBool = (s: string) => {
  const u = s.toUpperCase().trim();
  return u === "TRUE" || u === "YES" || u === "1" || u === "X";
};

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// "1002.1.7.3.1" → "1002"   "TOF Winners 1.0.0.2" → "TOF Winners"
function normalizeCreativeName(name: string): string {
  const t = name.trim();
  // Entire name is dotted numbers (e.g. "1002.1.7.3.1") — take first segment only
  if (/^\d+(\.\d+)+$/.test(t)) return t.split(".")[0];
  return t
    .replace(/\s+[-–]?\s*v\d+(\.\d+)*\s*$/i, "")
    .replace(/\s+\d+(\.\d+)+\s*$/, "")
    .replace(/\s*\(\s*v?\d+(\.\d+)*\s*\)\s*$/, "")
    .trim();
}

type CallEntry = { booked: number; taken: number; deals: number; cash: number; revenue: number };

// ---------------------------------------------------------------------------
// "Call Source" tab — groups by campaign / ad set / ad column
// Columns: first name, last name, booked date, ID, campaign, ad set, ad,
//          source, showed (col I), closed (col J), cash collected, revenue
// ---------------------------------------------------------------------------
function aggregateCallSource(
  rows: string[][],
  groupBy: "campaign" | "adset" | "ad",
): Map<string, CallEntry> {
  const map = new Map<string, CallEntry>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => /campaign|ad set|first name/i.test(c))
  );
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());

  // Pick the right key column
  let keyCol: number;
  if (groupBy === "campaign") {
    keyCol = fi(hdrs, ["campaign"]);
  } else if (groupBy === "adset") {
    keyCol = hdrs.findIndex((h) => h === "ad set" || h === "adset" || h === "ad set name");
    if (keyCol < 0) keyCol = fi(hdrs, ["ad set"]);
  } else {
    // "ad" — must not accidentally match "ad set"
    keyCol = hdrs.findIndex((h) => h === "ad" || h === "ad name");
    if (keyCol < 0) keyCol = hdrs.findIndex((h) => /^ad$/.test(h));
  }

  if (keyCol < 0) return map;

  const cols = {
    first:   fi(hdrs, ["first name"]),
    showed:  fi(hdrs, ["showed"]),
    closed:  fi(hdrs, ["closed"]),
    cash:    fi(hdrs, ["cash collected"]),
    revenue: fi(hdrs, ["revenue"]),
  };

  for (const row of rows.slice(hdrIdx + 1)) {
    if (cols.first >= 0 && !cv(row, cols.first)) continue;

    let key = cv(row, keyCol) || "Unknown";
    if (groupBy === "ad") key = normalizeCreativeName(key) || key;

    if (!map.has(key)) map.set(key, { booked: 0, taken: 0, deals: 0, cash: 0, revenue: 0 });
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
// Match name → sum spend from all Meta rows containing that name
// ---------------------------------------------------------------------------
function sumMetaSpend(
  name: string,
  metaRows: MetaInsightRow[],
): { spend: number; status: string } {
  const needle = normName(name);
  let spend = 0;
  let status = "UNKNOWN";
  for (const r of metaRows) {
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
// Build SourceRow
// ---------------------------------------------------------------------------
function buildRow(
  source: string,
  spend: number,
  c: CallEntry,
  metaStatus?: string,
): SourceRow {
  return {
    source,
    spend,
    bookedCalls:   c.booked,
    takenCalls:    c.taken,
    deals:         c.deals,
    cashCollected: c.cash,
    revenue:       c.revenue,
    costPerBooked: spend > 0 && c.booked > 0 ? spend / c.booked : 0,
    costPerTaken:  spend > 0 && c.taken  > 0 ? spend / c.taken  : 0,
    cpa:           spend > 0 && c.deals  > 0 ? spend / c.deals  : 0,
    cashRoas:      spend > 0 ? c.cash    / spend : 0,
    revenueRoas:   spend > 0 ? c.revenue / spend : 0,
    metaStatus,
  };
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
    const [callSourceRows, metaData] = await Promise.all([
      fetchSheetValues(FUNNEL_SHEET_ID, "Call Source", apiKey).catch(() => [] as string[][]),
      fetchMetaSpend(level === "ad" ? "ad" : level, datePreset),
    ]);

    const usesCallSource = callSourceRows.length > 2;
    if (!usesCallSource) {
      return { rows: [], hasSpend: false, metaConnected: false, usesCallSource: false, level, datePreset, lastUpdated, error: "Call Source tab not found or empty" };
    }

    const callsMap      = aggregateCallSource(callSourceRows, groupBy);
    const metaConnected = !metaData.error && metaData.rows.length > 0;

    const rows: SourceRow[] = [...callsMap.entries()].map(([name, calls]) => {
      let spend  = 0;
      let status: string | undefined;
      if (metaConnected) {
        const m = sumMetaSpend(name, metaData.rows);
        spend  = m.spend;
        status = m.status !== "UNKNOWN" ? m.status : undefined;
      }
      return buildRow(name, spend, calls, status);
    })
    .filter((r) => r.bookedCalls >= 1)
    .sort((a, b) => b.bookedCalls - a.bookedCalls || b.spend - a.spend);

    return { rows, hasSpend: metaConnected, metaConnected, usesCallSource, level, datePreset, lastUpdated };
  } catch (err) {
    return {
      rows: [], hasSpend: false, metaConnected: false, usesCallSource: false,
      level, datePreset, lastUpdated,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
