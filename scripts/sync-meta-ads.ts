#!/usr/bin/env npx ts-node --esm
/**
 * scripts/sync-meta-ads.ts
 *
 * Standalone script for daily cron execution.
 * Fetches yesterday's Meta Ads metrics and appends one row to Google Sheets.
 *
 * ─── Setup ────────────────────────────────────────────────────────────────────
 *
 * 1. Meta Ads access
 *    a. Go to business.facebook.com → Settings → System Users
 *    b. Create a system user (Standard role)
 *    c. Grant it access to the ad account (ending in 498) with "Advertiser" or
 *       "Analyst" role
 *    d. Generate an access token with scope: ads_read
 *    e. Set META_ADS_ACCESS_TOKEN in your environment
 *    f. Set META_ADS_ACCOUNT_ID to your full account ID (e.g. 1234567890498)
 *
 * 2. Google Sheets write access
 *    a. Go to console.cloud.google.com → IAM & Admin → Service Accounts
 *    b. Create a service account, download the JSON key
 *    c. Share your target spreadsheet with the service account email (Editor)
 *    d. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *    e. Set META_ADS_SPREADSHEET_ID to the target spreadsheet ID
 *    f. Optionally set META_ADS_SHEET_NAME (default: "META ADS")
 *
 * ─── Running manually ─────────────────────────────────────────────────────────
 *
 *   npx ts-node --esm scripts/sync-meta-ads.ts
 *
 * ─── Cron example (6 AM UTC daily) ───────────────────────────────────────────
 *
 *   0 6 * * * cd /path/to/project && npx ts-node --esm scripts/sync-meta-ads.ts >> /var/log/meta-ads-sync.log 2>&1
 *
 *   Or with compiled JS:
 *   0 6 * * * cd /path/to/project && node dist/scripts/sync-meta-ads.js >> /var/log/meta-ads-sync.log 2>&1
 *
 * ─── Environment variables ────────────────────────────────────────────────────
 *
 *   META_ADS_ACCESS_TOKEN         – Meta system user token (ads_read)
 *   META_ADS_ACCOUNT_ID           – Ad account ID (with or without "act_" prefix)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  – Service account email
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY – Private key (replace \n literals with real newlines)
 *   META_ADS_SPREADSHEET_ID       – Target Google Sheets ID
 *   META_ADS_SHEET_NAME           – Sheet/tab name (default: "META ADS")
 */

// Load .env.local if present (for local development)
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

import { fetchMetaAdsInsights, getYesterdayDate, type MetaAdsInsights } from "../lib/meta-ads.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.META_ADS_SPREADSHEET_ID ?? "";
const SHEET_NAME = process.env.META_ADS_SHEET_NAME ?? "META ADS";
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

// ─── Google Sheets auth (JWT / service account) ───────────────────────────────

/**
 * Minimal JWT creation for Google service account auth without external deps.
 * Builds a signed JWT and exchanges it for an OAuth2 access token.
 */
async function getGoogleAccessToken(): Promise<string> {
  if (!SA_EMAIL || !SA_KEY) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: SA_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: expiry,
    })
  ).toString("base64url");

  const unsigned = `${header}.${payload}`;

  // Use Node.js built-in crypto to sign with RS256
  const { createSign } = await import("crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const sig = signer.sign(SA_KEY, "base64url");

  const jwt = `${unsigned}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Google token error: ${JSON.stringify(tokenJson)}`);
  }

  return tokenJson.access_token as string;
}

// ─── Sheet helpers ────────────────────────────────────────────────────────────

/** Fetch all values from the sheet to determine the next empty row. */
async function getSheetValues(token: string): Promise<string[][]> {
  const range = encodeURIComponent(`${SHEET_NAME}!A:A`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets read error: ${JSON.stringify(json)}`);
  return (json.values ?? []) as string[][];
}

/**
 * Append a single row to the sheet.
 * Uses `valueInputOption=USER_ENTERED` so formulas and number formats work.
 */
async function appendRow(token: string, row: (string | number)[]): Promise<void> {
  const range = encodeURIComponent(`${SHEET_NAME}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets append error: ${JSON.stringify(json)}`);
}

// ─── Row builder ─────────────────────────────────────────────────────────────

/**
 * Maps MetaAdsInsights to the column order expected by the sheet:
 *
 * Date | Amount Spent | Purchases | Cost Per Purchase | Link Clicks |
 * Impressions | Reach | Frequency | CPM | CTR (All) | Unique Link Clicks |
 * CPC (All) | ROAS | Revenue | Cost Per Acquisition
 */
function buildSheetRow(date: string, m: MetaAdsInsights): (string | number)[] {
  return [
    date,
    m.spend,
    m.purchases,
    m.cost_per_purchase,
    m.link_clicks,
    m.impressions,
    m.reach,
    m.frequency,
    m.cpm,
    m.ctr,
    m.unique_link_clicks,
    m.cpc,
    m.roas,
    m.revenue,
    m.cost_per_acquisition,
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const date = getYesterdayDate();
  console.log(`[meta-ads-sync] Fetching insights for ${date}…`);

  // 1. Fetch Meta Ads data
  const insights = await fetchMetaAdsInsights(date);
  console.log(`[meta-ads-sync] Fetched: spend=$${insights.spend} purchases=${insights.purchases} roas=${insights.roas}`);

  if (!SPREADSHEET_ID) {
    console.log("[meta-ads-sync] META_ADS_SPREADSHEET_ID not set — skipping Sheets write.");
    console.log("[meta-ads-sync] Row that would have been written:", buildSheetRow(date, insights));
    return;
  }

  // 2. Authenticate with Google
  console.log("[meta-ads-sync] Authenticating with Google Sheets…");
  const googleToken = await getGoogleAccessToken();

  // 3. Check current row count (informational)
  const existing = await getSheetValues(googleToken);
  const nextRow = existing.length + 1;
  console.log(`[meta-ads-sync] Sheet has ${existing.length} rows; new data goes to row ${nextRow}`);

  // 4. Append row
  const row = buildSheetRow(date, insights);
  await appendRow(googleToken, row);
  console.log(`[meta-ads-sync] Successfully appended row for ${date}:`, row);
}

main().catch((err) => {
  console.error("[meta-ads-sync] FATAL:", err);
  process.exit(1);
});
