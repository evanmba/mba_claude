import { NextResponse } from "next/server";
import { fetchCSV, parseIGData, parsePostLogCSV, extractPostsFromSheet } from "@/lib/sheets";

const IG_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?output=csv";

const IG_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?gid=28382314&single=true&output=csv";

export async function GET() {
  try {
    const mainRows = await fetchCSV(IG_CSV_URL, { cache: "no-store" });
    const data = parseIGData(mainRows);

    try {
      const dataRows = await fetchCSV(IG_DATA_CSV_URL, { cache: "no-store" });
      const posts = parsePostLogCSV(dataRows);
      if (posts.length > 0) {
        data.posts = posts;
      } else {
        const fallback = extractPostsFromSheet(mainRows);
        if (fallback.length > 0) data.posts = fallback;
      }
    } catch {
      const fallback = extractPostsFromSheet(mainRows);
      if (fallback.length > 0) data.posts = fallback;
    }

    return NextResponse.json({ ok: true, data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
