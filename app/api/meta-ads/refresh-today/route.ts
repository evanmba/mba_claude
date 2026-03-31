export const runtime = "nodejs";

/**
 * GET /api/meta-ads/refresh-today
 *
 * Called by the Funnel Dashboard refresh button.
 * 1. Fetches today's live Meta Ads metrics
 * 2. Writes them to the master tracker sheet (today's row, cols C:F + H)
 * 3. Returns the metrics as JSON so the UI can show what was written
 *
 * Required env vars (set in Vercel + GitHub secrets):
 *   META_ADS_ACCESS_TOKEN
 *   META_ADS_ACCOUNT_ID
 *   MASTER_TRACKER_SHEET_ID
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 */

import { NextResponse } from "next/server";
import { createSign } from "crypto";

// ─── Env ──────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.MASTER_TRACKER_SHEET_ID ?? "";
const SA_EMAIL       = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SA_KEY         = (process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "").replace(/\\n/g, "\n");
const META_TOKEN     = process.env.META_ADS_ACCESS_TOKEN ?? "";
const META_ACCOUNT   = process.env.META_ADS_ACCOUNT_ID ?? "";

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

// ─── Sheets helpers ───────────────────────────────────────────────────────────

async function readColumn(token: string, tab: string, col: string): Promise<string[]> {
  const range = encodeURIComponent(`'${tab}'!${col}:${col}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets read failed: ${JSON.stringify(json)}`);
  return ((json.values ?? []) as string[][]).map(r => r[0] ?? "");
}

async function writeRange(token: string, range: string, values: (string | number)[]): Promise<void> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    }
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
  const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?${params}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Meta API failed: ${json?.error?.message ?? JSON.stringify(json)}`);

  const row = (json.data ?? [])[0] ?? {};
  const ua: { action_type: string; value: string }[] = row.unique_actions ?? [];
  const findAction = (type: string) => parseFloat(ua.find(a => a.action_type === type)?.value ?? "0") || 0;

  return {
    spend:              parseFloat(row.spend       ?? "0") || 0,
    frequency:          parseFloat(row.frequency   ?? "0") || 0,
    reach:              parseFloat(row.reach       ?? "0") || 0,
    impressions:        parseFloat(row.impressions ?? "0") || 0,
    unique_link_clicks: findAction("link_click"),
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET() {
  const missingVars = [
    !SPREADSHEET_ID && "MASTER_TRACKER_SHEET_ID",
    !SA_EMAIL       && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    !SA_KEY         && "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    !META_TOKEN     && "META_ADS_ACCESS_TOKEN",
    !META_ACCOUNT   && "META_ADS_ACCOUNT_ID",
  ].filter(Boolean);

  if (missingVars.length > 0) {
    return NextResponse.json(
      { error: `Missing env vars: ${missingVars.join(", ")}` },
      { status: 503 }
    );
  }

  try {
    const todayISO   = getTodayISO();
    const todaySheet = toSheetDate(todayISO);
    const tab        = toTabName(todayISO);

    // 1. Fetch Meta data
    const meta = await fetchTodayMeta(todayISO);

    // 2. Auth + find today's row
    const token = await getGoogleToken();
    const colB  = await readColumn(token, tab, "B");

    let targetRow = -1;
    for (let i = 0; i < colB.length; i++) {
      if (colB[i].trim() === todaySheet) { targetRow = i + 1; break; }
    }
    if (targetRow < 0) {
      return NextResponse.json(
        { error: `Date "${todaySheet}" not found in column B of tab "${tab}"` },
        { status: 404 }
      );
    }

    // 3. Write C:F (spend, frequency, reach, impressions) + H (unique link clicks)
    await writeRange(token, `'${tab}'!C${targetRow}:F${targetRow}`, [
      meta.spend, meta.frequency, meta.reach, meta.impressions,
    ]);
    await writeRange(token, `'${tab}'!H${targetRow}`, [meta.unique_link_clicks]);

    return NextResponse.json({
      ok: true,
      date: todayISO,
      tab,
      row: targetRow,
      meta,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[meta-ads/refresh-today]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
