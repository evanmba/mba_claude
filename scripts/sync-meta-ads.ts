/**
 * scripts/sync-meta-ads.ts
 * Minimal version: auth → find/create row → write date + Meta API data.
 * Formula copy-paste is handled separately once this core flow is verified.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local for local development
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

// ─── Read env vars ────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.MASTER_TRACKER_SHEET_ID ?? "";
const SA_EMAIL       = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY         = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const META_TOKEN     = process.env.META_ADS_ACCESS_TOKEN ?? "";
const META_ACCOUNT   = process.env.META_ADS_ACCOUNT_ID ?? "";

console.log("=== ENV CHECK ===");
console.log("MASTER_TRACKER_SHEET_ID     :", SPREADSHEET_ID ? `set (${SPREADSHEET_ID.length} chars)` : "MISSING");
console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", SA_EMAIL       ? `set (${SA_EMAIL})` : "MISSING");
console.log("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:", SA_KEY  ? `set (${SA_KEY.length} chars)` : "MISSING");
console.log("META_ADS_ACCESS_TOKEN       :", META_TOKEN     ? `set (${META_TOKEN.length} chars)` : "MISSING");
console.log("META_ADS_ACCOUNT_ID         :", META_ACCOUNT   ? `set (${META_ACCOUNT})` : "MISSING");
console.log("=================");

if (!SPREADSHEET_ID) throw new Error("MASTER_TRACKER_SHEET_ID is not set");
if (!SA_EMAIL)       throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not set");
if (!SA_KEY)         throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not set");
if (!META_TOKEN)     throw new Error("META_ADS_ACCESS_TOKEN is not set");
if (!META_ACCOUNT)   throw new Error("META_ADS_ACCOUNT_ID is not set");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function toSheetDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

function getSheetTab(iso: string): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const d = new Date(iso + "T12:00:00Z");
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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

async function readCol(token: string, tab: string, col: string): Promise<string[]> {
  const range = encodeURIComponent(`'${tab}'!${col}:${col}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets read failed: ${JSON.stringify(json)}`);
  return ((json.values ?? []) as string[][]).map(r => r[0] ?? "");
}

async function writeRow(token: string, tab: string, rowNum: number, values: (string|number)[]): Promise<void> {
  const range = encodeURIComponent(`'${tab}'!B${rowNum}:J${rowNum}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets write failed: ${JSON.stringify(json)}`);
}

// ─── Meta API ─────────────────────────────────────────────────────────────────

async function fetchMetaInsights(date: string) {
  const accountId = META_ACCOUNT.startsWith("act_") ? META_ACCOUNT : `act_${META_ACCOUNT}`;
  const fields = [
    "spend", "frequency", "reach", "impressions", "cpm",
    "unique_link_clicks_ctr", "unique_actions", "cost_per_unique_action_type",
  ].join(",");

  const params = new URLSearchParams({
    access_token: META_TOKEN,
    fields,
    time_range: JSON.stringify({ since: date, until: date }),
    level: "account",
    limit: "1",
  });

  const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?${params}`, { cache: "no-store" } as RequestInit);
  const json = await res.json();
  if (!res.ok) throw new Error(`Meta API failed: ${json?.error?.message ?? JSON.stringify(json)}`);

  console.log("Meta API: OK");
  const row = (json.data ?? [])[0] ?? {};
  const uniqueActions: { action_type: string; value: string }[] = row.unique_actions ?? [];
  const uniqueCpa: { action_type: string; value: string }[] = row.cost_per_unique_action_type ?? [];

  const findAction = (arr: typeof uniqueActions, type: string) =>
    parseFloat(arr.find(a => a.action_type === type)?.value ?? "0") || 0;

  return {
    spend:                      parseFloat(row.spend ?? "0") || 0,
    frequency:                  parseFloat(row.frequency ?? "0") || 0,
    reach:                      parseFloat(row.reach ?? "0") || 0,
    impressions:                parseFloat(row.impressions ?? "0") || 0,
    cpm:                        parseFloat(row.cpm ?? "0") || 0,
    unique_link_clicks:         findAction(uniqueActions, "link_click"),
    unique_link_clicks_ctr:     parseFloat(row.unique_link_clicks_ctr ?? "0") || 0,
    cost_per_unique_link_click: findAction(uniqueCpa, "link_click"),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const date    = process.env.META_ADS_YESTERDAY_OVERRIDE || getYesterday();
  const dateStr = toSheetDate(date);
  const tab     = process.env.META_ADS_SHEET_TAB || getSheetTab(date);

  console.log(`Date: ${date} → "${dateStr}" | Tab: "${tab}"`);

  // 1. Google auth
  const token = await getGoogleToken();

  // 2. Read column B to find/determine target row
  const colB = await readCol(token, tab, "B");
  console.log(`Column B has ${colB.length} rows. First 5: [${colB.slice(0, 5).join(", ")}]`);

  // Check if date already exists (idempotent)
  let targetRow = -1;
  for (let i = 1; i < colB.length; i++) {
    if (colB[i].trim() === dateStr) { targetRow = i + 1; break; }
  }
  if (targetRow < 0) {
    // Find last non-empty row and use next
    let last = 1;
    for (let i = 1; i < colB.length; i++) {
      if (colB[i].trim() !== "") last = i + 1;
    }
    targetRow = last + 1;
  }
  console.log(`Target row: ${targetRow}`);

  // 3. Fetch Meta Ads data
  const m = await fetchMetaInsights(date);
  console.log("Meta insights:", m);

  // 4. Write B:J
  const values: (string|number)[] = [
    dateStr,                  // B – Date
    m.spend,                  // C – Amount Spent
    m.frequency,              // D – Frequency
    m.reach,                  // E – Reach
    m.impressions,            // F – Impressions
    m.cpm,                    // G – CPM
    m.unique_link_clicks,     // H – Unique Link Clicks
    m.unique_link_clicks_ctr, // I – Unique Link CTR
    m.cost_per_unique_link_click, // J – Cost Per Unique Link Click
  ];

  await writeRow(token, tab, targetRow, values);
  console.log(`✓ Written to row ${targetRow}:`, values);
}

main().catch(err => {
  console.error("FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
