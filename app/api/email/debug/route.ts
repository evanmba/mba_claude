import { NextResponse } from "next/server";

const SHEETS_API_KEY       = process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
const EMAIL_SPREADSHEET_ID = process.env.GOOGLE_EMAIL_SPREADSHEET_ID ?? "";
const EMAIL_DATA_SHEET     = process.env.GOOGLE_EMAIL_DATA_SHEET ?? "DATA";
const EMAIL_DATA_CSV_URL   = process.env.GOOGLE_EMAIL_DATA_CSV_URL ?? "";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1 — Sheets API: list all sheets + find DATA tab gid
  if (SHEETS_API_KEY && EMAIL_SPREADSHEET_ID) {
    const metaUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${EMAIL_SPREADSHEET_ID}` +
      `?key=${SHEETS_API_KEY}`;
    try {
      const res  = await fetch(metaUrl, { cache: "no-store" });
      const json = await res.json() as { sheets?: Array<{ properties: { title: string; sheetId: number } }> };
      const sheets = json.sheets?.map(s => ({ title: s.properties.title, gid: s.properties.sheetId })) ?? [];
      results.sheetsList = { status: res.status, ok: res.ok, sheets };
    } catch (e) {
      results.sheetsList = { status: String(e), ok: false };
    }

    // 2 — Sheets API: first 5 rows of DATA sheet values
    const valUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${EMAIL_SPREADSHEET_ID}` +
      `/values/${encodeURIComponent(EMAIL_DATA_SHEET + "!A1:L5")}?key=${SHEETS_API_KEY}`;
    try {
      const res  = await fetch(valUrl, { cache: "no-store" });
      const json = await res.json() as { values?: string[][] };
      results.sheetsDataPreview = { status: res.status, ok: res.ok, rows: json.values ?? [] };
    } catch (e) {
      results.sheetsDataPreview = { status: String(e), ok: false };
    }
  } else {
    results.sheetsList = { status: "skipped — missing GOOGLE_MASTER_SHEETS_API_KEY or GOOGLE_EMAIL_SPREADSHEET_ID", ok: false };
  }

  // 3 — Published CSV URL
  if (EMAIL_DATA_CSV_URL) {
    try {
      const res  = await fetch(EMAIL_DATA_CSV_URL, { cache: "no-store" });
      const text = await res.text();
      results.publishedCsv = { status: res.status, ok: res.ok, preview: text.slice(0, 400) };
    } catch (e) {
      results.publishedCsv = { status: String(e), ok: false };
    }
  } else {
    results.publishedCsv = { status: "skipped — GOOGLE_EMAIL_DATA_CSV_URL not set", ok: false };
  }

  return NextResponse.json({
    env: {
      hasApiKey:        !!SHEETS_API_KEY,
      hasSpreadsheetId: !!EMAIL_SPREADSHEET_ID,
      spreadsheetId:    EMAIL_SPREADSHEET_ID || "(not set)",
      dataSheet:        EMAIL_DATA_SHEET,
      publishedCsvUrl:  EMAIL_DATA_CSV_URL || "(not set)",
    },
    results,
  });
}
