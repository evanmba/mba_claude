/**
 * scripts/sync-meta-ads.ts
 *
 * Runs daily at 6 AM Eastern. For each execution:
 *   - Finds today's row in column B (e.g. "3/27/26")
 *   - Copies K:AD from the previous row (formula propagation for leads, calls, etc.)
 *   - Writes yesterday's completed Meta Ads data into columns C:J
 *
 * Sheet: "MAR 2026" (auto-computed from date)
 * Column B  = Date (pre-filled, M/DD/YY format e.g. "3/27/26")
 * Column C  = Amount Spent        ← Meta API
 * Column D  = Frequency           ← Meta API
 * Column E  = Reach               ← Meta API
 * Column F  = Impressions         ← Meta API
 * Column G  = CPM                 ← Meta API
 * Column H  = Unique Link Clicks  ← Meta API
 * Column I  = Unique Link CTR     ← Meta API
 * Column J  = Cost Per Unique Link Click ← Meta API
 * Column K  = Total AgeQ Leads    ← copied from previous row
 * ...
 * Column AD = Sales Call Recordings ← copied from previous row
 */

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

import { createSign } from "crypto";

// ─── Env ──────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.MASTER_TRACKER_SHEET_ID ?? "";
const SA_EMAIL       = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY         = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const META_TOKEN     = process.env.META_ADS_ACCESS_TOKEN ?? "";
const META_ACCOUNT   = process.env.META_ADS_ACCOUNT_ID ?? "";

console.log("=== ENV CHECK ===");
console.log("MASTER_TRACKER_SHEET_ID     :", SPREADSHEET_ID ? `set (${SPREADSHEET_ID.length} chars)` : "MISSING");
console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", SA_EMAIL       ? `set` : "MISSING");
console.log("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:", SA_KEY  ? `set (${SA_KEY.length} chars)` : "MISSING");
console.log("META_ADS_ACCESS_TOKEN       :", META_TOKEN     ? `set (${META_TOKEN.length} chars)` : "MISSING");
console.log("META_ADS_ACCOUNT_ID         :", META_ACCOUNT   ? `set` : "MISSING");
console.log("=================");

if (!SPREADSHEET_ID) throw new Error("MASTER_TRACKER_SHEET_ID is not set");
if (!SA_EMAIL)       throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not set");
if (!SA_KEY)         throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set");
if (!META_TOKEN)     throw new Error("META_ADS_ACCESS_TOKEN is not set");
if (!META_ACCOUNT)   throw new Error("META_ADS_ACCOUNT_ID is not set");

// ─── Column indices (0-based) ─────────────────────────────────────────────────

const COL_C  = 2;  // Amount Spent — first Meta API column
const COL_J  = 9;  // Cost Per Unique Link Click — last Meta API column
const COL_K  = 10; // Total AgeQ Leads — start of copy-from-prev-row range
const COL_AD = 29; // Sales Call Recordings — end of copy range (endIndex = 30)

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Today's date in UTC as YYYY-MM-DD */
function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Yesterday's date in UTC as YYYY-MM-DD */
function getYesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD → M/DD/YY  e.g. 2026-03-27 → "3/27/26" */
function toSheetDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(-2)}`;
}

/** YYYY-MM-DD → "MAR 2026" */
function toTabName(iso: string): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const dt = new Date(iso + "T12:00:00Z");
  return `${months[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

// ─── Google auth ──────────────────────────────────────────────────────────────

async function getGoogleToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: SA_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })).toString("base64url");

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
  if (!res.ok) throw new Error(`Google auth failed: ${JSON.stringify(json)}`);
  console.log("Google auth: OK");
  return json.access_token as string;
}

// ─── Sheets helpers ───────────────────────────────────────────────────────────

