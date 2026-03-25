import { toNum, parseCSV } from "./sheets";

export const FUNNEL_SHEET_ID = "1c6rb9jAI1dJfuLZYxueBOTPxwhs-7Ud632S7MJ3GSIs";

// Published-to-web CSV URLs (File → Share → Publish to web → CSV per tab)
// These work without an API key and without the Sheets API being enabled.
const PUBLISHED_CSV: Record<string, string> = {
  "2026": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSC4-xQoouhaHtJkQ5OADfQ7BCnX9MDiQXAqRwiO9sD1Agmte1WwDsQ-3DGzQ6_bW-1nOYV_MX_Sggd/pub?output=csv&sheet=2026",
};

const MONTH_LABELS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
export function getCurrentMonthTab(): string {
  const now = new Date();
  return `${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`;
}
export function getPreviousMonthTab(): string {
  const now = new Date();
  const m = now.getMonth(); // 0-based
  const y = now.getFullYear();
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  return `${MONTH_LABELS[prevM]} ${prevY}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MonthlyRow {
  period: string;       // "4 Days" | "7 Days" | "14 Days" | "30 Days" | date string
  isRollup: boolean;
  amountSpent: number;
  frequency: number;
  reach: number;
  impressions: number;
  cpm: number;
  uniqueClicks: number;
  ctr: number;          // percent stored as-is: 1.05 = 1.05%
  costPerClick: number;
  leads: number;        // AgeQ Leads
  leadConv: number;     // AgeQ Lead Conversion %
  costPerLead: number;
  apps: number;
  appConv: number;
  costPerApp: number;
  bookedCalls: number;
  bookedConv: number;
  costPerBooked: number;
  takenCalls: number;
  showUpRate: number;   // percent
  costPerTaken: number;
  dealsClosed: number;
  closeRate: number;    // percent
  cash: number;
  revenue: number;
  cashRevRatio: number; // percent
  cashROAS: number;
  revenueROAS: number;
  cpa: number;
}

export interface SalesDashboard {
  frontEndRevenue: number;
  newCash: number;
  backEndRevenue: number;
  backEndCash: number;
  totalRevenue: number;
  totalCash: number;
  showRate: number;
  totalCallsBooked: number;
  offerRate: number;
  totalCancels: number;
  closeRate: number;
  totalCallsTaken: number;
  cashPerCall: number;
  totalOffers: number;
  revenuePerCall: number;
  totalCloses: number;
}

// ─── Scoreboard (2026 sheet, fixed column positions) ──────────────────────
// Column mapping (0-based index):
//   B=1  Amount Spent
//   J=9  Leads
//   M=12 Apps
//   O=14 $ Per Call
//   P=15 Taken Calls / Booked Calls
//   Q=16 Show Up Rate
//   U=20 Cash Collected
//   V=21 Deals Closed
//   W=22 Close Rate
//   AA=26 Cash ROAS
//   AB=27 Rev ROAS

export interface ScoreboardRow {
  month: string;
  amountSpent: number;   // B
  leads: number;         // J
  apps: number;          // M
  cashPerCall: number;   // O
  bookedCalls: number;   // P
  takenCalls: number;    // P
  showUpRate: number;    // Q
  cashCollected: number; // U
  dealsClosed: number;   // V
  closeRate: number;     // W
  cashROAS: number;      // AA
  revROAS: number;       // AB
}

export interface YTDRow {
  month: string;
  isSummary: boolean;
  amountSpent: number;
  frequency: number;
  reach: number;
  impressions: number;
  cpm: number;
  uniqueClicks: number;
  ctr: number;
  costPerClick: number;
  leads: number;
  optInConv: number;
  costPerLead: number;
  bookedCalls: number;
  leadToBookedRate: number;
  costPerBooked: number;
  takenCalls: number;
  showUpRate: number;
  costPerTaken: number;
  dealsClosed: number;
  closeRate: number;
  cash: number;
  revenue: number;
  cashRevRatio: number;
  cashROAS: number;
  revenueROAS: number;
  cpa: number;
  avgCashPerDeal: number;
  avgRevPerDeal: number;
}

export interface Lead {
  date: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  respondedNLT1: string;
  respondedNLT2: string;
  respondedNLT3: string;
  parentAthlete: string;
}

export interface Call {
  firstName: string;
  lastName: string;
  bookedDate: string;
  appointmentDate: string;
  email: string;
  phone: string;
  setter: string;
  closer: string;
  source: string;
  callConductedOn: string;
  callOutcome: string;
  canceled: boolean;
  noShow: boolean;
  showed: boolean;
  offered: boolean;
  fuBooked: boolean;
  fuBookedDate: string;
  fuScheduledDate: string;
  fuCanceled: boolean;
  fuNoShow: boolean;
  fuShowed: boolean;
  fuClosed: boolean;
  lostReason: string;
  mainObjection: string;
  depositAmount: number;
  closedDate: string;
  paymentPlanDetails: string;
  cashCollected: number;
  revenue: number;
  productTerm: string;
  internalNotes: string;
}

export interface Customer {
  firstName: string;
  lastName: string;
  term: string;
  joinDate: string;
  endDate: string;
  remainingDays: string;
  email: string;
  phone: string;
  setter: string;
  closer: string;
  cashCollected: number;
  revenue: number;
  internalNotes: string;
}

export interface FunnelData {
  monthly: MonthlyRow[];
  prevMonthly: MonthlyRow[];
  salesDashboard: SalesDashboard | null;
  ytd: YTDRow[];
  ytd2025: YTDRow[];
  scoreboard: ScoreboardRow[];
  leads: Lead[];
  calls: Call[];
  customers: Customer[];
  monthLabel: string;
  prevMonthLabel: string;
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────
// Uses Sheets API v4 — works for "Anyone with the link can view" sheets.
// In sandboxed environments, googleapis.com is excluded from the system proxy
// via NO_PROXY, so we explicitly route through HTTPS_PROXY when set.

async function makeProxyFetch(url: string): Promise<Response> {
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? "";
  if (proxyUrl) {
    try {
      const { ProxyAgent, fetch: undiciFetch } = await import("undici");
      const dispatcher = new ProxyAgent(proxyUrl);
      // @ts-expect-error undici fetch is compatible but types differ slightly
      return undiciFetch(url, { dispatcher }) as Promise<Response>;
    } catch {
      // fall through to native fetch
    }
  }
  return fetch(url, { cache: "no-store" } as RequestInit);
}

async function fetchSheetValues(
  spreadsheetId: string,
  sheetName: string,
  apiKey: string,
): Promise<string[][]> {
  // Prefer published CSV URL when available — no API key needed
  const csvUrl = PUBLISHED_CSV[sheetName];
  if (csvUrl) {
    try {
      const res = await fetch(csvUrl, { cache: "no-store" } as RequestInit);
      if (res.ok) {
        const text = await res.text();
        return parseCSV(text);
      }
      console.warn(`[funnel] CSV fetch for "${sheetName}" failed: ${res.status}`);
    } catch (err) {
      console.warn(`[funnel] CSV fetch for "${sheetName}" error:`, err);
    }
  }

  // Fall back to Sheets API v4
  const range = encodeURIComponent(`'${sheetName}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  const res = await makeProxyFetch(url);
  if (!res.ok) {
    console.warn(`[funnel] Sheet "${sheetName}" failed: ${res.status}`);
    return [];
  }
  const json = await res.json() as { values?: string[][] };
  return (json.values ?? []) as string[][];
}

