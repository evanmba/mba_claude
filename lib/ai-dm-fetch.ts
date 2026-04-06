/**
 * Data-fetching logic for the AI DM Setter analytics dashboard.
 *
 * Data sources (both use same SETTER_DASHBOARD_SHEET_ID):
 *   - "DATA" tab: rows have date columns for qualified lead, VSL sent, booked call
 *   - "AI_DM_EVENTS" tab: n8n appends one row per incoming conversation
 *
 * Required env vars:
 *   SETTER_DASHBOARD_SHEET_ID   — spreadsheet ID from the URL
 *   GOOGLE_SHEETS_API_KEY       — Google Sheets API v4 key
 */

export interface DailyMetrics {
  date: string;           // "YYYY-MM-DD"
  conversations: number;
  qualifiedLeads: number;
  linksSent: number;
  bookedCalls: number;
}

export interface AIDMDashboardData {
  daily: DailyMetrics[];  // last 30 days, sorted ascending (oldest → newest)
  lastFetched: string;
}

// ─── Sheet fetcher ─────────────────────────────────────────────────────────────

async function fetchSheetRange(
  sheetId: string,
  apiKey: string,
  sheetName: string,
  range: string,
  noCache = false,
): Promise<string[][]> {
  const encodedSheet = encodeURIComponent(`'${sheetName}'!${range}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedSheet}?key=${apiKey}`;
  try {
    const res = await fetch(
      url,
      noCache ? { cache: "no-store" } : { next: { revalidate: 300 } },
    );
    if (!res.ok) {
      console.warn(`[ai-dm] Sheet fetch failed for "${sheetName}" ${range}: ${res.status}`);
      return [];
    }
    const json = await res.json();
    return (json.values as string[][] | undefined) ?? [];
  } catch {
    console.warn(`[ai-dm] Sheet fetch network error for "${sheetName}" ${range}`);
    return [];
  }
}

// ─── Date parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a cell value to "YYYY-MM-DD". Handles:
 *   "M/D/YYYY", "M/D/YY", "YYYY-MM-DD", ISO timestamps
 * Returns null if the string is empty or unparseable.
 */
function parseDate(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Return a date N days before today as "YYYY-MM-DD" */
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Mock data (shown when sheet data is unavailable) ─────────────────────────

function generateMockData(): DailyMetrics[] {
  const result: DailyMetrics[] = [];
  // Build 30 days ending today
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);

    // Deterministic pseudo-random based on day offset
    const r = (salt: number) => {
      const x = Math.sin(i * 13.7 + salt * 97.3) * 10000;
      return x - Math.floor(x);
    };

    const conversations  = Math.round(85 + r(1) * 80);
    const qualifiedLeads = Math.round(conversations * (0.25 + r(2) * 0.15));
    const linksSent      = Math.round(qualifiedLeads * (0.40 + r(3) * 0.20));
    const bookedCalls    = Math.round(linksSent * (0.04 + r(4) * 0.09));

    result.push({ date, conversations, qualifiedLeads, linksSent, bookedCalls });
  }
  return result;
}

// ─── Aggregators ───────────────────────────────────────────────────────────────

// ─── Event types written by n8n ───────────────────────────────────────────────
// Column layout: A=Date(ISO) | B=Contact_ID | C=Event | D=Channel
// Event values:  "conversation_started" | "qualified" | "link_sent" | "booked"
// All 4 metrics come exclusively from the AI_DM_EVENTS tab.
// The DATA sheet is not read.

interface DayBucket {
  conversations: number;
  qualifiedLeads: number;
  linksSent: number;
  bookedCalls: number;
}

function emptyBucket(): DayBucket {
  return { conversations: 0, qualifiedLeads: 0, linksSent: 0, bookedCalls: 0 };
}

/** Aggregate all 4 event types from the AI_DM_EVENTS tab. */
function aggregateEventsSheet(
  rows: string[][],
  cutoff: string,
): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();

  const dataRows =
    rows[0] && (rows[0][2] ?? "").toLowerCase().includes("event")
      ? rows.slice(1)
      : rows;

  for (const row of dataRows) {
    const timestamp = (row[0] ?? "").trim();
    const event     = (row[2] ?? "").toLowerCase().trim();
    const dateStr   = parseDate(timestamp);
    if (!dateStr || dateStr < cutoff) continue;

    const bucket = map.get(dateStr) ?? emptyBucket();
    switch (event) {
      case "conversation_started": bucket.conversations++;  break;
      case "qualified":            bucket.qualifiedLeads++; break;
      case "link_sent":            bucket.linksSent++;      break;
      case "booked":               bucket.bookedCalls++;    break;
    }
    map.set(dateStr, bucket);
  }

  return map;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function getAIDMDashboardData(noCache = false): Promise<AIDMDashboardData> {
  const sheetId = process.env.SETTER_DASHBOARD_SHEET_ID ?? "";
  const apiKey  = process.env.GOOGLE_SHEETS_API_KEY ?? "";

  const cutoff = daysAgo(30); // only keep last 30 days

  // Build the 30-day date array (oldest → newest)
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    dates.push(daysAgo(i));
  }

  if (!sheetId || !apiKey) {
    return { daily: generateMockData(), lastFetched: "" };
  }

  // Fetch AI_DM_EVENTS — sole source of truth for all 4 metrics
  const eventRows = await fetchSheetRange(sheetId, apiKey, "AI_DM_EVENTS", "A:D", noCache);

  if (!eventRows.length) {
    return { daily: generateMockData(), lastFetched: "" };
  }

  const bucketMap = aggregateEventsSheet(eventRows, cutoff);

  const daily: DailyMetrics[] = dates.map((date) => {
    const b = bucketMap.get(date) ?? emptyBucket();
    return { date, ...b };
  });

  return {
    daily,
    lastFetched: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}
