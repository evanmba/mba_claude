/**
 * scripts/update-campaign-ads.ts
 *
 * Runs hourly via GitHub Actions.
 * Fetches today's Meta Ads data for a single campaign and writes it to two tabs
 * in the campaign tracker spreadsheet:
 *
 *   "AD SPEND" tab
 *     Columns: A=Date  B=Amount Spent  C=Impressions  D=Reach
 *              E=Link Clicks  F=Frequency  G=CPM  H=CTR  I=CPC
 *     Behaviour: find today's row by date in col A; if not found, append a new row.
 *
 *   "Dashboard" tab
 *     Behaviour: if A6 === today → update row 6.
 *                if A6 !== today → insert a blank row above row 6, then write row 6.
 *
 * Required env vars:
 *   META_ADS_ACCESS_TOKEN
 *   META_CAMPAIGN_ID          (default hard-coded to 120252977822780699)
 *   CAMPAIGN_TRACKER_SHEET_ID
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *
 * Optional env vars:
 *   AD_SPEND_TAB_NAME   (default "AD SPEND")
 *   DASHBOARD_TAB_NAME  (default "Dashboard")
 */

import { createSign } from "crypto";

// ─── Env ──────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.CAMPAIGN_TRACKER_SHEET_ID ?? "";
const SA_EMAIL       = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY         = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const META_TOKEN     = process.env.META_ADS_ACCESS_TOKEN ?? "";
const CAMPAIGN_ID    = process.env.META_CAMPAIGN_ID ?? "120252977822780699";
const AD_SPEND_TAB   = process.env.AD_SPEND_TAB_NAME  ?? "AD SPEND";
const DASHBOARD_TAB  = process.env.DASHBOARD_TAB_NAME ?? "DASHBOARD";

// ─── Validation ───────────────────────────────────────────────────────────────

