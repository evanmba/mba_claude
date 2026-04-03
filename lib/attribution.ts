import { FUNNEL_SHEET_ID, fetchSheetValues } from "./funnel";
import { fetchCBOAdSpend, AdWindow } from "./meta";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreativeRow {
  adName: string;
  spend: number;
  bookedCalls: number;
  shownAppointments: number;
  deals: number;
}

export interface CreativeAttribution {
  rows: CreativeRow[];
  windowLabel: string;
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
  // Strip "PREFIX | identifier" → keep identifier
  const pipeIdx = t.indexOf(" | ");
  if (pipeIdx >= 0) return t.slice(pipeIdx + 3).trim();
  // Strip leading all-caps abbreviation (TOF, CBO, MBA, etc.) before anything
  // "TOF Blurred Email" → "Blurred Email"  "TOF 1002.1.7.3.1" → "1002.1.7.3.1"
  t = t.replace(/^[A-Z]{2,}\s+/, "");
  return t;
}

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// Parse "M/D/YY" or "M/D/YYYY" → Date (midnight local). Returns null on failure.
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

// Compute [sinceDate, untilDate] for the window (inclusive, local midnight).
function windowDates(window: AdWindow): { since: Date; until: Date } {
  const until = new Date();
  until.setHours(23, 59, 59, 999);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const days = window === "4d" ? 4 : window === "7d" ? 7 : window === "14d" ? 14 : 30;
  since.setDate(since.getDate() - days);
  return { since, until };
}

const WINDOW_LABELS: Record<AdWindow, string> = {
  "4d": "Last 4 Days", "7d": "Last 7 Days", "14d": "Last 14 Days", "month": "Last 30 Days",
};

// ─── Call Source sheet parser ──────────────────────────────────────────────────

type CallEntry = { booked: number; shown: number; deals: number };

function parseCallSource(
  rows: string[][],
  since: Date,
  until: Date,
): Map<string, CallEntry> {
  const map = new Map<string, CallEntry>();
  if (rows.length < 2) return map;

  // Find header row
  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => /campaign|ad set|first name|booked date/i.test(c))
  );
  if (hdrIdx < 0) return map;

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());

  // Ad creative column: look for exact "ad" first, then "ad name", fallback "source"
  let adCol = hdrs.findIndex((h) => h === "ad" || h === "ad name");
  if (adCol < 0) adCol = fi(hdrs, ["ad"]);
  if (adCol < 0) adCol = fi(hdrs, ["source"]);

  const bookedDateCol = fi(hdrs, ["booked date"]);
  const firstCol      = fi(hdrs, ["first name"]);
  const showedCol     = fi(hdrs, ["showed"]);
  const closedCol     = fi(hdrs, ["closed"]);
  const cashCol       = fi(hdrs, ["cash collected"]);

  if (adCol < 0) return map;

  for (const row of rows.slice(hdrIdx + 1)) {
    // Require a name entry so empty rows are skipped
    if (firstCol >= 0 && !cv(row, firstCol)) continue;

    // Date filter
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

// ─── Main export ───────────────────────────────────────────────────────────────

export async function fetchCreativeAttribution(
  window: AdWindow,
): Promise<CreativeAttribution> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
  const { since, until } = windowDates(window);
  const windowLabel = WINDOW_LABELS[window];

  try {
    const [callSourceRows, metaSpend] = await Promise.all([
      fetchSheetValues(FUNNEL_SHEET_ID, "Call Source", apiKey).catch(() => [] as string[][]),
      fetchCBOAdSpend(window),
    ]);

    const callsMap = parseCallSource(callSourceRows, since, until);

    // Build a combined set of ad names from both Meta and calls
    const allNames = new Set<string>([
      ...metaSpend.map((r) => normalizeCreativeName(r.adName) || r.adName),
      ...callsMap.keys(),
    ]);

    const rows: CreativeRow[] = [...allNames].map((name) => {
      // Sum Meta spend for this creative (bidirectional substring match after normalization)
      const needle = normName(name);
      let spend = 0;
      for (const m of metaSpend) {
        const hay = normName(normalizeCreativeName(m.adName) || m.adName);
        if (hay.includes(needle) || needle.includes(hay)) spend += m.spend;
      }

      // Find calls entry — try exact key first, then normalized match
      let calls = callsMap.get(name);
      if (!calls) {
        for (const [k, v] of callsMap) {
          const kn = normName(k);
          if (kn.includes(needle) || needle.includes(kn)) { calls = v; break; }
        }
      }

      return {
        adName:            name,
        spend,
        bookedCalls:       calls?.booked ?? 0,
        shownAppointments: calls?.shown  ?? 0,
        deals:             calls?.deals  ?? 0,
      };
    })
    // Only show rows that have spend OR at least 1 booked call
    .filter((r) => r.spend > 0 || r.bookedCalls > 0)
    .sort((a, b) => b.spend - a.spend || b.bookedCalls - a.bookedCalls);

    return { rows, windowLabel };
  } catch (err) {
    return {
      rows: [],
      windowLabel,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