// ─── Parsing helpers ───────────────────────────────────────────────────────

function fi(hdrs: string[], keywords: string[]): number {
  return hdrs.findIndex((h) =>
    keywords.every((k) => h.toLowerCase().includes(k.toLowerCase()))
  );
}

// Find the "deals closed" column — tries several common header variations.
function fideals(hdrs: string[]): number {
  return (
    fi(hdrs, ["deals closed"]) >= 0 ? fi(hdrs, ["deals closed"]) :
    fi(hdrs, ["deal closed"])  >= 0 ? fi(hdrs, ["deal closed"])  :
    fi(hdrs, ["deals"])        >= 0 ? fi(hdrs, ["deals"])        :
    fi(hdrs, ["closes"])       >= 0 ? fi(hdrs, ["closes"])       :
    -1
  );
}

const cv = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");

// ─── Monthly sheet parser ──────────────────────────────────────────────────

const ROLLUP_LABELS = new Set(["4 days", "7 days", "14 days", "30 days"]);
const DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;

function parseMonthly(rows: string[][]): { monthly: MonthlyRow[]; salesDashboard: SalesDashboard | null } {
  if (rows.length < 2) return { monthly: [], salesDashboard: null };

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.replace(/\n/g, " ").toLowerCase().includes("amount spent")));
  if (hdrIdx < 0) return { monthly: [], salesDashboard: null };

  const hdrs = rows[hdrIdx].map((h) => h.replace(/\n/g, " ").toLowerCase().trim());

  const cols = {
    spent:      fi(hdrs, ["amount", "spent"]),
    freq:       fi(hdrs, ["frequency"]),
    reach:      fi(hdrs, ["reach"]),
    impr:       fi(hdrs, ["impression"]),
    cpm:        hdrs.findIndex((h) => h.includes("cpm") || (h.includes("thousand") && h.includes("cost"))),
    clicks:     fi(hdrs, ["unique", "link", "click"]) >= 0
                  ? fi(hdrs, ["unique", "link", "click"])
                  : fi(hdrs, ["unique", "click"]),
    ctr:        fi(hdrs, ["click-through"]) >= 0 ? fi(hdrs, ["click-through"]) : fi(hdrs, ["ctr"]),
    costClick:  fi(hdrs, ["cost per unique link"]) >= 0 ? fi(hdrs, ["cost per unique link"]) : fi(hdrs, ["cost", "click"]),
    leads:      fi(hdrs, ["total ageq"]) >= 0 ? fi(hdrs, ["total ageq"]) : fi(hdrs, ["ageq", "lead"]),
    leadConv:   fi(hdrs, ["ageq lead conversion"]) >= 0 ? fi(hdrs, ["ageq lead conversion"]) : fi(hdrs, ["lead conversion"]),
    costLead:   fi(hdrs, ["cost per ageq"]) >= 0 ? fi(hdrs, ["cost per ageq"]) : fi(hdrs, ["cost", "lead"]),
    apps:       fi(hdrs, ["total apps"]) >= 0 ? fi(hdrs, ["total apps"]) : fi(hdrs, ["apps"]),
    appConv:    fi(hdrs, ["app conversion"]),
    costApp:    fi(hdrs, ["cost per app"]),
    booked:     fi(hdrs, ["booked calls"]),
    bookedConv: fi(hdrs, ["app-to-booked"]) >= 0 ? fi(hdrs, ["app-to-booked"])
               : fi(hdrs, ["lead-to-booked"]) >= 0 ? fi(hdrs, ["lead-to-booked"])
               : fi(hdrs, ["lead", "booked"]) >= 0 ? fi(hdrs, ["lead", "booked"])
               : fi(hdrs, ["booked conversion"]),
    costBooked: fi(hdrs, ["cost per booked"]) >= 0 ? fi(hdrs, ["cost per booked"]) : fi(hdrs, ["cost", "booked"]),
    taken:      fi(hdrs, ["taken calls"]) >= 0 ? fi(hdrs, ["taken calls"]) : fi(hdrs, ["calls taken"]),
    showUp:     fi(hdrs, ["show"]),
    costTaken:  fi(hdrs, ["cost per taken"]) >= 0 ? fi(hdrs, ["cost per taken"]) : fi(hdrs, ["cost", "taken"]),
    deals:      fideals(hdrs),
    closeRate:  fi(hdrs, ["close rate"]) >= 0 ? fi(hdrs, ["close rate"]) : fi(hdrs, ["closing rate"]),
    cash:       hdrs.findIndex((h) => h === "cash"),
    revenue:    hdrs.findIndex((h) => h === "revenue"),
    cashRev:    fi(hdrs, ["cash:revenue"]) >= 0 ? fi(hdrs, ["cash:revenue"]) : fi(hdrs, ["ratio"]),
    cashROAS:   fi(hdrs, ["cash", "return"]),
    revROAS:    fi(hdrs, ["revenue", "return"]),
    cpa:        fi(hdrs, ["cost per acquisition"]),
  };

  // If exact match didn't find cash/revenue, fall back
  if (cols.cash < 0) cols.cash = fi(hdrs, ["cash"]);
  if (cols.revenue < 0) cols.revenue = fi(hdrs, ["revenue"]);

  const monthly: MonthlyRow[] = [];
  let salesSection: string[][] = [];
  let inSales = false;

  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const cell0 = (row[0] ?? "").trim();
    // Column B ("Days") holds the period: "4 Days", "7 Days", "14 Days", "30 Days", or a date
    const cell1 = (row[1] ?? "").trim();
    // Use column B as period if it looks like a rollup/date, otherwise fall back to column A
    const period = (ROLLUP_LABELS.has(cell1.toLowerCase()) || DATE_RE.test(cell1)) ? cell1 : cell0;

    if (cell0.toLowerCase().includes("sales dashboard")) {
      inSales = true;
      continue;
    }
    if (inSales) {
      salesSection.push(row);
      continue;
    }

    const isRollup = ROLLUP_LABELS.has(period.toLowerCase());
    if (!isRollup && !DATE_RE.test(period)) continue;

    monthly.push({
      period,
      isRollup,
      amountSpent:  toNum(cv(row, cols.spent)),
      frequency:    toNum(cv(row, cols.freq)),
      reach:        toNum(cv(row, cols.reach)),
      impressions:  toNum(cv(row, cols.impr)),
      cpm:          toNum(cv(row, cols.cpm)),
      uniqueClicks: toNum(cv(row, cols.clicks)),
      ctr:          toNum(cv(row, cols.ctr)),
      costPerClick: toNum(cv(row, cols.costClick)),
      leads:        toNum(cv(row, cols.leads)),
      leadConv:     toNum(cv(row, cols.leadConv)),
      costPerLead:  toNum(cv(row, cols.costLead)),
      apps:         toNum(cv(row, cols.apps)),
      appConv:      toNum(cv(row, cols.appConv)),
      costPerApp:   toNum(cv(row, cols.costApp)),
      bookedCalls:  toNum(cv(row, cols.booked)),
      bookedConv:   toNum(cv(row, cols.bookedConv)),
      costPerBooked: toNum(cv(row, cols.costBooked)),
      takenCalls:   toNum(cv(row, cols.taken)),
      showUpRate:   toNum(cv(row, cols.showUp)),
      costPerTaken: toNum(cv(row, cols.costTaken)),
      dealsClosed:  toNum(cv(row, cols.deals)),
      closeRate:    toNum(cv(row, cols.closeRate)),
      cash:         toNum(cv(row, cols.cash)),
      revenue:      toNum(cv(row, cols.revenue)),
      cashRevRatio: toNum(cv(row, cols.cashRev)),
      cashROAS:     toNum(cv(row, cols.cashROAS)),
      revenueROAS:  toNum(cv(row, cols.revROAS)),
      cpa:          toNum(cv(row, cols.cpa)),
    });
  }

  return { monthly, salesDashboard: parseSalesDashboard(salesSection) };
}

