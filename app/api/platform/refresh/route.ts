import { NextResponse } from "next/server";
import { fetchCSV, parsePlatformData } from "@/lib/sheets";

const PLATFORM_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_WHM2ipG0ih1oyHyCUiZckUgkeyUiEks9SfGVns5VyYKSmsl_3QnMpDnRgBwMzm8fQ9OXn8B1rMuL/pub?output=csv";

export async function GET() {
  try {
    const rows = await fetchCSV(PLATFORM_CSV_URL, { cache: "no-store" });
    const data = parsePlatformData(rows);
    return NextResponse.json({ ok: true, data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
