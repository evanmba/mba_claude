/**
 * scripts/setup-monthly-tab.ts
 *
 * One-time setup (re-runnable): rebuilds the MONTHLY tab in the campaign tracker.
 *   - Row 1: same headers as DASHBOARD row 1
 *   - Row 2+: one row per month from campaign start to current month (oldest first)
 *
 * Count metrics (Spend, Clicks, Leads, Apps, Calls, Offers, Deals, Cash, Revenue)
 *   → SUMIFS against DASHBOARD for that month's date range
 * Rate/cost metrics (CPM, CTR, CPC, CPL, etc.)
 *   → calculated from the monthly sums within MONTHLY
 * Page Conversion Rate, CPM, Link CTR
 *   → AVERAGEIFS (these don't add across days)
 *
 * Tip: format column A as "MMM YYYY" after running.
 */

import { createSign } from "crypto";

// ─── Env ──────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.CAMPAIGN_TRACKER_SHEET_ID ?? "";
const SA_EMAIL       = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY         = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const META_TOKEN     = process.env.META_ADS_ACCESS_TOKEN ?? "";
const CAMPAIGN_ID    = process.env.META_CAMPAIGN_ID ?? "120255274601870699";
const DASHBOARD_TAB  = process.env.DASHBOARD_TAB_NAME ?? "DASHBOARD";
const MONTHLY_TAB    = process.env.MONTHLY_TAB_NAME   ?? "MONTHLY";

const missing = [
  !SPREADSHEET_ID && "CAMPAIGN_TRACKER_SHEET_ID",
  !SA_EMAIL       && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  !SA_KEY         && "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  !META_TOKEN     && "META_ADS_ACCESS_TOKEN",
].filter(Boolean);
if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);

// ─── Headers (matches DASHBOARD row 1) ───────────────────────────────────────
// A  B                    C               D    E       F         G
// Day  Page Conv Rate     Amount Spent    CPM  Clicks  Link CTR  Cost Per Click
// H             I                J               K                 L           M
// Total Leads   Lead Opt In Rate  Cost Per Lead   Full Applications Full App %  Cost Per Full App
// N              O          P                    Q            R           S
// Booked Calls   App->Book  Cost Per Booked Call  Taken Calls  Show Rate%  Cost Per Taken Call
// T            U                  V             W             X                  Y
// Offers Made  Taken->Offer Rate  Cost/Offer    Deals Closed  Taken->Close Rate  Cost Per Acquisition
// Z     AA       AB                AC         AD            AE
// Cash  Revenue  Cash:Rev Ratio    Cash ROAS  Revenue ROAS  Change Log

const HEADERS = [
  "Day",
  "Page\nConversion Rate",
  "Amount\nSpent",
  "CPM",
  "Clicks",
  "Link CTR",
  "Cost Per\nClick",
  "Total\nLeads",
  "Lead Opt In Rate",
  "Cost Per\nLead",
  "Full\nApplications",
  "Full App %",
  "Cost Per\nFull App",
  "Booked\nCalls",
  "App->Book",
  "Cost Per\nBooked Call",
  "Taken\nCalls",
  "Show Rate %",
  "Cost Per\nTaken Call",
  "Offers\nMade",
  "Taken->Offer\nRate",
  "Cost Per\nOffer",
  "Deals\nClosed",
  "Taken->Close\nRate",
  "Cost Per\nAcquisition",
  "Cash",
  "Revenue",
  "Cash:Revenue\nRatio",
  "Cash\nROAS",
  "Revenue\nROAS",
  "Change Log",
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function monthsInRange(startISO: string, endISO: string): string[] {
  const months: string[] = [];
  const cur = new Date(startISO.slice(0, 7) + "-01T12:00:00Z");
  const end = new Date(endISO.slice(0, 7) + "-01T12:00:00Z");
  while (cur <= end) {
    months.push(cur.toISOString().slice(0, 7));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return months;
}

/** YYYY-MM → "M/1/YY" — USER_ENTERED makes Sheets store it as a date serial */
function firstOfMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${parseInt(m)}/1/${y.slice(-2)}`;
}

// ─── Google auth ──────────────────────────────────────────────────────────────

async function getGoogleToken(): Promise<string> {
  const now     = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: SA_EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const sig = signer.sign(SA_KEY, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  const json = await res.json() as { access_token?: string };
  if (!res.ok) throw new Error(`Google auth failed: ${JSON.stringify(json)}`);
  return json.access_token!;
}

// ─── Sheets helpers ───────────────────────────────────────────────────────────

async function clearRange(token: string, tab: string, range: string): Promise<void> {
  const encoded = encodeURIComponent(`'${tab}'!${range}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encoded}:clear`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`Sheets clear failed: ${JSON.stringify(json)}`);
}

async function batchWrite(
  token: string,
  data: { range: string; values: (string | number)[][] }[],
): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`Sheets batchWrite failed: ${JSON.stringify(json)}`);
}

// ─── Meta: campaign start date ────────────────────────────────────────────────

async function getCampaignStartDate(): Promise<string> {
  const params = new URLSearchParams({ access_token: META_TOKEN, fields: "start_time" });
  const res = await fetch(`https://graph.facebook.com/v19.0/${CAMPAIGN_ID}?${params}`);
  const json = await res.json() as { start_time?: string; error?: { message: string } };
  if (!res.ok) throw new Error(`Meta campaign fetch failed: ${json?.error?.message ?? JSON.stringify(json)}`);
  if (!json.start_time) throw new Error("Campaign has no start_time");
  return json.start_time.slice(0, 10);
}

