/**
 * POST /api/meta-ads/sync
 *
 * HTTP-triggered sync endpoint. Fetches Meta Ads insights for the requested
 * date (defaults to yesterday) and appends the row to Google Sheets.
 *
 * Use this as the target for cron-based HTTP pings (e.g. GitHub Actions,
 * Vercel Cron, EasyCron) instead of the Node.js script when the app is
 * deployed serverlessly.
 *
 * Protect with a shared secret:
 *   Authorization: Bearer <SYNC_SECRET>
 *   or pass ?secret=<SYNC_SECRET> as a query param.
 *
 * Required env vars (same as scripts/sync-meta-ads.ts):
 *   META_ADS_ACCESS_TOKEN
 *   META_ADS_ACCOUNT_ID
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   META_ADS_SPREADSHEET_ID
 *   META_ADS_SHEET_NAME           (optional, default: "META ADS")
 *   SYNC_SECRET                   (optional but recommended)
 */

import { NextResponse } from "next/server";
import { fetchMetaAdsInsights, getYesterdayDate, isMetaAdsConnected } from "@/lib/meta-ads";
import { createSign } from "crypto";

// ─── Auth helper ─────────────────────────────────────────────────────────────

function isAuthorized(request: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return true; // no secret configured → open (not recommended in production)

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader === `Bearer ${secret}`) return true;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") === secret) return true;

  return false;
}

// ─── Google service-account JWT helper ───────────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const sig = signer.sign(key, "base64url");

  const jwt = `${unsigned}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Google token error: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

// ─── Sheets helpers ───────────────────────────────────────────────────────────

async function appendRow(
  googleToken: string,
  spreadsheetId: string,
  sheetName: string,
  row: (string | number)[]
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${googleToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Sheets append error: ${JSON.stringify(json)}`);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMetaAdsConnected()) {
    return NextResponse.json({ error: "Meta Ads not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? getYesterdayDate();

  try {
    // 1. Fetch Meta Ads insights
    const insights = await fetchMetaAdsInsights(date);

    const spreadsheetId = process.env.META_ADS_SPREADSHEET_ID ?? "";
    const sheetName = process.env.META_ADS_SHEET_NAME ?? "META ADS";

    // 2. Build row
    const row: (string | number)[] = [
      date,
      insights.spend,
      insights.purchases,
      insights.cost_per_purchase,
      insights.link_clicks,
      insights.impressions,
      insights.reach,
      insights.frequency,
      insights.cpm,
      insights.ctr,
      insights.unique_link_clicks,
      insights.cpc,
      insights.roas,
      insights.revenue,
      insights.cost_per_acquisition,
    ];

    // 3. Write to Sheets (if configured)
    let sheetsResult = "skipped (no spreadsheet ID)";
    if (spreadsheetId) {
      const googleToken = await getGoogleAccessToken();
      await appendRow(googleToken, spreadsheetId, sheetName, row);
      sheetsResult = `appended to "${sheetName}"`;
    }

    return NextResponse.json({
      ok: true,
      date,
      insights,
      sheets: sheetsResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[meta-ads/sync]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also support GET for easy browser testing (with secret param)
export async function GET(request: Request) {
  return POST(request);
}
