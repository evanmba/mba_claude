import { NextResponse } from "next/server";

const SHEETS_API_KEY       = process.env.GOOGLE_SHEETS_API_KEY ?? "";
const EMAIL_SPREADSHEET_ID = process.env.GOOGLE_EMAIL_SPREADSHEET_ID ?? "";
const EMAIL_DATA_SHEET     = process.env.GOOGLE_EMAIL_DATA_SHEET ?? "DATA";
const EMAIL_DATA_CSV_URL   = process.env.GOOGLE_EMAIL_DATA_CSV_URL ?? "";

export async function GET() {
  const results: Record<string, { status: number | string; ok: boolean; preview?: string }> = {};

  // 1 — Sheets API
  if (SHEETS_API_KEY && EMAIL_SPREADSHEET_ID) {
    const range = encodeURIComponent(`'${EMAIL_DATA_SHEET}'`);
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${EMAIL_SPREADSHEET_ID}` +
      `?includeGridData=true&ranges=${range}&key=${SHEETS_API_KEY}`;
    try {
      const res  = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      results.sheetsApi = { status: res.status, ok: res.ok, preview: text.slice(0, 300) };
    } catch (e) {
      results.sheetsApi = { status: String(e), ok: false };
    }
  } else {
    results.sheetsApi = { status: "skipped — missing GOOGLE_SHEETS_API_KEY or GOOGLE_EMAIL_SPREADSHEET_ID", ok: false };
  }

  // 2 — Published CSV URL (GOOGLE_EMAIL_DATA_CSV_URL)
  if (EMAIL_DATA_CSV_URL) {
    try {
      const res  = await fetch(EMAIL_DATA_CSV_URL, { cache: "no-store" });
      const text = await res.text();
      results.publishedCsv = { status: res.status, ok: res.ok, preview: text.slice(0, 300) };
    } catch (e) {
      results.publishedCsv = { status: String(e), ok: false };
    }
  } else {
    results.publishedCsv = { status: "skipped — GOOGLE_EMAIL_DATA_CSV_URL not set in .env.local", ok: false };
  }

  // 3 — Export CSV fallback (hardcoded gid=1377726109)
  if (EMAIL_SPREADSHEET_ID) {
    const url = `https://docs.google.com/spreadsheets/d/${EMAIL_SPREADSHEET_ID}/export?format=csv&gid=1377726109`;
    try {
      const res  = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      results.csvExportFallback = { status: res.status, ok: res.ok, preview: text.slice(0, 300) };
    } catch (e) {
      results.csvExportFallback = { status: String(e), ok: false };
    }
  } else {
    results.csvExportFallback = { status: "skipped — GOOGLE_EMAIL_SPREADSHEET_ID not set", ok: false };
  }

  return NextResponse.json({
    env: {
      hasApiKey:        !!SHEETS_API_KEY,
      hasSpreadsheetId: !!EMAIL_SPREADSHEET_ID,
      spreadsheetId:    EMAIL_SPREADSHEET_ID || "(not set)",
      dataSheet:        EMAIL_DATA_SHEET,
      hasPublishedUrl:  !!EMAIL_DATA_CSV_URL,
    },
    results,
  });
}
