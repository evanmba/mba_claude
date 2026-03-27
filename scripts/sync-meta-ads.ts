/**
 * scripts/sync-meta-ads.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Daily cron script: fetches yesterday's Meta Ads metrics and writes them into
 * the master tracker Google Sheet.
 *
 * Sheet structure (tab named e.g. "MAR 2026"):
 *   Row 1   – Headers
 *   Row 2+  – One row per calendar day
 *
 * Columns written by this script:
 *   B  Date (yesterday's date, e.g. 3/26/2026)
 *   C  Amount Spent
 *   D  Frequency
 *   E  Reach
 *   F  Impressions
 *   G  CPM
 *   H  Unique Link Clicks
 *   I  Unique Link Click-Through Rate
 *   J  Cost Per Unique Link Click
 *
 * Formula propagation:
 *   Before writing Meta data the script copies C:AD from the previous row.
 *   This propagates relative-reference formulas (ratios, costs, ROAS, etc.)
 *   down to the new day automatically.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Required env vars:
 *   META_ADS_ACCESS_TOKEN              – System user token (ads_read scope)
 *   META_ADS_ACCOUNT_ID                – Ad account ID ending in …498
 *   MASTER_TRACKER_SHEET_ID            – Google Spreadsheet ID
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL       – Service account email (for Sheets write)
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY – Service account private key
 *
 * Optional:
 *   META_ADS_SHEET_TAB           – Override tab name (e.g. "MAR 2026")
 *   META_ADS_YESTERDAY_OVERRIDE  – Override date (YYYY-MM-DD) for backfills
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Running manually:
 *   npx tsx scripts/sync-meta-ads.ts
 *
 * Cron (see .github/workflows/sync-meta-ads.yml):
 *   0 10 * * *  npx tsx /path/to/scripts/sync-meta-ads.ts
 */

// ─── Load .env.local for local development ───────────────────────────────────

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ─── Imports ─────────────────────────────────────────────────────────────────

import { fetchMetaAdsInsights, getYesterdayDate, getSheetTabName } from "../lib/meta-ads.js";
import { createSign } from "crypto";

// ─── Config ───────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.MASTER_TRACKER_SHEET_ID ?? "";
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

// Column indices (0-based)
const COL_B  = 1;  // Date written by this script
const COL_C  = 2;  // Amount Spent — first Meta API column, also start of copyPaste range
const COL_J  = 9;  // Cost Per Unique Link Click — last Meta API column
const COL_AD = 29; // Sales Call Recordings — last column to copy formulas into (endIndex = 30)

// ─── Google service-account JWT ──────────────────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
  if (!SA_EMAIL || !SA_KEY) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: SA_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const sig = signer.sign(SA_KEY, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Google auth error: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

// ─── Sheets API helpers ───────────────────────────────────────────────────────

async function getSpreadsheetMeta(token: string): Promise<{
  sheets: Array<{ properties: { sheetId: number; title: string } }>;
}> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets metadata error: ${JSON.stringify(json)}`);
  return json;
}

/** Read a column's values as a flat string array (0-indexed, includes header). */
async function readColumn(token: string, sheetName: string, col: string): Promise<string[]> {
  const range = encodeURIComponent(`'${sheetName}'!${col}:${col}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets read error (col ${col}): ${JSON.stringify(json)}`);
  return ((json.values ?? []) as string[][]).map((row) => row[0] ?? "");
}

/**
 * Copy C:AD from sourceRowIndex → destRowIndex using Sheets copyPaste.
 * PASTE_NORMAL copies both values and formulas; relative refs auto-update.
 */
async function copyPasteRow(
  token: string,
  sheetId: number,
  sourceRowIndex: number, // 0-based
  destRowIndex: number    // 0-based
): Promise<void> {
  const body = {
    requests: [
      {
        copyPaste: {
          source: {
            sheetId,
            startRowIndex: sourceRowIndex,
            endRowIndex: sourceRowIndex + 1,
            startColumnIndex: COL_C,
            endColumnIndex: COL_AD + 1, // exclusive
          },
          destination: {
            sheetId,
            startRowIndex: destRowIndex,
            endRowIndex: destRowIndex + 1,
            startColumnIndex: COL_C,
            endColumnIndex: COL_AD + 1,
          },
          pasteType: "PASTE_NORMAL",
          pasteOrientation: "NORMAL",
        },
      },
    ],
  };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets copyPaste error: ${JSON.stringify(json)}`);
}

/**
 * Write the date + Meta API values to columns B:J in a specific row.
 * Uses USER_ENTERED so numbers stay numeric and dates are recognised.
 */
