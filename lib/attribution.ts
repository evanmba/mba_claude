import { fetchAdSpendByIds, AdWindow } from "./meta";
import { FUNNEL_SHEET_ID, fetchSheetValues } from "./funnel";

// ─── The 3 tracked ad creatives ───────────────────────────────────────────────
// callPattern must match the normalized ad name EXACTLY — "1007.5" will NOT
// match "1007.5.42". Normalization strips leading prefixes like "TOF ", "CBO ",
// or "MBA | " before comparing.

const TRACKED_ADS = [
  { id: "120247302027810699", label: "1002.1.7.3.4", callPattern: "1002.1.7.3.4" },
  { id: "120247302027770699", label: "1009.6.1.2",   callPattern: "1009.6.1.2"   },
  { id: "120246732664910699", label: "1007.5",        callPattern: "1007.5"       },
] as const;

const AD_IDS = TRACKED_ADS.map((a) => a.id);

export type { AdWindow };

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreativeSpend {
  label: string;
  adName: string;
  spend: number;
  bookedCalls: number;
  takenCalls: number;
  deals: number;
  leads: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fi = (hdrs: string[], kws: string[]) =>
  hdrs.findIndex((h) => kws.every((k) => h.toLowerCase().includes(k.toLowerCase())));
const cv = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");
const toBool = (s: string) => { const u = s.toUpperCase().trim(); return u === "TRUE" || u === "YES" || u === "1" || u === "X"; };

function normalizeName(name: string): string {
  const pipeIdx = name.indexOf(" | ");
  if (pipeIdx >= 0) return name.slice(pipeIdx + 3).trim();
  return name.trim().replace(/^[A-Z]{2,}\s+/, "");
}

function parseSheetDate(s: string): Date | null {
  const parts = s.split("/");
  if (parts.length < 3) return null;
  const m = parseInt(parts[0], 10), d = parseInt(parts[1], 10);
  let y = parseInt(parts[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (y < 100) y += 2000;
  return new Date(y, m - 1, d);
}

function windowDates(window: AdWindow): { since: Date; until: Date } {
  const days  = window === "7d" ? 7 : window === "14d" ? 14 : 30;
  const until = new Date(); until.setHours(23, 59, 59, 999);
  const since = new Date(); since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);
  return { since, until };
}

// ─── Leads sheet parser ───────────────────────────────────────────────────────

function parseLeadsSource(
  rows: string[][],
  since: Date,
  until: Date,
): Map<string, number> {
  const map = new Map<string, number>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => c.toLowerCase().includes("first name"))
  );
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const dateCol   = fi(hdrs, ["date"]);
  const sourceCol = fi(hdrs, ["source"]);
  const firstCol  = fi(hdrs, ["first name"]);

  if (sourceCol < 0) return map;

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;
    if (dateCol >= 0) {
      const d = parseSheetDate(cv(row, dateCol));
      if (!d || d < since || d > until) continue;
    }
    const source = cv(row, sourceCol);
    if (!source) continue;
    const normalizedSource = normalizeName(source).toLowerCase();

    for (const { callPattern } of TRACKED_ADS) {
      const pat = callPattern.toLowerCase();
      if (normalizedSource === pat || source.toLowerCase() === pat) {
        map.set(callPattern, (map.get(callPattern) ?? 0) + 1);
      }
    }
  }
  return map;
}

// ─── Call Source parser ────────────────────────────────────────────────────────

type CallCounts = { booked: number; taken: number; deals: number };

function parseCallSource(
  rows: string[][],
  since: Date,
  until: Date,
): Map<string, CallCounts> {
  const map = new Map<string, CallCounts>();
  if (rows.length < 2) return map;

  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => /campaign|ad set|first name|booked date/i.test(c))
  );
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());

  let adCol = hdrs.findIndex((h) => h === "ad" || h === "ad name");
  if (adCol < 0) adCol = fi(hdrs, ["ad"]);
  if (adCol < 0) adCol = fi(hdrs, ["source"]);
  if (adCol < 0) return map;

  const bookedDateCol = fi(hdrs, ["booked date"]);
  const firstCol      = fi(hdrs, ["first name"]);
  const showedCol     = fi(hdrs, ["showed"]);
  const closedCol     = fi(hdrs, ["closed"]);
  const cashCol       = fi(hdrs, ["cash collected"]);

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;
    if (bookedDateCol >= 0) {
      const d = parseSheetDate(cv(row, bookedDateCol));
      if (!d || d < since || d > until) continue;
    }
    const rawName = cv(row, adCol);
    if (!rawName) continue;
    const normalized = normalizeName(rawName).toLowerCase();

    // Exact match only — "1007.5" will NOT match "1007.5.42"
    for (const { callPattern } of TRACKED_ADS) {
      const pat = callPattern.toLowerCase();
      if (normalized === pat || rawName.toLowerCase() === pat) {
        if (!map.has(callPattern)) map.set(callPattern, { booked: 0, taken: 0, deals: 0 });
        const e = map.get(callPattern)!;
        e.booked += 1;
        if (showedCol >= 0 && toBool(cv(row, showedCol))) e.taken += 1;
        const cash = parseFloat(cv(row, cashCol).replace(/[$,]/g, "")) || 0;
        if ((closedCol >= 0 && toBool(cv(row, closedCol))) || cash > 0) e.deals += 1;
      }
    }
  }
  return map;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export interface CreativeSpendResult {
  cards: CreativeSpend[];
  metaError?: string;
}

export async function fetchMainCreativeSpend(window: AdWindow): Promise<CreativeSpendResult> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
  const { since, until } = windowDates(window);

  let spendRows: { adId: string; adName: string; spend: number }[] = [];
  let metaError: string | undefined;

  try {
    spendRows = await fetchAdSpendByIds(AD_IDS, window);
  } catch (e) {
    metaError = e instanceof Error ? e.message : String(e);
  }

  const [callSourceRows, leadsRows] = await Promise.all([
    fetchSheetValues(FUNNEL_SHEET_ID, "Call Source", apiKey).catch(() => [] as string[][]),
    fetchSheetValues(FUNNEL_SHEET_ID, "LEADS", apiKey).catch(() => [] as string[][]),
  ]);

  const spendById = new Map(spendRows.map((r) => [r.adId, r]));
  const callsMap  = parseCallSource(callSourceRows, since, until);
  const leadsMap  = parseLeadsSource(leadsRows, since, until);

  const cards = TRACKED_ADS.map(({ id, label, callPattern }) => {
    const meta  = spendById.get(id);
    const calls = callsMap.get(callPattern);
    return {
      label,
      adName:      meta?.adName ?? label,
      spend:       meta?.spend  ?? 0,
      bookedCalls: calls?.booked ?? 0,
      takenCalls:  calls?.taken  ?? 0,
      deals:       calls?.deals  ?? 0,
      leads:       leadsMap.get(callPattern) ?? 0,
    };
  });

  return { cards, metaError };
}
