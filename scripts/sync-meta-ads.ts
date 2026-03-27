/**
 * scripts/sync-meta-ads.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Daily cron script: fetches yesterday's Meta Ads metrics and writes them into
 * the master tracker Google Sheet.
 *
 * Sheet structure (tab named e.g. "MAR 2026"):
 *   Row 1   – Headers
 *   Row 2+  – One row per calendar day (Column A = day number, 1–31)
 *
 * Columns written by this script:
 *   B  Amount Spent
 *   C  Frequency
 *   D  Reach
 *   E  Impressions
 *   F  CPM
 *   G  Unique Link Clicks
 *   H  Unique Link Click-Through Rate
 *   I  Cost Per Unique Link Click
 *
 * Formula propagation:
 *   Before writing Meta data the script copies C:AD from the row immediately
 *   above the target row. This propagates relative-reference formulas (ratios,
 *   costs, ROAS, etc.) down to the new day automatically.
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
 *   META_ADS_SHEET_TAB  – Override tab name (e.g. "MAR 2026"). If omitted,
 *                         computed automatically from yesterday's date.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Running manually:
 *   npx tsx scripts/sync-meta-ads.ts
 *
 * Cron (see .github/workflows/sync-meta-ads.yml for the automated version):
 *   0 10 * * *  npx tsx /path/to/scripts/sync-meta-ads.ts >> /var/log/meta-ads.log 2>&1
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

// Column index constants (0-based)
const COL_B = 1;   // Amount Spent (first Meta API column)
const COL_C = 2;   // Frequency (start of copyPaste range)
const COL_AD = 29; // Sales Call Recordings (end of copyPaste range, inclusive → endIndex = 30)

// ─── Google service-account JWT ──────────────────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
  if (!SA_EMAIL || !SA_KEY) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.\n" +
      "See README for Google Cloud setup instructions."
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

/** GET /spreadsheets/{id} – returns metadata including per-sheet numeric IDs. */
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

/** Read a single column's values (returns 0-based array of cell strings). */
async function readColumn(token: string, sheetName: string, col: string): Promise<string[]> {
  const range = encodeURIComponent(`'${sheetName}'!${col}:${col}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets read error: ${JSON.stringify(json)}`);
  return ((json.values ?? []) as string[][]).map((row) => row[0] ?? "");
}

/**
 * Copy a row's C:AD range to the row immediately below using Sheets copyPaste.
 * PASTE_NORMAL propagates formulas (relative refs update) and copies values.
 */
