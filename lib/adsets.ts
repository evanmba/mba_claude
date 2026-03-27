import { toNum, parseCSV } from "./sheets";
import { FUNNEL_SHEET_ID } from "./funnel";

export const AD_SETS_TAB = "AD SETS";

// Published CSV URL — add this once you publish the "AD SETS" tab:
//   File → Share → Publish to web → Sheet: "AD SETS" → CSV → Copy URL → set as AD_SETS_CSV_URL env var
const AD_SETS_CSV_URL = process.env.AD_SETS_CSV_URL ?? "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AdSetRow {
  name: string;
  spend: number;
  leads: number;
  costPerLead: number;
  bookedCalls: number;
  costPerBooked: number;
  takenCalls: number;
  costPerTaken: number;
  showUpRate: number;    // %
  deals: number;
  closeRate: number;     // %
  cpa: number;
  cash: number;
  revenue: number;
  cashRoas: number;
  revenueRoas: number;
}

export interface AdSetsData {
  rows: AdSetRow[];
  lastUpdated: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fi(hdrs: string[], keywords: string[]): number {
  return hdrs.findIndex((h) =>
    keywords.every((k) => h.toLowerCase().includes(k.toLowerCase()))
  );
}
const cv = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
function parseAdSets(rows: string[][]): AdSetRow[] {
  if (rows.length < 2) return [];

  // Find header row — look for "ad set" or "name" or "spend"
  const hdrIdx = rows.findIndex((r) =>
    r.some((c) => {
      const l = c.toLowerCase();
      return l.includes("ad set") || l.includes("spend") || l.includes("campaign");
    })
  );
  if (hdrIdx < 0) return [];

  const hdrs = rows[hdrIdx].map((h) => h.replace(/\n/g, " ").toLowerCase().trim());

  const cols = {
    name:         fi(hdrs, ["ad set"])  >= 0 ? fi(hdrs, ["ad set"])  :
                  fi(hdrs, ["campaign"]) >= 0 ? fi(hdrs, ["campaign"]) :
                  fi(hdrs, ["name"])    >= 0 ? fi(hdrs, ["name"])    : 0,
    spend:        fi(hdrs, ["spend"]) >= 0 ? fi(hdrs, ["spend"]) : fi(hdrs, ["amount spent"]),
    leads:        fi(hdrs, ["leads"]),
    cpl:          fi(hdrs, ["cost per lead"]) >= 0 ? fi(hdrs, ["cost per lead"]) : fi(hdrs, ["cpl"]),
    booked:       fi(hdrs, ["booked"]),
    costBooked:   fi(hdrs, ["cost per booked"]) >= 0 ? fi(hdrs, ["cost per booked"]) : fi(hdrs, ["cost", "booked"]),
    taken:        fi(hdrs, ["taken"]),
    costTaken:    fi(hdrs, ["cost per taken"]) >= 0 ? fi(hdrs, ["cost per taken"]) : fi(hdrs, ["cost", "taken"]),
    showUp:       fi(hdrs, ["show"]),
    deals:        fi(hdrs, ["deals"]) >= 0 ? fi(hdrs, ["deals"]) : fi(hdrs, ["closed"]),
    closeRate:    fi(hdrs, ["close rate"]),
    cpa:          fi(hdrs, ["cpa"]) >= 0 ? fi(hdrs, ["cpa"]) : fi(hdrs, ["cost per acquisition"]),
    cash:         fi(hdrs, ["cash"]),
    revenue:      fi(hdrs, ["revenue"]),
    cashRoas:     fi(hdrs, ["cash roas"]) >= 0 ? fi(hdrs, ["cash roas"]) : fi(hdrs, ["roas"]),
    revRoas:      fi(hdrs, ["rev roas"]) >= 0 ? fi(hdrs, ["rev roas"]) : fi(hdrs, ["revenue roas"]),
  };

  const result: AdSetRow[] = [];
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cv(row, cols.name);
    if (!name || name.toLowerCase().includes("total") || name.toLowerCase().includes("average")) continue;
    if (!name.trim()) continue;

    const spend = toNum(cv(row, cols.spend));
    const leads = toNum(cv(row, cols.leads));
    const booked = toNum(cv(row, cols.booked));
    const taken = toNum(cv(row, cols.taken));
    const deals = toNum(cv(row, cols.deals));

    result.push({
      name,
      spend,
      leads,
      costPerLead:  cols.cpl >= 0       ? toNum(cv(row, cols.cpl))       : leads > 0 ? spend / leads : 0,
      bookedCalls:  booked,
      costPerBooked: cols.costBooked >= 0 ? toNum(cv(row, cols.costBooked)) : booked > 0 ? spend / booked : 0,
      takenCalls:   taken,
      costPerTaken: cols.costTaken >= 0  ? toNum(cv(row, cols.costTaken))  : taken > 0 ? spend / taken : 0,
      showUpRate:   cols.showUp >= 0     ? toNum(cv(row, cols.showUp))     : booked > 0 && taken > 0 ? (taken / booked) * 100 : 0,
      deals,
      closeRate:    cols.closeRate >= 0  ? toNum(cv(row, cols.closeRate))  : taken > 0 && deals > 0 ? (deals / taken) * 100 : 0,
      cpa:          cols.cpa >= 0        ? toNum(cv(row, cols.cpa))        : deals > 0 ? spend / deals : 0,
      cash:         toNum(cv(row, cols.cash)),
      revenue:      toNum(cv(row, cols.revenue)),
      cashRoas:     cols.cashRoas >= 0   ? toNum(cv(row, cols.cashRoas))   : 0,
      revenueRoas:  cols.revRoas >= 0    ? toNum(cv(row, cols.revRoas))    : 0,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
export async function fetchAdSetsData(): Promise<AdSetsData> {
  const apiKey = process.env.SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY ?? "";
  const lastUpdated = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  // Try published CSV first
  if (AD_SETS_CSV_URL) {
    try {
      const res = await fetch(AD_SETS_CSV_URL, { next: { revalidate: 120 } } as RequestInit);
      if (res.ok) {
        const text = await res.text();
        const rows = parseCSV(text);
        return { rows: parseAdSets(rows), lastUpdated };
      }
    } catch {
      // fall through
    }
  }

  // Fall back to Sheets API v4
  if (!apiKey) {
    return {
      rows: [],
      lastUpdated,
      error: "no_data",
    };
  }

  try {
    const range = encodeURIComponent(`'${AD_SETS_TAB}'`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${FUNNEL_SHEET_ID}/values/${range}?key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 120 } } as RequestInit);
    if (!res.ok) {
      return { rows: [], lastUpdated, error: "no_data" };
    }
    const json = await res.json() as { values?: string[][] };
    return { rows: parseAdSets(json.values ?? []), lastUpdated };
  } catch {
    return { rows: [], lastUpdated, error: "no_data" };
  }
}
