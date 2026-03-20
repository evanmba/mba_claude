import { NextResponse } from "next/server";
import { fetchCSV, fetchSheetLinks, parseIGData, parsePostLogCSV, extractPostsFromSheet } from "@/lib/sheets";

const BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub";

const IG_CSV_URL      = `${BASE}?output=csv`;
const IG_DATA_CSV_URL = `${BASE}?gid=28382314&single=true&output=csv`;
const IG_DATA_HTML_URL = `${BASE}?gid=28382314&single=true&output=html`;

export async function GET() {
  try {
    // Fetch main sheet + IG DATA csv + IG DATA html (for embedded links) in parallel
    const [mainRows, dataRows, linkMap] = await Promise.all([
      fetchCSV(IG_CSV_URL, { cache: "no-store" }),
      fetchCSV(IG_DATA_CSV_URL, { cache: "no-store" }).catch(() => [] as string[][]),
      fetchSheetLinks(IG_DATA_HTML_URL),
    ]);

    const data = parseIGData(mainRows);

    // Parse posts from DATA tab (or fall back to main sheet)
    let posts = parsePostLogCSV(dataRows);
    if (posts.length === 0) posts = extractPostsFromSheet(mainRows);
    if (posts.length === 0) posts = data.posts;

    // Enrich each post with the hyperlink embedded in its title cell
    data.posts = posts.map((p) => ({
      ...p,
      url: p.url || linkMap.get(p.title) || linkMap.get(p.title.trim()) || "",
    }));

    return NextResponse.json({ ok: true, data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