async function writeDateAndMetaValues(
  token: string,
  sheetName: string,
  rowNumber: number, // 1-based
  values: (number | string)[]
): Promise<void> {
  const range = encodeURIComponent(`'${sheetName}'!B${rowNumber}:J${rowNumber}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets write error: ${JSON.stringify(json)}`);
}

// ─── Row finder ───────────────────────────────────────────────────────────────

/**
 * Determine the target row (1-based) to write to.
 *
 * Strategy:
 *   1. If column B already contains a cell matching the target date string,
 *      reuse that row (idempotent re-runs).
 *   2. Otherwise use the first completely empty row after the header
 *      (i.e. last non-empty row in column B + 1).
 */
function findTargetRow(colB: string[], dateStr: string): number {
  // Check for existing entry matching this date
  for (let i = 1; i < colB.length; i++) { // start at 1 to skip header
    if (colB[i].trim() === dateStr) return i + 1; // 1-based
  }
  // Find last non-empty row and use the next one
  let lastFilled = 1; // at minimum the header row
  for (let i = 1; i < colB.length; i++) {
    if (colB[i].trim() !== "") lastFilled = i + 1; // 1-based
  }
  return lastFilled + 1;
}

/** Format YYYY-MM-DD → M/D/YYYY for Google Sheets (e.g. 2026-03-26 → 3/26/2026). */
function toSheetDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SPREADSHEET_ID) throw new Error("MASTER_TRACKER_SHEET_ID is not set.");

  const yesterday = process.env.META_ADS_YESTERDAY_OVERRIDE || getYesterdayDate();
  const sheetTab  = process.env.META_ADS_SHEET_TAB || getSheetTabName(yesterday);
  const dateStr   = toSheetDate(yesterday); // e.g. "3/26/2026"

  console.log(`[meta-ads-sync] Date: ${yesterday} (${dateStr}) | Sheet: "${sheetTab}"`);

  // 1. Authenticate
  console.log("[meta-ads-sync] Authenticating with Google…");
  const token = await getGoogleAccessToken();

  // 2. Get numeric sheetId (required for copyPaste batchUpdate)
  const meta = await getSpreadsheetMeta(token);
  const sheetMeta = meta.sheets.find((s) => s.properties.title === sheetTab);
  if (!sheetMeta) {
    throw new Error(
      `Sheet tab "${sheetTab}" not found. ` +
      `Available: ${meta.sheets.map((s) => `"${s.properties.title}"`).join(", ")}`
    );
  }
  const sheetId = sheetMeta.properties.sheetId;
  console.log(`[meta-ads-sync] Found sheet "${sheetTab}" (sheetId=${sheetId})`);

  // 3. Find target row by scanning column B
  const colB = await readColumn(token, sheetTab, "B");
  const targetRow = findTargetRow(colB, dateStr); // 1-based
  console.log(`[meta-ads-sync] Target row: ${targetRow}`);

  // 4. Copy C:AD from previous row → target row (propagates formulas)
  if (targetRow > 2) {
    const prevRow = targetRow - 1;
    console.log(`[meta-ads-sync] Copying C:AD from row ${prevRow} → row ${targetRow}…`);
    await copyPasteRow(token, sheetId, prevRow - 1, targetRow - 1); // convert to 0-based
    console.log("[meta-ads-sync] Formula propagation complete.");
  } else {
    console.log("[meta-ads-sync] First data row — skipping copyPaste.");
  }

  // 5. Fetch Meta Ads insights
  console.log(`[meta-ads-sync] Fetching Meta Ads insights for ${yesterday}…`);
  const insights = await fetchMetaAdsInsights(yesterday);
  console.log(
    `[meta-ads-sync] Fetched: spend=$${insights.spend} | reach=${insights.reach} | ` +
    `impressions=${insights.impressions} | unique_clicks=${insights.unique_link_clicks}`
  );

  // 6. Write B:J  (date + 8 Meta API metrics)
  const row: (string | number)[] = [
    dateStr,                               // B – Date
    insights.spend,                        // C – Amount Spent
    insights.frequency,                    // D – Frequency
    insights.reach,                        // E – Reach
    insights.impressions,                  // F – Impressions
    insights.cpm,                          // G – CPM
    insights.unique_link_clicks,           // H – Unique Link Clicks
    insights.unique_link_clicks_ctr,       // I – Unique Link CTR (%)
    insights.cost_per_unique_link_click,   // J – Cost Per Unique Link Click
  ];

  console.log(`[meta-ads-sync] Writing to '${sheetTab}'!B${targetRow}:J${targetRow}…`);
  await writeDateAndMetaValues(token, sheetTab, targetRow, row);

  console.log(`[meta-ads-sync] ✓ Done. Row ${targetRow} written for ${yesterday}.`);
  console.log("[meta-ads-sync] Values:", row);
}

main().catch((err) => {
  console.error("[meta-ads-sync] FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