function parseSalesDashboard(rows: string[][]): SalesDashboard | null {
  if (!rows.length) return null;

  // Build label → value map by scanning consecutive cells
  const flat: string[] = rows.flatMap((r) => r.map((c) => c.trim())).filter(Boolean);
  const kv: Record<string, string> = {};
  for (let i = 0; i < flat.length - 1; i++) {
    const raw = flat[i].replace(/[\s_%:]/g, "").toLowerCase();
    if (raw && isNaN(Number(flat[i]))) {
      kv[raw] = flat[i + 1];
    }
  }

  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (kv[k] !== undefined) return toNum(kv[k]);
    }
    return 0;
  };

  return {
    frontEndRevenue:  get("frontendrevenue"),
    newCash:          get("newcash"),
    backEndRevenue:   get("backendrevenue"),
    backEndCash:      get("backendcash"),
    totalRevenue:     get("totalrevenue"),
    totalCash:        get("totalcash"),
    showRate:         get("showrate"),
    totalCallsBooked: get("totalcallbooked", "totalcallsbooked"),
    offerRate:        get("offer"),
    totalCancels:     get("totalcancels"),
    closeRate:        get("close"),
    totalCallsTaken:  get("totalcallstaken"),
    cashPerCall:      get("cashpercall"),
    totalOffers:      get("totaloffers"),
    revenuePerCall:   get("revenuepercall"),
    totalCloses:      get("totalcloses"),
  };
}