const missing = [
  !SPREADSHEET_ID && "CAMPAIGN_TRACKER_SHEET_ID",
  !SA_EMAIL       && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  !SA_KEY         && "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  !META_TOKEN     && "META_ADS_ACCESS_TOKEN",
].filter(Boolean);
if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** YYYY-MM-DD → M/D/YY  e.g. 2026-07-01 → "7/1/26" */
function toSheetDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(-2)}`;
}

// ─── Google auth ──────────────────────────────────────────────────────────────

async function getGoogleToken(): Promise<string> {
  const now     = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss:   SA_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  })).toString("base64url");

  const unsigned = `${header}.${payload}`;
  const signer   = createSign("RSA-SHA256");
  signer.update(unsigned);
  const sig = signer.sign(SA_KEY, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  `${unsigned}.${sig}`,
    }),
  });
  const json = await res.json() as { access_token?: string };
  if (!res.ok) throw new Error(`Google auth failed: ${JSON.stringify(json)}`);
  return json.access_token!;
}

// ─── Sheets helpers ───────────────────────────────────────────────────────────

async function readColumn(token: string, tab: string, col: string): Promise<string[]> {
  const range = encodeURIComponent(`'${tab}'!${col}:${col}`);
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json() as { values?: string[][] };
  if (!res.ok) throw new Error(`Sheets readColumn failed: ${JSON.stringify(json)}`);
  return ((json.values ?? []) as string[][]).map(r => r[0] ?? "");
}

async function readCell(token: string, tab: string, cell: string): Promise<string> {
  const range = encodeURIComponent(`'${tab}'!${cell}`);
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json() as { values?: string[][] };
  if (!res.ok) throw new Error(`Sheets readCell failed: ${JSON.stringify(json)}`);
  return ((json.values ?? [])[0] ?? [])[0] ?? "";
}

async function writeRow(
  token: string,
  range: string,
  values: (string | number)[],
): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method:  "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ values: [values] }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`Sheets writeRow failed (${range}): ${JSON.stringify(json)}`);
}

async function appendRow(
  token: string,
  tab: string,
  values: (string | number)[],
): Promise<void> {
  const range = encodeURIComponent(`'${tab}'!A:A`);
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ values: [values] }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`Sheets appendRow failed: ${JSON.stringify(json)}`);
}

async function getSheetIdByName(token: string, tabName: string): Promise<number> {
  const res  = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json() as {
    sheets?: { properties: { title: string; sheetId: number } }[];
  };
  if (!res.ok) throw new Error(`Sheets metadata failed: ${JSON.stringify(json)}`);
  const sheet = json.sheets?.find(s => s.properties.title === tabName);
  if (!sheet) throw new Error(`Tab "${tabName}" not found. Available tabs: ${json.sheets?.map(s => s.properties.title).join(", ")}`);
  return sheet.properties.sheetId;
}

async function insertRowAt(token: string, sheetId: number, zeroBasedIndex: number): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        requests: [{
          insertDimension: {
            range: {
              sheetId,
              dimension:  "ROWS",
              startIndex: zeroBasedIndex,
              endIndex:   zeroBasedIndex + 1,
            },
            inheritFromBefore: false,
          },
        }],
      }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`Insert row failed: ${JSON.stringify(json)}`);
}

// Copy one row into another (same sheet). Copies columns A:AB (indices 0–27).
// Dashboard columns: A(Day) B(Spend) C(Clicks) D(CPC) … AA(Revenue ROAS) AB(Change Log)
async function copyRowDown(
  token: string,
  sheetId: number,
  sourceZeroIndex: number,
  destZeroIndex: number,
): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        requests: [{
          copyPaste: {
            source: {
              sheetId,
              startRowIndex:    sourceZeroIndex,
              endRowIndex:      sourceZeroIndex + 1,
              startColumnIndex: 0,
              endColumnIndex:   28, // A(0) through AB(27), exclusive end = 28
            },
            destination: {
              sheetId,
              startRowIndex:    destZeroIndex,
              endRowIndex:      destZeroIndex + 1,
              startColumnIndex: 0,
              endColumnIndex:   28,
            },
            pasteType:        "PASTE_NORMAL",
            pasteOrientation: "NORMAL",
          },
        }],
      }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`copyPaste failed: ${JSON.stringify(json)}`);
}

// ─── Meta API ─────────────────────────────────────────────────────────────────

async function fetchCampaignMetrics(date: string) {
  const params = new URLSearchParams({
    access_token: META_TOKEN,
    fields:       "spend,impressions,reach,frequency,cpm,actions",
    time_range:   JSON.stringify({ since: date, until: date }),
  });
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${CAMPAIGN_ID}/insights?${params}`,
  );
  const json = await res.json() as {
    data?: Record<string, unknown>[];
    error?: { message: string };
  };
  if (!res.ok) throw new Error(`Meta API failed: ${json?.error?.message ?? JSON.stringify(json)}`);

  const row     = (json.data ?? [])[0] as Record<string, unknown> ?? {};
  const actions = (row.actions ?? []) as { action_type: string; value: string }[];
  const linkClicks  = parseFloat(actions.find(a => a.action_type === "link_click")?.value ?? "0") || 0;
  const spend       = parseFloat(row.spend       as string ?? "0") || 0;
  const impressions = parseFloat(row.impressions as string ?? "0") || 0;

  return {
    spend,
    impressions,
    reach:      parseFloat(row.reach      as string ?? "0") || 0,
    frequency:  parseFloat(row.frequency  as string ?? "0") || 0,
    cpm:        parseFloat(row.cpm        as string ?? "0") || 0,
    linkClicks,
    ctr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
    cpc: linkClicks  > 0 ? spend / linkClicks : 0,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const todayISO   = getTodayISO();
  const todaySheet = toSheetDate(todayISO);

  console.log(`\n=== Campaign ${CAMPAIGN_ID} | ${todayISO} (${todaySheet}) ===`);
  console.log(`Spreadsheet: ${SPREADSHEET_ID}`);

  const metrics = await fetchCampaignMetrics(todayISO);
  console.log("Meta metrics:", {
    spend:       `$${metrics.spend.toFixed(2)}`,
    impressions: metrics.impressions,
    reach:       metrics.reach,
    linkClicks:  metrics.linkClicks,
    frequency:   metrics.frequency.toFixed(2),
    cpm:         `$${metrics.cpm.toFixed(2)}`,
    ctr:         `${metrics.ctr.toFixed(2)}%`,
    cpc:         `$${metrics.cpc.toFixed(2)}`,
  });

  const token = await getGoogleToken();
  console.log("Google auth: OK");

  const rowValues: (string | number)[] = [
    todaySheet,
    metrics.spend,
    metrics.impressions,
    metrics.reach,
    metrics.linkClicks,
    metrics.frequency,
    metrics.cpm,
    metrics.ctr / 100,  // store as decimal so Sheets % format works (e.g. 0.0092 → 0.92%)
    metrics.cpc,
  ];

  // ── AD SPEND tab ────────────────────────────────────────────────────────────

  {
    console.log(`\nAD SPEND tab ("${AD_SPEND_TAB}"):`);
    const colA = await readColumn(token, AD_SPEND_TAB, "A");
    let targetRow = -1;
    for (let i = 0; i < colA.length; i++) {
      if (colA[i].trim() === todaySheet) { targetRow = i + 1; break; }
    }

    if (targetRow > 0) {
      console.log(`  Updating existing row ${targetRow}`);
      await writeRow(token, `'${AD_SPEND_TAB}'!A${targetRow}:I${targetRow}`, rowValues);
    } else {
      console.log("  No row found for today — appending new row");
      await appendRow(token, AD_SPEND_TAB, rowValues);
    }
    console.log("  Done");
  }

  // ── Dashboard tab ───────────────────────────────────────────────────────────

  {
    console.log(`\nDashboard tab ("${DASHBOARD_TAB}"):`);
    const a6 = (await readCell(token, DASHBOARD_TAB, "A6")).trim();
    console.log(`  A6 = "${a6}", today = "${todaySheet}"`);

    if (a6 === todaySheet) {
      console.log("  A6 is already today — nothing to do");
    } else {
      // New day: insert blank row above row 6, copy old row 6 (A:AB) into it, set A6 = today
      console.log("  A6 is a different date — duplicating row 6 upward for today");
      const sheetId = await getSheetIdByName(token, DASHBOARD_TAB);
      // 1. Insert blank row at position 6 (0-based: 5); old row 6 shifts to row 7
      await insertRowAt(token, sheetId, 5);
      // 2. Copy old row 6 (now row 7, 0-based: 6) → new blank row 6 (0-based: 5), cols A:AB
      await copyRowDown(token, sheetId, 6, 5);
      // 3. Set A6 to today's date (everything else came from the copy)
      await writeRow(token, `'${DASHBOARD_TAB}'!A6`, [todaySheet]);
    }
    console.log("  Done");
  }

  console.log("\n=== All done ===");
}

main().catch(err => {
  console.error("[update-campaign-ads] ERROR:", err);
  process.exit(1);
});
