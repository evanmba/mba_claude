/**
 * scripts/backfill-campaign-ads.ts
 *
 * One-time backfill: fetches daily Meta data for campaign 120255274601870699
 * from its start date to today, then upserts each day into the AD SPEND tab.
 *
 * Run manually via the "Backfill Campaign Ads" workflow_dispatch.
 *
 * Required env vars:
 *   META_ADS_ACCESS_TOKEN
 *   META_CAMPAIGN_ID          (default 120255274601870699)
 *   CAMPAIGN_TRACKER_SHEET_ID
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *
 * Optional:
 *   AD_SPEND_TAB_NAME   (default "AD SPEND")
 *   BACKFILL_START_DATE (YYYY-MM-DD, overrides auto-detect from Meta)
 */

import { createSign } from "crypto";

// ─── Env ──────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.CAMPAIGN_TRACKER_SHEET_ID ?? "";
const SA_EMAIL       = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY         = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const META_TOKEN     = process.env.META_ADS_ACCESS_TOKEN ?? "";
const CAMPAIGN_ID    = process.env.META_CAMPAIGN_ID ?? "120255274601870699";
const AD_SPEND_TAB   = process.env.AD_SPEND_TAB_NAME ?? "AD SPEND";

const missing = [
  !SPREADSHEET_ID && "CAMPAIGN_TRACKER_SHEET_ID",
  !SA_EMAIL       && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  !SA_KEY         && "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  !META_TOKEN     && "META_ADS_ACCESS_TOKEN",
].filter(Boolean);
if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-DD → M/D/YY  e.g. 2026-10-15 → "10/15/26" */
function toSheetDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(-2)}`;
}

/** Enumerate every YYYY-MM-DD from start to end inclusive */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T12:00:00Z");
  const last = new Date(end + "T12:00:00Z");
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
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

async function readColumn(token: string, tab: string, col: string): Promise<string[]> {
  const range = encodeURIComponent(`'${tab}'!${col}:${col}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json() as { values?: string[][] };
  if (!res.ok) throw new Error(`Sheets readColumn failed: ${JSON.stringify(json)}`);
  return ((json.values ?? []) as string[][]).map(r => r[0] ?? "");
}

async function writeRow(token: string, range: string, values: (string | number)[]): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`Sheets writeRow failed (${range}): ${JSON.stringify(json)}`);
}

async function appendRow(token: string, tab: string, values: (string | number)[]): Promise<void> {
  const range = encodeURIComponent(`'${tab}'!A:A`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    },
  );
  const json = await res.json() as { error?: unknown };
  if (!res.ok) throw new Error(`Sheets appendRow failed: ${JSON.stringify(json)}`);
}

// ─── Meta API ─────────────────────────────────────────────────────────────────

async function getCampaignStartDate(): Promise<string> {
  if (process.env.BACKFILL_START_DATE) return process.env.BACKFILL_START_DATE;

  const params = new URLSearchParams({ access_token: META_TOKEN, fields: "start_time" });
  const res = await fetch(`https://graph.facebook.com/v19.0/${CAMPAIGN_ID}?${params}`);
  const json = await res.json() as { start_time?: string; error?: { message: string } };
  if (!res.ok) throw new Error(`Meta campaign fetch failed: ${json?.error?.message ?? JSON.stringify(json)}`);
  if (!json.start_time) throw new Error("Campaign has no start_time");

  // start_time is ISO 8601 — take just the date part
  return json.start_time.slice(0, 10);
}

interface DailyMetrics {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  frequency: number;
  cpm: number;
  ctr: number;
  cpc: number;
}

async function fetchDailyMetrics(startDate: string, endDate: string): Promise<DailyMetrics[]> {
  const params = new URLSearchParams({
    access_token: META_TOKEN,
    fields: "spend,impressions,reach,frequency,cpm,actions",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    time_increment: "1",
    level: "campaign",
    limit: "500",
  });
  const res = await fetch(`https://graph.facebook.com/v19.0/${CAMPAIGN_ID}/insights?${params}`);
  const json = await res.json() as { data?: Record<string, unknown>[]; error?: { message: string } };
  if (!res.ok) throw new Error(`Meta insights failed: ${json?.error?.message ?? JSON.stringify(json)}`);

  return (json.data ?? []).map(row => {
    const actions = (row.actions ?? []) as { action_type: string; value: string }[];
    const n = (v: unknown) => parseFloat(v as string ?? "0") || 0;
    const linkClicks = parseFloat(actions.find(a => a.action_type === "link_click")?.value ?? "0") || 0;
    const spend = n(row.spend);
    const impressions = n(row.impressions);
    return {
      date: row.date_start as string,
      spend,
      impressions,
      reach: n(row.reach),
      linkClicks,
      frequency: n(row.frequency),
      cpm: n(row.cpm),
      ctr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
      cpc: linkClicks > 0 ? spend / linkClicks : 0,
    };
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const todayISO   = getTodayISO();
  const startDate  = await getCampaignStartDate();
  console.log(`\nCampaign ${CAMPAIGN_ID}`);
  console.log(`Backfill range: ${startDate} → ${todayISO}`);

  const allDates = dateRange(startDate, todayISO);
  console.log(`Total days: ${allDates.length}`);

  console.log("\nFetching daily metrics from Meta...");
  const metrics = await fetchDailyMetrics(startDate, todayISO);
  console.log(`Meta returned ${metrics.length} day(s) with data`);

  // Index metrics by date for fast lookup
  const byDate = new Map(metrics.map(m => [m.date, m]));

  const token = await getGoogleToken();
  console.log("Google auth: OK\n");

  // Read existing AD SPEND dates once
  const colA = await readColumn(token, AD_SPEND_TAB, "A");

  // Build a map: sheetDate → row number (1-based)
  const existingRows = new Map<string, number>();
  for (let i = 0; i < colA.length; i++) {
    const v = colA[i].trim();
    if (v) existingRows.set(v, i + 1);
  }

  let updated = 0, appended = 0, skipped = 0;

  for (const date of allDates) {
    const sheetDate = toSheetDate(date);
    const m = byDate.get(date);

    if (!m) {
      // No Meta data for this day (campaign may not have been active yet)
      skipped++;
      continue;
    }

    const rowValues: (string | number)[] = [
      sheetDate,
      m.spend,
      m.impressions,
      m.reach,
      m.linkClicks,
      m.frequency,
      m.cpm,
      m.ctr / 100,  // store as decimal for Sheets % format
      m.cpc,
    ];

    const existingRow = existingRows.get(sheetDate);
    if (existingRow) {
      await writeRow(token, `'${AD_SPEND_TAB}'!A${existingRow}:I${existingRow}`, rowValues);
      console.log(`  Updated row ${existingRow}: ${sheetDate} spend=$${m.spend.toFixed(2)}`);
      updated++;
    } else {
      await appendRow(token, AD_SPEND_TAB, rowValues);
      console.log(`  Appended: ${sheetDate} spend=$${m.spend.toFixed(2)}`);
      appended++;
    }
  }

  console.log(`\n=== Done: ${updated} updated, ${appended} appended, ${skipped} skipped (no Meta data) ===`);
}

main().catch(err => {
  console.error("[backfill-campaign-ads] ERROR:", err);
  process.exit(1);
});