// ─── Scoreboard parser (fixed column positions, with header-based fallback for deals) ──

function parseScoreboard(rows: string[][]): ScoreboardRow[] {
  // Try to find the header row so we can locate the deals column dynamically.
  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => c.replace(/\n/g, " ").toLowerCase().includes("amount spent"))
  );
  let dealsCol = 21; // default: column V
  if (hdrIdx >= 0) {
    const hdrs = rows[hdrIdx].map((h) => h.replace(/\n/g, " ").toLowerCase().trim());
    const found = fideals(hdrs);
    if (found >= 0) dealsCol = found;
  }

  const result: ScoreboardRow[] = [];
  for (const row of rows) {
    const label = (row[0] ?? "").trim().toLowerCase();
    if (!MONTH_NAMES.has(label)) continue;
    const g = (i: number) => toNum(row[i] ?? "");
    result.push({
      month:         (row[0] ?? "").trim(),
      amountSpent:   g(1),   // B
      leads:         g(9),   // J
      apps:          g(12),  // M
      cashPerCall:   g(18) > 0 ? g(23) / g(18) : 0,  // cash / takenCalls
      bookedCalls:   g(15),  // P
      takenCalls:    g(18),  // S
      showUpRate:    g(19),  // T
      cashCollected: g(23),  // X
      dealsClosed:   g(dealsCol),
      closeRate:     g(22),  // W
      cashROAS:      g(26),  // AA
      revROAS:       g(27),  // AB
    });
  }
  return result;
}

