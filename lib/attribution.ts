import { FUNNEL_SHEET_ID, fetchSheetValues } from "./funnel";
import { fetchCBOAdSpend } from "./meta";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreativeRow {
  adName: string;
  spend4d: number;
  spend7d: number;
  spend14d: number;
  spend30d: number;
  bookedCalls: number;
  shownAppointments: number;
  deals: number;
}

export interface CreativeAttribution {
  rows: CreativeRow[];
  error?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fi = (hdrs: string[], kws: string[]) =>
  hdrs.findIndex((h) => kws.every((k) => h.toLowerCase().includes(k.toLowerCase())));
const cv = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");
const toBool = (s: string) => {
  const u = s.toUpperCase().trim();
  return u === "TRUE" || u === "YES" || u === "1" || u === "X";
};

// "TOF 1002.1.7.3.1" → "1002.1.7.3.1"   "MBA | 1007.5" → "1007.5"
function normalizeCreativeName(name: string): string {
  let t = name.trim();
  const pipeIdx = t.indexOf(" | ");
  if (pipeIdx >= 0) return t.slice(pipeIdx + 3).trim();
  t = t.replace(/^[A-Z]{2,}\s+/, "");
  return t;
}

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

function parseSheetDate(s: string): Date | null {
  const parts = s.split("/");
  if (parts.length < 3) return null;
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  let y   = parseInt(parts[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (y < 100) y += 2000;
  return new Date(y, m - 1, d);
}

// ─── Call Source sheet parser (30-day window) ──────────────────────────────────

type CallEntry = { booked: number; shown: number; deals: number };

function parseCallSource(rows: string[][]): Map<string, CallEntry> {
  const map = new Map<string, CallEntry>();
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

  // 30-day window for calls
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 30);
  const until = new Date();
  until.setHours(23, 59, 59, 999);

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;
    if (bookedDateCol >= 0) {
      const d = parseSheetDate(cv(row, bookedDateCol));
      if (!d || d < since || d > until) continue;
    }
    const rawName = cv(row, adCol);
    if (!rawName) continue;
    const key = normalizeCreativeName(rawName) || rawName;
    if (!map.has(key)) map.set(key, { booked: 0, shown: 0, deals: 0 });
    const e = map.get(key)!;
    e.booked += 1;
    if (showedCol >= 0 && toBool(cv(row, showedCol))) e.shown += 1;
    const cash = parseFloat(cv(row, cashCol).replace(/[$,]/g, "")) || 0;
    if ((closedCol >= 0 && toBool(cv(row, closedCol))) || cash > 0) e.deals += 1;
  }

  return map;
}

// ─── Spend matcher ─────────────────────────────────────────────────────────────

function matchSpend(name: string, metaRows: { adName: string; spend: number }[]): number {
  const needle = normName(name);
  let total = 0;
  for (const m of metaRows) {
    const hay = normName(normalizeCreativeName(m.adName) || m.adName);
    if (hay.includes(needle) || needle.includes(hay)) total += m.spend;
  }
  return total;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function fetchCreativeAttribution(): Promise<CreativeAttribution> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";

  try {
    // Fetch all 4 Meta windows + Call Source sheet in parallel
    const [spend4d, spend7d, spend14d, spend30d, callSourceRows] = await Promise.all([
      fetchCBOAdSpend("4d"),
      fetchCBOAdSpend("7d"),
      fetchCBOAdSpend("14d"),
      fetchCBOAdSpend("month"),
      fetchSheetValues(FUNNEL_SHEET_ID, "Call Source", apiKey).catch(() => [] as string[][]),
    ]);

    const callsMap = parseCallSource(callSourceRows);

    // Union of all ad names across all windows + call source
    const allNames = new Set<string>([
      ...[...spend4d, ...spend7d, ...spend14d, ...spend30d].map(
        (r) => normalizeCreativeName(r.adName) || r.adName
      ),
      ...callsMap.keys(),
    ]);

    const rows: CreativeRow[] = [...allNames].map((name) => {
      const calls = (() => {
        if (callsMap.has(name)) return callsMap.get(name)!;
        const needle = normName(name);
        for (const [k, v] of callsMap) {
          const kn = normName(k);
          if (kn.includes(needle) || needle.includes(kn)) return v;
        }
        return null;
      })();

      return {
        adName:            name,
        spend4d:           matchSpend(name, spend4d),
        spend7d:           matchSpend(name, spend7d),
        spend14d:          matchSpend(name, spend14d),
        spend30d:          matchSpend(name, spend30d),
        bookedCalls:       calls?.booked ?? 0,
        shownAppointments: calls?.shown  ?? 0,
        deals:             calls?.deals  ?? 0,
      };
    })
    .filter((r) => r.spend30d > 0 || r.bookedCalls > 0)
    .sort((a, b) => b.spend30d - a.spend30d || b.bookedCalls - a.bookedCalls);

    return { rows };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : String(err) };
  }
}