async function copyPasteRow(
  token: string,
  sheetId: number,
  sourceRowIndex: number,   // 0-based
  destRowIndex: number      // 0-based
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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets copyPaste error: ${JSON.stringify(json)}`);
}

/**
 * Write Meta API values to columns B:I in a specific row.
 * Uses USER_ENTERED so numbers remain numbers (not strings).
 */
async function writeMetaValues(
  token: string,
  sheetName: string,
  rowNumber: number, // 1-based sheet row
  values: (number | string)[]
): Promise<void> {
  const range = encodeURIComponent(`'${sheetName}'!B${rowNumber}:I${rowNumber}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [values] }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets write error: ${JSON.stringify(json)}`);
}

// ─── Row finder ───────────────────────────────────────────────────────────────

/**
 * Find the 1-based sheet row number whose column A value matches the day number.
 * Handles formats: "26", "26 ", "Mar 26", "3/26", etc.
 * Returns -1 if not found.
 */
function findDayRow(colA: string[], dayNum: number): number {
  const dayStr = String(dayNum);
  for (let i = 0; i < colA.length; i++) {
    const cell = colA[i].trim();
    // Exact match (just the number)
    if (cell === dayStr) return i + 1; // convert to 1-based
    // Cell starts with the day number followed by non-digit (e.g. "26 Mar", "26th")
    if (/^\d+/.test(cell) && cell.match(/^\d+/)?.[0] === dayStr) return i + 1;
  }
  return -1;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SPREADSHEET_ID) {
    throw new Error("MASTER_TRACKER_SHEET_ID is not set.");
  }

  const yesterday = process.env.META_ADS_YESTERDAY_OVERRIDE || getYesterdayDate();
  const dayNum = parseInt(yesterday.split("-")[2], 10);
  const sheetTab = process.env.META_ADS_SHEET_TAB || getSheetTabName(yesterday);

  console.log(`[meta-ads-sync] Date: ${yesterday} | Sheet tab: "${sheetTab}" | Day: ${dayNum}`);

  // 1. Authenticate
  console.log("[meta-ads-sync] Authenticating with Google…");
  const token = await getGoogleAccessToken();

  // 2. Get sheet metadata (need numeric sheetId for copyPaste)
  const meta = await getSpreadsheetMeta(token);
  const sheetMeta = meta.sheets.find((s) => s.properties.title === sheetTab);
  if (!sheetMeta) {
    throw new Error(
      `Sheet tab "${sheetTab}" not found in spreadsheet. ` +
      `Available tabs: ${meta.sheets.map((s) => `"${s.properties.title}"`).join(", ")}`
    );
  }
  const sheetId = sheetMeta.properties.sheetId;
  console.log(`[meta-ads-sync] Found sheet "${sheetTab}" (id=${sheetId})`);

  // 3. Find the target row (column A = day number)
  const colA = await readColumn(token, sheetTab, "A");
  const targetRow = findDayRow(colA, dayNum); // 1-based
  if (targetRow < 0) {
    throw new Error(
      `Could not find a row for day ${dayNum} in column A of "${sheetTab}". ` +
      `Column A values found: [${colA.slice(0, 5).join(", ")}…]`
    );
  }
  console.log(`[meta-ads-sync] Target row: ${targetRow} (day ${dayNum})`);

  // 4. Copy previous row's C:AD → target row (formula propagation)
  if (targetRow > 2) {
    const sourceRow = targetRow - 1; // 1-based → 0-based: sourceRow-1
    console.log(`[meta-ads-sync] Copying C:AD from row ${sourceRow} → row ${targetRow}…`);
    await copyPasteRow(token, sheetId, sourceRow - 1, targetRow - 1);
    console.log("[meta-ads-sync] Formula propagation complete.");
  } else {
    console.log("[meta-ads-sync] Row 2 (first data row) — skipping copyPaste.");
  }

  // 5. Fetch Meta Ads insights
  console.log(`[meta-ads-sync] Fetching Meta Ads insights for ${yesterday}…`);
  const insights = await fetchMetaAdsInsights(yesterday);
  console.log(
    `[meta-ads-sync] Fetched: spend=$${insights.spend} reach=${insights.reach} ` +
    `impressions=${insights.impressions} unique_clicks=${insights.unique_link_clicks}`
  );

  // 6. Write B:I (Amount Spent → Cost Per Unique Link Click)
  const metaValues: (number | string)[] = [
    insights.spend,                    // B – Amount Spent
    insights.frequency,                // C – Frequency
    insights.reach,                    // D – Reach
    insights.impressions,              // E – Impressions
    insights.cpm,                      // F – CPM
    insights.unique_link_clicks,       // G – Unique Link Clicks
    insights.unique_link_clicks_ctr,   // H – Unique Link CTR (%)
    insights.cost_per_unique_link_click, // I – Cost Per Unique Link Click
  ];

  console.log(`[meta-ads-sync] Writing to '${sheetTab}'!B${targetRow}:I${targetRow}…`);
  await writeMetaValues(token, sheetTab, targetRow, metaValues);

  console.log(`[meta-ads-sync] ✓ Done. Row ${targetRow} updated for ${yesterday}.`);
  console.log(`[meta-ads-sync] Values written:`, metaValues);
}

main().catch((err) => {
  console.error("[meta-ads-sync] FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
