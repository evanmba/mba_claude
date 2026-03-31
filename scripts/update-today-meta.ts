/**
 * scripts/update-today-meta.ts
 *
 * Runs every 30 minutes throughout the day.
 * Finds today's row in the sheet and refreshes:
 *   C – Amount Spent
 *   D – Frequency
 *   E – Reach
 *   F – Impressions
 *   H – Unique Link Clicks
 *
 * No copy-paste, no formula propagation — just a live data refresh.
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

const SPREADSHEET_ID = process.env.MASTER_TRACKER_SHEET_ID ?? "";
const SA_EMAIL       = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY         = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const META_TOKEN     = process.env.META_ADS_ACCESS_TOKEN ?? "";
const META_ACCOUNT   = process.env.META_ADS_ACCOUNT_ID ?? "";

if (!SPREADSHEET_ID) throw new Error("MASTER_TRACKER_SHEET_ID is not set");
if (!SA_EMAIL)       throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not set");
if (!SA_KEY)         throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set");
if (!META_TOKEN)     throw new Error("META_ADS_ACCESS_TOKEN is not set");
if (!META_ACCOUNT)   throw new Error("META_ADS_ACCOUNT_ID is not set");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google auth failed: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

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

async function writeRange(token: string, range: string, values: (string|number)[]): Promise<void> {
  const encoded = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encoded}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: [values] }) }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets write failed (${range}): ${JSON.stringify(json)}`);
}

// ─── Meta API ─────────────────────────────────────────────────────────────────

async function fetchTodayMeta(date: string) {
  const accountId = META_ACCOUNT.startsWith("act_") ? META_ACCOUNT : `act_${META_ACCOUNT}`;
  const params = new URLSearchParams({
    access_token: META_TOKEN,
    fields: "spend,frequency,reach,impressions,unique_actions",
    time_range: JSON.stringify({ since: date, until: date }),
    level: "account",
    limit: "1",
  });
  const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(`Meta API failed: ${json?.error?.message ?? JSON.stringify(json)}`);

  const row = (json.data ?? [])[0] ?? {};
  const ua: { action_type: string; value: string }[] = row.unique_actions ?? [];
  const findAction = (type: string) => parseFloat(ua.find(a => a.action_type === type)?.value ?? "0") || 0;

  return {
    spend:               parseFloat(row.spend       ?? "0") || 0,
    frequency:           parseFloat(row.frequency   ?? "0") || 0,
    reach:               parseFloat(row.reach       ?? "0") || 0,
    impressions:         parseFloat(row.impressions ?? "0") || 0,
    unique_link_clicks:  findAction("link_click"),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const todayISO   = process.env.META_ADS_TODAY_OVERRIDE || getTodayISO();
  const todaySheet = toSheetDate(todayISO);
  const tab        = process.env.META_ADS_SHEET_TAB || toTabName(todayISO);
  const now        = new Date().toISOString();

  console.log(`[${now}] Updating today's row: "${todaySheet}" in "${tab}"`);

  const token = await getGoogleToken();

  // Find today's row
  const colB = await readColumn(token, tab, "B");
  let targetRow = -1;
  for (let i = 0; i < colB.length; i++) {
    if (colB[i].trim() === todaySheet) { targetRow = i + 1; break; }
  }
  if (targetRow < 0) throw new Error(`Date "${todaySheet}" not found in column B of "${tab}"`);
  console.log(`Found row: ${targetRow}`);

  // Fetch today's live Meta data
  const m = await fetchTodayMeta(todayISO);
  console.log(`Meta: spend=$${m.spend} freq=${m.frequency} reach=${m.reach} impressions=${m.impressions} clicks=${m.unique_link_clicks}`);

  // Write C:F (spend, frequency, reach, impressions) and H (unique link clicks)
  await writeRange(token, `'${tab}'!C${targetRow}:F${targetRow}`, [m.spend, m.frequency, m.reach, m.impressions]);
  await writeRange(token, `'${tab}'!H${targetRow}`, [m.unique_link_clicks]);

  console.log(`✓ Row ${targetRow} updated at ${now}`);
}

main().catch(err => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
