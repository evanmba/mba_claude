import { NextResponse } from "next/server";
import { fetchCSV, parseEmailData } from "@/lib/sheets";

const EMAIL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQa0nFBHXMQn5zfiYq3ywzwWQ4VegoPw9tLQDS7BQfoXvLoeXHcDdSzKTD-XaDRsB7nNEuTfrF62c1x/pub?output=csv";

export async function GET() {
  try {
    const rows = await fetchCSV(EMAIL_CSV_URL, { cache: "no-store" });
    const data = parseEmailData(rows);
    return NextResponse.json({ ok: true, data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
