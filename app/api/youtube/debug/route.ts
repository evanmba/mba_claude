import { NextResponse } from "next/server";

const SHEETS_API_KEY    = process.env.GOOGLE_SHEETS_API_KEY ?? "";
const YT_SPREADSHEET_ID = process.env.GOOGLE_YT_SPREADSHEET_ID ?? "";
const YT_DATA_SHEET     = process.env.GOOGLE_YT_DATA_SHEET ?? "DATA";

export async function GET() {
  if (!SHEETS_API_KEY || !YT_SPREADSHEET_ID) {
    return NextResponse.json({ error: "Missing env vars", SHEETS_API_KEY: !!SHEETS_API_KEY, YT_SPREADSHEET_ID: !!YT_SPREADSHEET_ID });
  }

  const range = encodeURIComponent(`'${YT_DATA_SHEET}'`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${YT_SPREADSHEET_ID}` +
    `?includeGridData=true&ranges=${range}&key=${SHEETS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `API ${res.status}`, body: text });
  }

  const json = await res.json();
  const rowData = json.sheets?.[0]?.data?.[0]?.rowData ?? [];

  // Return headers + first 3 rows with ALL cell fields visible
  const headers = (rowData[0]?.values ?? []).map((c: Record<string, unknown>, i: number) => ({
    index: i,
    formattedValue: c.formattedValue,
    hyperlink: c.hyperlink,
  }));

  const sampleRows = rowData.slice(1, 4).map((row: { values?: Record<string, unknown>[] }, ri: number) => ({
    rowIndex: ri + 1,
    cells: (row.values ?? []).map((c: Record<string, unknown>, ci: number) => ({
      col: ci,
      formattedValue: c.formattedValue,
      hyperlink: c.hyperlink,
      userEnteredValue: c.userEnteredValue,
    })).filter((c: { formattedValue?: unknown; hyperlink?: unknown }) => c.formattedValue || c.hyperlink),
  }));

  return NextResponse.json({ sheetName: YT_DATA_SHEET, headers, sampleRows });
}
