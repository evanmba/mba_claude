import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InstagramDashboard } from "@/components/instagram/InstagramDashboard";
import {
  fetchCSV, parseIGData, parsePostLogCSV, extractPostsFromSheet,
  fetchPostsViaAPI, type IGData,
} from "@/lib/sheets";

const IG_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?output=csv";

const IG_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?gid=28382314&single=true&output=csv";

const SHEETS_API_KEY    = process.env.GOOGLE_SHEETS_API_KEY ?? "";
const SPREADSHEET_ID    = process.env.GOOGLE_SPREADSHEET_ID ?? "";
const DATA_SHEET_NAME   = process.env.GOOGLE_IG_DATA_SHEET ?? "DATA";

export default async function InstagramPage() {
  let data: IGData = { monthly: [], averages: null, posts: [] };
  let fetchError = false;
  const fetchedAt = new Date().toISOString();
  const currentMonth = new Date().toLocaleString("en-US", { month: "long" });

  let mainRows: string[][] = [];

  try {
    mainRows = await fetchCSV(IG_CSV_URL);
    data = parseIGData(mainRows);
  } catch {
    fetchError = true;
  }

  // ── Post log: try Sheets API (preserves hyperlinks) → CSV → fallback ─────
  let postsLoaded = false;

  if (SHEETS_API_KEY && SPREADSHEET_ID) {
    try {
      const posts = await fetchPostsViaAPI(SPREADSHEET_ID, DATA_SHEET_NAME, SHEETS_API_KEY);
      if (posts.length > 0) {
        data = { ...data, posts };
        postsLoaded = true;
      }
    } catch {
      // fall through to CSV
    }
  }

  if (!postsLoaded) {
    try {
      const dataRows = await fetchCSV(IG_DATA_CSV_URL);
      const posts = parsePostLogCSV(dataRows);
      if (posts.length > 0) {
        data = { ...data, posts };
        postsLoaded = true;
      }
    } catch {
      // fall through to main sheet scan
    }
  }

  if (!postsLoaded && mainRows.length > 0) {
    const fallbackPosts = extractPostsFromSheet(mainRows);
    if (fallbackPosts.length > 0) data = { ...data, posts: fallbackPosts };
  }

  return (
    <DashboardLayout>
      <InstagramDashboard
        initialData={data}
        initialFetchError={fetchError}
        serverFetchedAt={fetchedAt}
        currentMonth={currentMonth}
      />
    </DashboardLayout>
  );
}