// ─── YTD sheet parser ──────────────────────────────────────────────────────

const MONTH_NAMES = new Set([
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
]);
const SUMMARY_LABELS = new Set(["monthly avg","monthly average","avg","average","sums","sum","total","totals"]);

function parseYTD(rows: string[][]): YTDRow[] {
  if (rows.length < 2) return [];

  const hdrIdx = rows.findIndex((r) => r.some((c) => c.replace(/\n/g, " ").toLowerCase().includes("amount spent")));
  if (hdrIdx < 0) return [];

  const hdrs = rows[hdrIdx].map((h) => h.replace(/\n/g, " ").toLowerCase().trim());

  const cols = {
    spent:     fi(hdrs, ["amount", "spent"]),
    freq:      fi(hdrs, ["frequency"]),
    reach:     fi(hdrs, ["reach"]),
    impr:      fi(hdrs, ["impression"]),
    cpm:       hdrs.findIndex((h) => h.includes("cpm") || h.includes("thousand")),
    clicks:    fi(hdrs, ["unique", "link", "click"]),
    ctr:       fi(hdrs, ["click-through"]) >= 0 ? fi(hdrs, ["click-through"]) : fi(hdrs, ["ctr"]),
    costClick: fi(hdrs, ["cost per unique"]),
    leads:     hdrs.findIndex((h) => h === "leads"),
    optIn:     fi(hdrs, ["opt-in"]),
    costLead:  fi(hdrs, ["cost per lead"]),
    booked:    fi(hdrs, ["booked calls"]),
    leadBooked: fi(hdrs, ["lead-to-booked"]) >= 0 ? fi(hdrs, ["lead-to-booked"])
               : fi(hdrs, ["app-to-booked"]) >= 0 ? fi(hdrs, ["app-to-booked"])
               : fi(hdrs, ["lead", "booked"]),
    costBooked: fi(hdrs, ["cost per booked"]),
    taken:     fi(hdrs, ["taken calls"]),
    showUp:    fi(hdrs, ["show"]),
    costTaken: fi(hdrs, ["cost per taken"]) >= 0 ? fi(hdrs, ["cost per taken"]) : fi(hdrs, ["cost", "taken"]),
    deals:     fideals(hdrs),
    closeRate: fi(hdrs, ["close rate"]) >= 0 ? fi(hdrs, ["close rate"]) : fi(hdrs, ["closing rate"]),
    cash:      hdrs.findIndex((h) => h === "cash"),
    revenue:   hdrs.findIndex((h) => h === "revenue"),
    cashRev:   fi(hdrs, ["cash:revenue"]) >= 0 ? fi(hdrs, ["cash:revenue"]) : fi(hdrs, ["ratio"]),
    cashROAS:  fi(hdrs, ["cash", "return"]),
    revROAS:   fi(hdrs, ["revenue", "return"]),
    cpa:       fi(hdrs, ["cost per acquisition"]),
    avgCash:   fi(hdrs, ["avg cash"]),
    avgRev:    fi(hdrs, ["avg rev"]),
  };

  if (cols.cash < 0) cols.cash = fi(hdrs, ["cash"]);
  if (cols.revenue < 0) cols.revenue = fi(hdrs, ["revenue"]);

  const result: YTDRow[] = [];

  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const month = (row[0] ?? "").trim();
    if (!month) continue;

    const monthLow = month.toLowerCase();
    const isMonth = MONTH_NAMES.has(monthLow);
    const isSummary = !isMonth && SUMMARY_LABELS.has(monthLow);
    if (!isMonth && !isSummary) continue;

    result.push({
      month,
      isSummary,
      amountSpent:    toNum(cv(row, cols.spent)),
      frequency:      toNum(cv(row, cols.freq)),
      reach:          toNum(cv(row, cols.reach)),
      impressions:    toNum(cv(row, cols.impr)),
      cpm:            toNum(cv(row, cols.cpm)),
      uniqueClicks:   toNum(cv(row, cols.clicks)),
      ctr:            toNum(cv(row, cols.ctr)),
      costPerClick:   toNum(cv(row, cols.costClick)),
      leads:          toNum(cv(row, cols.leads)),
      optInConv:      toNum(cv(row, cols.optIn)),
      costPerLead:    toNum(cv(row, cols.costLead)),
      bookedCalls:    toNum(cv(row, cols.booked)),
      leadToBookedRate: toNum(cv(row, cols.leadBooked)),
      costPerBooked:  toNum(cv(row, cols.costBooked)),
      takenCalls:     toNum(cv(row, cols.taken)),
      showUpRate:     toNum(cv(row, cols.showUp)),
      costPerTaken:   toNum(cv(row, cols.costTaken)),
      dealsClosed:    toNum(cv(row, cols.deals)),
      closeRate:      toNum(cv(row, cols.closeRate)),
      cash:           toNum(cv(row, cols.cash)),
      revenue:        toNum(cv(row, cols.revenue)),
      cashRevRatio:   toNum(cv(row, cols.cashRev)),
      cashROAS:       toNum(cv(row, cols.cashROAS)),
      revenueROAS:    toNum(cv(row, cols.revROAS)),
      cpa:            toNum(cv(row, cols.cpa)),
      avgCashPerDeal: toNum(cv(row, cols.avgCash)),
      avgRevPerDeal:  toNum(cv(row, cols.avgRev)),
    });
  }

  return result;
}

