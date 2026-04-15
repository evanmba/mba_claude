import { NextRequest } from "next/server";
import { fetchSheetValues, FUNNEL_SHEET_ID } from "@/lib/funnel";
import { normalizeAdName, parseLeadSource } from "@/lib/gradeLeads";
import type { AdWindow } from "@/lib/meta";

export const dynamic = "force-dynamic";

export interface DetailRecord {
  name:       string;
  date?:      string;  // lead date (leads) or booked date (calls)
  grade?:     string;  // leads only
  showed?:    boolean; // booked/taken/deals
  closed?:    boolean; // booked/taken/deals
  cash?:      number;  // deals
}

type DetailType = "leads" | "booked" | "taken" | "deals";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmtDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function windowDates(w: AdWindow): { since: Date; until: Date } {
  const days  = w === "7d" ? 7 : w === "14d" ? 14 : 30;
  const until = new Date(); until.setHours(23, 59, 59, 999);
  const since = new Date(); since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);
  return { since, until };
}

const toBool  = (s: string) => {
  const u = s.toUpperCase().trim();
  return u === "TRUE" || u === "YES" || u === "1" || u === "X";
};
const toMoney = (s: string) => parseFloat(s.replace(/[$,\s]/g, "")) || 0;
const fi      = (hdrs: string[], kws: string[]) =>
  hdrs.findIndex((h) => kws.every((k) => h.includes(k)));

function adNameMatches(rowAdName: string, target: string): boolean {
  // Mirror the table's exact key lookup: normalizeAdName(colG) === normalizeAdName(metaAdName).
  // No substring matching — avoids false positives like "1007.5" matching "1007.5.1".
  const normRow = normalizeAdName(rowAdName).toLowerCase();
  const normTgt = normalizeAdName(target).toLowerCase();
  return normRow === normTgt || rowAdName.toLowerCase() === target.toLowerCase();
}

// ─── Leads ────────────────────────────────────────────────────────────────────

async function fetchLeadDetail(
  adName: string,
  window: AdWindow,
  apiKey: string,
): Promise<DetailRecord[]> {
  const rows = await fetchSheetValues(FUNNEL_SHEET_ID, "LEADS", apiKey).catch(() => [] as string[][]);
  if (rows.length < 2) return [];

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().includes("first name")));
  if (hdrIdx < 0) return [];

  const hdrs     = rows[hdrIdx].map((h) => h.replace(/\n/g, " ").toLowerCase().trim());
  const firstCol = hdrs.findIndex((h) => h.includes("first name"));
  const lastCol  = hdrs.findIndex((h) => h.includes("last name"));
  const dateCol  = hdrs.findIndex((h) => h === "date");
  const srcCol   = hdrs.findIndex((h) => h === "source" || h.includes("source"));
  const gradeCol = hdrs.findIndex((h) => h.includes("grade"));

  if (srcCol < 0) return [];

  const { since, until } = windowDates(window);
  const results: DetailRecord[] = [];

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;

    const source = cv(row, srcCol);
    if (!source) continue;

    // Date filter
    let leadDate: Date | null = null;
    if (dateCol >= 0) {
      leadDate = parseSheetDate(cv(row, dateCol));
      if (!leadDate || leadDate < since || leadDate > until) continue;
    }

    // Ad name match
    const { adName: rowAdName } = parseLeadSource(source);
    if (!adNameMatches(rowAdName, adName)) continue;

    const firstName = cv(row, firstCol);
    const lastName  = lastCol >= 0 ? cv(row, lastCol) : "";
    const name      = [firstName, lastName].filter(Boolean).join(" ");
    const grade     = gradeCol >= 0 ? cv(row, gradeCol) : undefined;

    results.push({
      name,
      date:  leadDate ? fmtDate(leadDate) : undefined,
      grade: grade || undefined,
    });
  }

  return results;
}

// ─── Call Source ──────────────────────────────────────────────────────────────

async function fetchCallDetail(
  type: "booked" | "taken" | "deals",
  adName: string,
  window: AdWindow,
  apiKey: string,
): Promise<DetailRecord[]> {
  const rows = await fetchSheetValues(FUNNEL_SHEET_ID, "Call Source", apiKey).catch(() => [] as string[][]);
  if (rows.length < 2) return [];

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().includes("first name")));
  if (hdrIdx < 0) return [];

  const hdrs = rows[hdrIdx].map((h) => h.replace(/\n/g, " ").toLowerCase().trim());

  const firstCol  = hdrs.findIndex((h) => h.includes("first name"));
  const lastCol   = hdrs.findIndex((h) => h.includes("last name"));
  const dateCol   = hdrs.findIndex((h) => h.includes("booked date") || h === "date");
  const adCol     = hdrs.findIndex((h) => h === "ad");
  const _showCol  = hdrs.findIndex((h) => h === "showed" || h === "shown" || h.includes("show"));
  const closedCol = fi(hdrs, ["closed"]);
  const cashCol   = fi(hdrs, ["cash"]);
  const revCol    = fi(hdrs, ["revenue"]);

  const gCol      = adCol    >= 0 ? adCol    : 6;   // col G fallback
  const showedCol = _showCol >= 0 ? _showCol : 7;   // col H fallback

  const { since, until } = windowDates(window);
  const results: DetailRecord[] = [];

  for (const row of rows.slice(hdrIdx + 1)) {
    if (firstCol >= 0 && !cv(row, firstCol)) continue;

    // Date filter
    let bookedDate: Date | null = null;
    if (dateCol >= 0) {
      bookedDate = parseSheetDate(cv(row, dateCol));
      if (!bookedDate || bookedDate < since || bookedDate > until) continue;
    }

    // Ad name match (col G)
    const rowAd = cv(row, gCol);
    if (!adNameMatches(rowAd, adName)) continue;

    const showed  = toBool(cv(row, showedCol));
    const cash    = cashCol   >= 0 ? toMoney(cv(row, cashCol))   : 0;
    const closed  = closedCol >= 0 ? toBool(cv(row, closedCol))  : false;
    const isDeal  = closed || cash > 0;

    // Type-specific filter
    if (type === "taken" && !showed) continue;
    if (type === "deals" && !isDeal) continue;

    const firstName = cv(row, firstCol);
    const lastName  = lastCol >= 0 ? cv(row, lastCol) : "";
    const name      = [firstName, lastName].filter(Boolean).join(" ");

    results.push({
      name,
      date:   bookedDate ? fmtDate(bookedDate) : undefined,
      showed,
      closed,
      cash:   cash > 0 ? cash : undefined,
    });
  }

  return results;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const params  = req.nextUrl.searchParams;
  const type    = (params.get("type") ?? "") as DetailType;
  const adName  = params.get("adName") ?? "";
  const window  = (params.get("window") ?? "7d") as AdWindow;

  if (!type || !adName) {
    return Response.json({ error: "type and adName required" }, { status: 400 });
  }
  if (!["leads", "booked", "taken", "deals"].includes(type)) {
    return Response.json({ error: "type must be leads|booked|taken|deals" }, { status: 400 });
  }

  const apiKey = process.env.SHEETS_API_KEY
    ?? process.env.GOOGLE_SHEETS_API_KEY
    ?? process.env.GOOGLE_MASTER_SHEETS_API_KEY
    ?? "";

  try {
    let records: DetailRecord[];
    if (type === "leads") {
      records = await fetchLeadDetail(adName, window, apiKey);
    } else {
      records = await fetchCallDetail(type, adName, window, apiKey);
    }
    return Response.json(records);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
