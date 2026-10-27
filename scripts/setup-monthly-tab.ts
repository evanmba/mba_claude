/**
 * scripts/setup-monthly-tab.ts
 *
 * Builds / updates the MONTHLY tab in the campaign tracker:
 *
 *   Row 1:    Column headers (same as DASHBOARD)
 *   Rows 2–5: Rolling period summaries — 4 / 7 / 14 / 30 days (live TODAY() formulas)
 *   Row 6+:   One row per month, oldest first
 *
 * On re-run:
 *   - Always rewrites rows 1–5 (headers + rolling periods)
 *   - Updates formulas in existing monthly rows without touching their formatting
 *   - Copies the last formatted month row's styles before inserting any new month
 *
 * Trigger manually (or via monthly cron) with the "Setup Monthly Tab" workflow.
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

// ─── Headers ──────────────────────────────────────────────────────────────────

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

/** YYYY-MM → "M/1/YY" so USER_ENTERED stores it as a date serial */
function firstOfMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${parseInt(m)}/1/${y.slice(-2)}`;
}

/** Google Sheets date serial (days since Dec 30 1899) */
function dateSerial(year: number, month: number, day: number): number {
  const epoch  = Date.UTC(1899, 11, 30);
  const target = Date.UTC(year, month - 1, day);
  return Math.round((target - epoch) / 86400000);
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

async function getSheetIdByName(token: string, tabName: string): Promise<number> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json() as { sheets?: { properties: { title: string; sheetId: number } }[] };
  if (!res.ok) throw new Error(`Sheets metadata failed: ${JSON.stringify(json)}`);
  const sheet = json.sheets?.find(s => s.properties.title === tabName);
  if (!sheet) throw new Error(`Tab "${tabName}" not found`);
  return sheet.properties.sheetId;
}

/** Read a column as raw (unformatted) values — date cells come back as serials */
async function readColumnRaw(
  token: string, tab: string, col: string, startRow: number, count: number,
): Promise<(number | string)[]> {
  const range = encodeURIComponent(`'${tab}'!${col}${startRow}:${col}${startRow + count - 1}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json() as { values?: (number | string)[][] };
  if (!res.ok) throw new Error(`Sheets readColumnRaw failed: ${JSON.stringify(json)}`);
  return ((json.values ?? []) as (number | string)[][]).map(r => r[0] ?? 0);
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

/** Copy only the formatting (number formats, colours, borders) from one row to another */
async function copyRowFormat(
  token: string, sheetId: number, sourceRow: number, destRow: number,
): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          copyPaste: {
            source: {
              sheetId,
              startRowIndex:    sourceRow - 1,
              endRowIndex:      sourceRow,
              startColumnIndex: 0,
              endColumnIndex:   31, // A through AE
            },
            destination: {
              sheetId,
              startRowIndex:    destRow - 1,
              endRowIndex:      destRow,
              startColumnIndex: 0,
              endColumnIndex:   31,
            },
            pasteType:        "PASTE_FORMAT",
            pasteOrientation: "NORMAL",
          },
        }],
      }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`copyRowFormat failed: ${JSON.stringify(json)}`);
}

// ─── Formula builders ─────────────────────────────────────────────────────────

const DASH = `'${DASHBOARD_TAB}'`;

/** Rolling period row: formulas keyed on TODAY()-N, label in column A */
function buildRollingRow(row: number, days: number, label: string): (string | number)[] {
  const n = days - 1; // "4 days" = today + 3 prior days
  const s = (col: string) =>
    `=IFERROR(SUMIFS(${DASH}!$${col}:$${col},${DASH}!$A:$A,">="&TODAY()-${n},${DASH}!$A:$A,"<="&TODAY()),0)`;
  const a = (col: string) =>
    `=IFERROR(AVERAGEIFS(${DASH}!$${col}:$${col},${DASH}!$A:$A,">="&TODAY()-${n},${DASH}!$A:$A,"<="&TODAY()),0)`;
  const d = (num: string, den: string) => `=IFERROR(${num}${row}/${den}${row},0)`;

  return [
    label,       // A
    a("B"),      // B  Page Conversion Rate
    s("C"),      // C  Amount Spent
    a("D"),      // D  CPM
    s("E"),      // E  Clicks
    a("F"),      // F  Link CTR
    d("C","E"),  // G  Cost Per Click
    s("H"),      // H  Total Leads
    d("H","E"),  // I  Lead Opt In Rate
    d("C","H"),  // J  Cost Per Lead
    s("K"),      // K  Full Applications
    d("K","H"),  // L  Full App %
    d("C","K"),  // M  Cost Per Full App
    s("N"),      // N  Booked Calls
    d("N","K"),  // O  App->Book
    d("C","N"),  // P  Cost Per Booked Call
    s("Q"),      // Q  Taken Calls
    d("Q","N"),  // R  Show Rate %
    d("C","Q"),  // S  Cost Per Taken Call
    s("T"),      // T  Offers Made
    d("T","Q"),  // U  Taken->Offer Rate
    d("C","T"),  // V  Cost Per Offer
    s("W"),      // W  Deals Closed
    d("W","Q"),  // X  Taken->Close Rate
    d("C","W"),  // Y  Cost Per Acquisition
    s("Z"),      // Z  Cash
    s("AA"),     // AA Revenue
    d("Z","AA"), // AB Cash:Revenue Ratio
    d("Z","C"),  // AC Cash ROAS
    d("AA","C"), // AD Revenue ROAS
    "",          // AE Change Log
  ];
}