// ─── Leads sheet parser ────────────────────────────────────────────────────

function parseLeads(rows: string[][]): Lead[] {
  if (rows.length < 2) return [];

  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => c.toLowerCase().includes("first name"))
  );
  if (hdrIdx < 0) return [];

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const cols = {
    date:    fi(hdrs, ["date"]),
    first:   fi(hdrs, ["first name"]),
    last:    fi(hdrs, ["last name"]),
    email:   fi(hdrs, ["email"]),
    phone:   fi(hdrs, ["phone"]),
    source:  fi(hdrs, ["source"]),
    nlt1:    fi(hdrs, ["nlt1"]),
    nlt2:    fi(hdrs, ["nlt2"]),
    nlt3:    fi(hdrs, ["nlt3"]),
    parent:  fi(hdrs, ["parent"]),
  };

  return rows.slice(hdrIdx + 1).flatMap((row) => {
    const first = cv(row, cols.first);
    if (!first) return [];
    return [{
      date:          cv(row, cols.date),
      firstName:     first,
      lastName:      cv(row, cols.last),
      email:         cv(row, cols.email),
      phone:         cv(row, cols.phone),
      source:        cv(row, cols.source),
      respondedNLT1: cv(row, cols.nlt1),
      respondedNLT2: cv(row, cols.nlt2),
      respondedNLT3: cv(row, cols.nlt3),
      parentAthlete: cv(row, cols.parent),
    }];
  });
}