// ─── Formula builders ─────────────────────────────────────────────────────────

const DASH = `'${DASHBOARD_TAB}'`;

/** SUMIFS from DASHBOARD for the calendar month containing the date in column A of MONTHLY */
function sumif(col: string, row: number): string {
  return `=IFERROR(SUMIFS(${DASH}!$${col}:$${col},${DASH}!$A:$A,">="&A${row},${DASH}!$A:$A,"<="&EOMONTH(A${row},0)),0)`;
}

/** AVERAGEIFS from DASHBOARD — for metrics that shouldn't be summed */
function avgif(col: string, row: number): string {
  return `=IFERROR(AVERAGEIFS(${DASH}!$${col}:$${col},${DASH}!$A:$A,">="&A${row},${DASH}!$A:$A,"<="&EOMONTH(A${row},0)),0)`;
}

/** Division of two cells within MONTHLY — for calculated rate/cost columns */
function calc(num: string, den: string, row: number): string {
  return `=IFERROR(${num}${row}/${den}${row},0)`;
}

/**
 * Builds the full 31-column row (A through AE) for a given MONTHLY row number.
 * monthFirstDay is the "M/1/YY" string for column A.
 */
function buildMonthRow(row: number, monthFirstDay: string): (string | number)[] {
  return [
    monthFirstDay,          // A  – first of month date

    avgif("B", row),        // B  – Page Conversion Rate (average)
    sumif("C", row),        // C  – Amount Spent (sum)
    avgif("D", row),        // D  – CPM (average — rate metric)
    sumif("E", row),        // E  – Clicks (sum)
    avgif("F", row),        // F  – Link CTR (average — rate metric)
    calc("C", "E", row),    // G  – Cost Per Click = Spend / Clicks

    sumif("H", row),        // H  – Total Leads (sum)
    calc("H", "E", row),    // I  – Lead Opt In Rate = Leads / Clicks
    calc("C", "H", row),    // J  – Cost Per Lead = Spend / Leads

    sumif("K", row),        // K  – Full Applications (sum)
    calc("K", "H", row),    // L  – Full App % = Full Apps / Leads
    calc("C", "K", row),    // M  – Cost Per Full App = Spend / Full Apps

    sumif("N", row),        // N  – Booked Calls (sum)
    calc("N", "K", row),    // O  – App->Book = Booked / Full Apps
    calc("C", "N", row),    // P  – Cost Per Booked Call = Spend / Booked

    sumif("Q", row),        // Q  – Taken Calls (sum)
    calc("Q", "N", row),    // R  – Show Rate % = Taken / Booked
    calc("C", "Q", row),    // S  – Cost Per Taken Call = Spend / Taken

    sumif("T", row),        // T  – Offers Made (sum)
    calc("T", "Q", row),    // U  – Taken->Offer Rate = Offers / Taken
    calc("C", "T", row),    // V  – Cost Per Offer = Spend / Offers

    sumif("W", row),        // W  – Deals Closed (sum)
    calc("W", "Q", row),    // X  – Taken->Close Rate = Deals / Taken
    calc("C", "W", row),    // Y  – Cost Per Acquisition = Spend / Deals

    sumif("Z", row),        // Z  – Cash (sum)
    sumif("AA", row),       // AA – Revenue (sum)
    calc("Z", "AA", row),   // AB – Cash:Revenue Ratio = Cash / Revenue
    calc("Z", "C", row),    // AC – Cash ROAS = Cash / Spend
    calc("AA", "C", row),   // AD – Revenue ROAS = Revenue / Spend

    "",                     // AE – Change Log (blank)
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const todayISO  = getTodayISO();
  const startDate = await getCampaignStartDate();
  const months    = monthsInRange(startDate, todayISO);

  console.log(`Campaign: ${CAMPAIGN_ID}`);
  console.log(`Date range: ${startDate} → ${todayISO}`);
  console.log(`Months found: ${months.join(", ")}`);
  console.log(`Writing to "${MONTHLY_TAB}" tab\n`);

  const token = await getGoogleToken();
  console.log("Google auth: OK");

  // Write headers to row 1
  const updates: { range: string; values: (string | number)[][] }[] = [
    { range: `'${MONTHLY_TAB}'!A1:AE1`, values: [HEADERS] },
  ];

  // Build one row per month (oldest → row 2, newest → last row)
  for (let i = 0; i < months.length; i++) {
    const row = i + 2;
    updates.push({
      range: `'${MONTHLY_TAB}'!A${row}:AE${row}`,
      values: [buildMonthRow(row, firstOfMonth(months[i]))],
    });
    console.log(`  Row ${row}: ${months[i]}`);
  }

  // Clear existing data first, then write everything in one batch
  await clearRange(token, MONTHLY_TAB, "A1:AE1000");
  await batchWrite(token, updates);

  console.log(`\n=== Done: ${months.length} month(s) written ===`);
  console.log(`Tip: select column A in "${MONTHLY_TAB}" and format as MMM YYYY to show month names.`);
}

main().catch(err => {
  console.error("[setup-monthly-tab] ERROR:", err);
  process.exit(1);
});