async function getSheetId(token: string, tabName: string): Promise<number> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets metadata failed: ${JSON.stringify(json)}`);
  const sheet = json.sheets?.find((s: { properties: { title: string } }) => s.properties.title === tabName);
  if (!sheet) {
    const tabs = json.sheets?.map((s: { properties: { title: string } }) => `"${s.properties.title}"`).join(", ");
    throw new Error(`Tab "${tabName}" not found. Available tabs: ${tabs}`);
  }
  return sheet.properties.sheetId as number;
}

async function readColumn(token: string, tab: string, col: string): Promise<string[]> {
  const range = encodeURIComponent(`'${tab}'!${col}:${col}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets read failed: ${JSON.stringify(json)}`);
  return ((json.values ?? []) as string[][]).map(r => r[0] ?? "");
}

/** Copy K:AD from sourceRow → destRow (0-based indices). Propagates formulas. */
async function copyPrevRow(token: string, sheetId: number, srcIdx: number, dstIdx: number): Promise<void> {
  const body = {
    requests: [{
      copyPaste: {
        source:      { sheetId, startRowIndex: srcIdx, endRowIndex: srcIdx + 1, startColumnIndex: COL_K, endColumnIndex: COL_AD + 1 },
        destination: { sheetId, startRowIndex: dstIdx, endRowIndex: dstIdx + 1, startColumnIndex: COL_K, endColumnIndex: COL_AD + 1 },
        pasteType: "PASTE_NORMAL",
        pasteOrientation: "NORMAL",
      },
    }],
  };
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`copyPaste failed: ${JSON.stringify(json)}`);
}

/** Write Meta API values to C:J in the target row (1-based rowNum). */
async function writeMetaData(token: string, tab: string, rowNum: number, values: (string|number)[]): Promise<void> {
  const range = encodeURIComponent(`'${tab}'!C${rowNum}:J${rowNum}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: [values] }) }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets write failed: ${JSON.stringify(json)}`);
}

// ─── Meta API ─────────────────────────────────────────────────────────────────

async function fetchMeta(date: string) {
  const accountId = META_ACCOUNT.startsWith("act_") ? META_ACCOUNT : `act_${META_ACCOUNT}`;
  const fields = ["spend","frequency","reach","impressions","cpm","unique_link_clicks_ctr","unique_actions","cost_per_unique_action_type"].join(",");
  const params = new URLSearchParams({
    access_token: META_TOKEN,
    fields,
    time_range: JSON.stringify({ since: date, until: date }),
    level: "account",
    limit: "1",
  });
  const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(`Meta API failed: ${json?.error?.message ?? JSON.stringify(json)}`);
  console.log("Meta API: OK");

  const row = (json.data ?? [])[0] ?? {};
  const ua: { action_type: string; value: string }[] = row.unique_actions ?? [];
  const uc: { action_type: string; value: string }[] = row.cost_per_unique_action_type ?? [];
  const find = (arr: typeof ua, type: string) => parseFloat(arr.find(a => a.action_type === type)?.value ?? "0") || 0;

  return {
    spend:                      parseFloat(row.spend        ?? "0") || 0,
    frequency:                  parseFloat(row.frequency    ?? "0") || 0,
    reach:                      parseFloat(row.reach        ?? "0") || 0,
    impressions:                parseFloat(row.impressions  ?? "0") || 0,
    cpm:                        parseFloat(row.cpm          ?? "0") || 0,
    unique_link_clicks:         find(ua, "link_click"),
    unique_link_clicks_ctr:     parseFloat(row.unique_link_clicks_ctr ?? "0") || 0,
    cost_per_unique_link_click: find(uc, "link_click"),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Today's date = the row we write to (e.g. "3/27/26" → row 32)
  // Yesterday's date = the Meta API date (completed day's data)
  const todayISO     = process.env.META_ADS_TODAY_OVERRIDE     || getTodayISO();
  const yesterdayISO = process.env.META_ADS_YESTERDAY_OVERRIDE || getYesterdayISO();
  const todaySheet   = toSheetDate(todayISO);       // e.g. "3/27/26"
  const tab          = process.env.META_ADS_SHEET_TAB || toTabName(todayISO); // e.g. "MAR 2026"

  console.log(`Today row: "${todaySheet}" | Meta data date: ${yesterdayISO} | Tab: "${tab}"`);

  // 1. Auth
  const token = await getGoogleToken();

  // 2. Get numeric sheetId for copyPaste
  const sheetId = await getSheetId(token, tab);
  console.log(`Sheet ID: ${sheetId}`);

  // 3. Find today's row by scanning column B
  const colB = await readColumn(token, tab, "B");
  console.log(`Column B — first 5: [${colB.slice(0, 5).join(" | ")}]`);

  let targetRow = -1;
  for (let i = 0; i < colB.length; i++) {
    if (colB[i].trim() === todaySheet) { targetRow = i + 1; break; } // 1-based
  }
  if (targetRow < 0) throw new Error(`Date "${todaySheet}" not found in column B. Check tab name or date format.`);
  console.log(`Target row: ${targetRow} (date "${todaySheet}")`);

  // 4. Copy K:AD from previous row → today's row
  if (targetRow > 2) {
    const prevRowIdx = targetRow - 2; // 0-based index of previous row
    const currRowIdx = targetRow - 1; // 0-based index of today's row
    console.log(`Copying K:AD from row ${targetRow - 1} → row ${targetRow}…`);
    await copyPrevRow(token, sheetId, prevRowIdx, currRowIdx);
    console.log("Copy-paste: OK");
  } else {
    console.log("First data row — skipping copy-paste.");
  }

  // 5. Fetch yesterday's Meta data
  console.log(`Fetching Meta data for ${yesterdayISO}…`);
  const m = await fetchMeta(yesterdayISO);
  console.log("Meta data:", m);

  // 6. Write C:J with Meta API values
  const values: (string|number)[] = [
    m.spend,                      // C – Amount Spent
    m.frequency,                  // D – Frequency
    m.reach,                      // E – Reach
    m.impressions,                // F – Impressions
    m.cpm,                        // G – CPM
    m.unique_link_clicks,         // H – Unique Link Clicks
    m.unique_link_clicks_ctr,     // I – Unique Link CTR (%)
    m.cost_per_unique_link_click, // J – Cost Per Unique Link Click
  ];

  console.log(`Writing C${targetRow}:J${targetRow}…`);
  await writeMetaData(token, tab, targetRow, values);
  console.log(`✓ Done. Row ${targetRow} ("${todaySheet}") written with ${yesterdayISO} Meta data.`);
  console.log("Values:", values);
}

main().catch(err => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