// ─── Calls sheet parser ────────────────────────────────────────────────────

function parseCalls(rows: string[][]): Call[] {
  if (rows.length < 2) return [];

  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => c.toLowerCase().includes("booked date"))
  );
  if (hdrIdx < 0) return [];

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const cols = {
    first:       fi(hdrs, ["first name"]),
    last:        fi(hdrs, ["last name"]),
    bookedDate:  fi(hdrs, ["booked date"]),
    apptDate:    fi(hdrs, ["appointment date"]),
    email:       fi(hdrs, ["email"]),
    phone:       fi(hdrs, ["phone"]),
    setter:      fi(hdrs, ["setter"]),
    closer:      fi(hdrs, ["closer"]),
    source:      fi(hdrs, ["source"]),
    conducted:   fi(hdrs, ["conducted"]),
    outcome:     fi(hdrs, ["call outcome"]),
    canceled:    fi(hdrs, ["canceled"]),
    noShow:      fi(hdrs, ["no show"]),
    showed:      fi(hdrs, ["showed"]),
    offered:     fi(hdrs, ["offered"]),
    fuBooked:    fi(hdrs, ["fu booked"]),
    fuBookedDate: fi(hdrs, ["fu - booked"]),
    fuScheduled: fi(hdrs, ["fu - scheduled"]),
    fuCanceled:  fi(hdrs, ["fu - canceled"]),
    fuNoShow:    fi(hdrs, ["fu - no show"]),
    fuShowed:    fi(hdrs, ["fu - showed"]),
    fuClosed:    fi(hdrs, ["fu - closed"]),
    lostReason:  fi(hdrs, ["lost reason"]),
    objection:   fi(hdrs, ["objection"]),
    deposit:     fi(hdrs, ["deposit"]),
    closedDate:  fi(hdrs, ["closed date"]),
    payPlan:     fi(hdrs, ["payment plan"]),
    cash:        fi(hdrs, ["cash collected"]),
    revenue:     fi(hdrs, ["revenue"]),
    product:     fi(hdrs, ["product"]),
    notes:       fi(hdrs, ["internal notes"]),
  };

  const toBool = (s: string) => {
    const u = s.toUpperCase().trim();
    return u === "TRUE" || u === "YES" || u === "1";
  };

  return rows.slice(hdrIdx + 1).flatMap((row) => {
    const first = cv(row, cols.first);
    if (!first) return [];
    return [{
      firstName:       first,
      lastName:        cv(row, cols.last),
      bookedDate:      cv(row, cols.bookedDate),
      appointmentDate: cv(row, cols.apptDate),
      email:           cv(row, cols.email),
      phone:           cv(row, cols.phone),
      setter:          cv(row, cols.setter),
      closer:          cv(row, cols.closer),
      source:          cv(row, cols.source),
      callConductedOn: cv(row, cols.conducted),
      callOutcome:     cv(row, cols.outcome),
      canceled:        toBool(cv(row, cols.canceled)),
      noShow:          toBool(cv(row, cols.noShow)),
      showed:          toBool(cv(row, cols.showed)),
      offered:         toBool(cv(row, cols.offered)),
      fuBooked:        toBool(cv(row, cols.fuBooked)),
      fuBookedDate:    cv(row, cols.fuBookedDate),
      fuScheduledDate: cv(row, cols.fuScheduled),
      fuCanceled:      toBool(cv(row, cols.fuCanceled)),
      fuNoShow:        toBool(cv(row, cols.fuNoShow)),
      fuShowed:        toBool(cv(row, cols.fuShowed)),
      fuClosed:        toBool(cv(row, cols.fuClosed)),
      lostReason:      cv(row, cols.lostReason),
      mainObjection:   cv(row, cols.objection),
      depositAmount:   toNum(cv(row, cols.deposit)),
      closedDate:      cv(row, cols.closedDate),
      paymentPlanDetails: cv(row, cols.payPlan),
      cashCollected:   toNum(cv(row, cols.cash)),
      revenue:         toNum(cv(row, cols.revenue)),
      productTerm:     cv(row, cols.product),
      internalNotes:   cv(row, cols.notes),
    }];
  });
}