/** Monthly row: formulas keyed on EOMONTH(A{row}, 0), date value in column A */
function buildMonthRow(row: number, monthFirstDay: string): (string | number)[] {
  const s = (col: string) =>
    `=IFERROR(SUMIFS(${DASH}!$${col}:$${col},${DASH}!$A:$A,">="&A${row},${DASH}!$A:$A,"<="&EOMONTH(A${row},0)),0)`;
  const a = (col: string) =>
    `=IFERROR(AVERAGEIFS(${DASH}!$${col}:$${col},${DASH}!$A:$A,">="&A${row},${DASH}!$A:$A,"<="&EOMONTH(A${row},0)),0)`;
  const d = (num: string, den: string) => `=IFERROR(${num}${row}/${den}${row},0)`;

  return [
    monthFirstDay, // A  first-of-month date
    a("B"),        // B  Page Conversion Rate
    s("C"),        // C  Amount Spent
    a("D"),        // D  CPM
    s("E"),        // E  Clicks
    a("F"),        // F  Link CTR
    d("C","E"),    // G  Cost Per Click
    s("H"),        // H  Total Leads
    d("H","E"),    // I  Lead Opt In Rate
    d("C","H"),    // J  Cost Per Lead
    s("K"),        // K  Full Applications
    d("K","H"),    // L  Full App %
    d("C","K"),    // M  Cost Per Full App
    s("N"),        // N  Booked Calls
    d("N","K"),    // O  App->Book
    d("C","N"),    // P  Cost Per Booked Call
    s("Q"),        // Q  Taken Calls
    d("Q","N"),    // R  Show Rate %
    d("C","Q"),    // S  Cost Per Taken Call
    s("T"),        // T  Offers Made
    d("T","Q"),    // U  Taken->Offer Rate
    d("C","T"),    // V  Cost Per Offer
    s("W"),        // W  Deals Closed
    d("W","Q"),    // X  Taken->Close Rate
    d("C","W"),    // Y  Cost Per Acquisition
    s("Z"),        // Z  Cash
    s("AA"),       // AA Revenue
    d("Z","AA"),   // AB Cash:Revenue Ratio
    d("Z","C"),    // AC Cash ROAS
    d("AA","C"),   // AD Revenue ROAS
    "",            // AE Change Log
  ];
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const todayISO  = getTodayISO();
  const startDate = await getCampaignStartDate();
  const months    = monthsInRange(startDate, todayISO);

  console.log(`Campaign: ${CAMPAIGN_ID}`);
  console.log(`Range: ${startDate} → ${todayISO}`);
  console.log(`Months: ${months.join(", ")}\n`);

  const token   = await getGoogleToken();
  const sheetId = await getSheetIdByName(token, MONTHLY_TAB);
  console.log("Google auth: OK");

  // 1. Always rewrite headers + rolling period rows
  await batchWrite(token, [
    { range: `'${MONTHLY_TAB}'!A1:AE1`, values: [HEADERS] },
    { range: `'${MONTHLY_TAB}'!A2:AE2`, values: [buildRollingRow(2,  4,  "4 Days")] },
    { range: `'${MONTHLY_TAB}'!A3:AE3`, values: [buildRollingRow(3,  7,  "7 Days")] },
    { range: `'${MONTHLY_TAB}'!A4:AE4`, values: [buildRollingRow(4, 14, "14 Days")] },
    { range: `'${MONTHLY_TAB}'!A5:AE5`, values: [buildRollingRow(5, 30, "30 Days")] },
  ]);
  console.log("Wrote headers + rolling period rows (2–5)");

  // 2. Read existing monthly rows (col A, rows 6+) as raw serials
  const existingVals = await readColumnRaw(token, MONTHLY_TAB, "A", 6, months.length + 20);

  // Build map: date serial → row number for existing months
  const serialToRow = new Map<number, number>();
  let lastMonthRow = 5;
  for (let i = 0; i < existingVals.length; i++) {
    const val = existingVals[i];
    if (typeof val === "number" && val > 1) {
      const row = i + 6;
      serialToRow.set(Math.round(val), row);
      if (row > lastMonthRow) lastMonthRow = row;
    }
  }
  console.log(`Found ${serialToRow.size} existing month row(s), last at row ${lastMonthRow}\n`);

  // 3. Process each month
  const updates: { range: string; values: (string | number)[][] }[] = [];

  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const serial   = dateSerial(y, m, 1);
    const firstDay = firstOfMonth(ym);

    if (serialToRow.has(serial)) {
      // Existing row — update formulas only, formatting untouched
      const row = serialToRow.get(serial)!;
      updates.push({ range: `'${MONTHLY_TAB}'!A${row}:AE${row}`, values: [buildMonthRow(row, firstDay)] });
      console.log(`  Updated  row ${row}: ${ym}`);
    } else {
      // New month — copy previous row's formatting first, then write formulas
      lastMonthRow++;
      const row = lastMonthRow;
      if (row > 6) {
        await copyRowFormat(token, sheetId, row - 1, row);
      }
      updates.push({ range: `'${MONTHLY_TAB}'!A${row}:AE${row}`, values: [buildMonthRow(row, firstDay)] });
      serialToRow.set(serial, row);
      console.log(`  Inserted row ${row}: ${ym} (new — format copied from row ${row - 1})`);
    }
  }

  if (updates.length > 0) {
    await batchWrite(token, updates);
  }

  console.log(`\n=== Done: ${months.length} month(s) processed ===`);
  console.log(`Tip: format column A in "${MONTHLY_TAB}" as MMM YYYY to show month names.`);
}

main().catch(err => {
  console.error("[setup-monthly-tab] ERROR:", err);
  process.exit(1);
});
