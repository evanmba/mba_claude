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

const COL_C  = 2;  // Amount Spent — first column (start of copy range)
const COL_AD = 29; // Sales Call Recordings — end of copy range (endIndex = 30)
// Meta API writes to: C (spend), D (frequency), E (reach), F (impressions), H (unique link clicks)
// Copied from previous row: G (CPM), I (unique CTR), J (cost per unique click), K:AD (manual cols)

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

/**
 * Copy C:AD from sourceRow → destRow (0-based indices).
 * This covers ALL data columns including CPM (G), Unique CTR (I),
 * Cost Per Unique Click (J), and the manual columns K:AD.
 * Meta API values are written afterward to overwrite C:F and H only.
 */
async function copyPrevRow(token: string, sheetId: number, srcIdx: number, dstIdx: number): Promise<void> {
  const body = {
    requests: [{
      copyPaste: {
        source:      { sheetId, startRowIndex: srcIdx, endRowIndex: srcIdx + 1, startColumnIndex: COL_C, endColumnIndex: COL_AD + 1 },
        destination: { sheetId, startRowIndex: dstIdx, endRowIndex: dstIdx + 1, startColumnIndex: COL_C, endColumnIndex: COL_AD + 1 },
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

/** Write a single range of values (USER_ENTERED so numbers stay numeric). */
async function writeRange(token: string, range: string, values: (string|number)[]): Promise<void> {
  const encoded = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encoded}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: [values] }) }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets write failed (${range}): ${JSON.stringify(json)}`);
}

/**
 * Write Meta API values to the target row.
 * C:F → Amount Spent, Frequency, Reach, Impressions
 * H   → Unique Link Clicks
 * G, I, J are intentionally skipped (kept from previous-row copy).
 */
async function writeMetaData(token: string, tab: string, rowNum: number, m: {
  spend: number; frequency: number; reach: number; impressions: number; unique_link_clicks: number;
}): Promise<void> {
  await writeRange(token, `'${tab}'!C${rowNum}:F${rowNum}`, [m.spend, m.frequency, m.reach, m.impressions]);
  await writeRange(token, `'${tab}'!H${rowNum}`,            [m.unique_link_clicks]);
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
  const todayISO       = process.env.META_ADS_TODAY_OVERRIDE     || getTodayISO();
  const yesterdayISO   = process.env.META_ADS_YESTERDAY_OVERRIDE || getYesterdayISO();
  const todaySheet     = toSheetDate(todayISO);     // e.g. "3/27/26"
  const yesterdaySheet = toSheetDate(yesterdayISO); // e.g. "3/26/26"
  const tab = process.env.META_ADS_SHEET_TAB || toTabName(todayISO);

  console.log(`Today: ${todayISO} ("${todaySheet}") | Yesterday: ${yesterdayISO} ("${yesterdaySheet}") | Tab: "${tab}"`);

  // 1. Auth + sheet metadata
  const token   = await getGoogleToken();
  const sheetId = await getSheetId(token, tab);
  console.log(`Sheet ID: ${sheetId}`);

  // 2. Read column B to locate both rows
  const colB = await readColumn(token, tab, "B");

  function findRow(dateStr: string): number {
    for (let i = 0; i < colB.length; i++) {
      if (colB[i].trim() === dateStr) return i + 1; // 1-based
    }
    throw new Error(`Date "${dateStr}" not found in column B. Check tab name or date format.`);
  }

  const yesterdayRow = findRow(yesterdaySheet);
  const todayRow     = findRow(todaySheet);
  console.log(`Yesterday row: ${yesterdayRow} | Today row: ${todayRow}`);

  // 3. Fetch both days' Meta data in parallel
  console.log(`Fetching Meta data for ${yesterdayISO} and ${todayISO}…`);
  const [metaYesterday, metaToday] = await Promise.all([
    fetchMeta(yesterdayISO),
    fetchMeta(todayISO),
  ]);
  console.log(`Yesterday Meta: spend=$${metaYesterday.spend} reach=${metaYesterday.reach}`);
  console.log(`Today Meta:     spend=$${metaToday.spend} reach=${metaToday.reach}`);

  // 4. Refresh yesterday's row with final accurate data (C:F and H)
  console.log(`Refreshing yesterday row ${yesterdayRow} with final data…`);
  await writeMetaData(token, tab, yesterdayRow, metaYesterday);
  console.log(`Yesterday row ${yesterdayRow}: updated.`);

  // 5. Copy C:AD from yesterday's row → today's row (formula propagation)
  console.log(`Copying C:AD from row ${yesterdayRow} → row ${todayRow}…`);
  await copyPrevRow(token, sheetId, yesterdayRow - 1, todayRow - 1); // 0-based
  console.log("Copy-paste: OK");

  // 6. Write today's current running Meta data to today's row (C:F and H)
  console.log(`Writing today's current data to row ${todayRow}…`);
  await writeMetaData(token, tab, todayRow, metaToday);

  console.log(`\n✓ Done.`);
  console.log(`  Row ${yesterdayRow} ("${yesterdaySheet}"): final data refreshed`);
  console.log(`  Row ${todayRow} ("${todaySheet}"):     current data written + formulas copied`);
}

main().catch(err => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