// ─── Customers sheet parser ────────────────────────────────────────────────

function parseCustomers(rows: string[][]): Customer[] {
  if (rows.length < 2) return [];

  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => c.toLowerCase().includes("join date"))
  );
  if (hdrIdx < 0) return [];

  const hdrs = rows[hdrIdx].map((h) => h.toLowerCase().trim());
  const cols = {
    first:    fi(hdrs, ["first name"]),
    last:     fi(hdrs, ["last name"]),
    term:     fi(hdrs, ["term"]),
    joinDate: fi(hdrs, ["join date"]),
    endDate:  fi(hdrs, ["end date"]),
    remaining: fi(hdrs, ["remaining"]),
    email:    fi(hdrs, ["email"]),
    phone:    fi(hdrs, ["phone"]),
    setter:   fi(hdrs, ["appointment setter"]),
    closer:   fi(hdrs, ["closer"]),
    cash:     fi(hdrs, ["cash collected"]),
    revenue:  fi(hdrs, ["revenue"]),
    notes:    fi(hdrs, ["internal notes"]),
  };

  return rows.slice(hdrIdx + 1).flatMap((row) => {
    const first = cv(row, cols.first);
    if (!first) return [];
    return [{
      firstName:    first,
      lastName:     cv(row, cols.last),
      term:         cv(row, cols.term),
      joinDate:     cv(row, cols.joinDate),
      endDate:      cv(row, cols.endDate),
      remainingDays: cv(row, cols.remaining),
      email:        cv(row, cols.email),
      phone:        cv(row, cols.phone),
      setter:       cv(row, cols.setter),
      closer:       cv(row, cols.closer),
      cashCollected: toNum(cv(row, cols.cash)),
      revenue:      toNum(cv(row, cols.revenue)),
      internalNotes: cv(row, cols.notes),
    }];
  });
}

// ─── Public fetch function ─────────────────────────────────────────────────

export async function fetchFunnelData(apiKey: string): Promise<FunnelData> {
  const monthLabel = getCurrentMonthTab();
  const prevMonthLabel = getPreviousMonthTab();

  const [monthlyRows, prevMonthlyRows, ytdRows, ytd2025Rows, leadsRows, callsRows, customersRows] = await Promise.all([
    fetchSheetValues(FUNNEL_SHEET_ID, monthLabel, apiKey),
    fetchSheetValues(FUNNEL_SHEET_ID, prevMonthLabel, apiKey),
    fetchSheetValues(FUNNEL_SHEET_ID, "2026", apiKey),
    fetchSheetValues(FUNNEL_SHEET_ID, "2025", apiKey),
    fetchSheetValues(FUNNEL_SHEET_ID, "LEADS", apiKey),
    fetchSheetValues(FUNNEL_SHEET_ID, "CALLS", apiKey),
    fetchSheetValues(FUNNEL_SHEET_ID, "CUSTOMERS", apiKey),
  ]);

  const { monthly, salesDashboard } = parseMonthly(monthlyRows);
  const { monthly: prevMonthly } = parseMonthly(prevMonthlyRows);

  return {
    monthly,
    prevMonthly,
    salesDashboard,
    ytd:        parseYTD(ytdRows),
    ytd2025:    parseYTD(ytd2025Rows),
    scoreboard: parseScoreboard(ytdRows),
    leads:      parseLeads(leadsRows),
    calls:      parseCalls(callsRows),
    customers:  parseCustomers(customersRows),
    monthLabel,
    prevMonthLabel,
  };
}
