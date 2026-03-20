import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InstagramDashboard } from "@/components/instagram/InstagramDashboard";
import { fetchCSV, parseIGData, parsePostLogCSV, extractPostsFromSheet, type IGData } from "@/lib/sheets";

const IG_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?output=csv";

const IG_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?gid=28382314&single=true&output=csv";

export default async function InstagramPage() {
  let data: IGData = { monthly: [], averages: null, posts: [] };
  let fetchError = false;
  const fetchedAt = new Date().toISOString();

  let mainRows: string[][] = [];

  try {
    mainRows = await fetchCSV(IG_CSV_URL);
    data = parseIGData(mainRows);
  } catch {
    fetchError = true;
  }

  // Try dedicated DATA tab first; fall back to scanning the main sheet for a post section
  try {
    const dataRows = await fetchCSV(IG_DATA_CSV_URL);
    const posts = parsePostLogCSV(dataRows);
    if (posts.length > 0) {
      data = { ...data, posts };
    } else if (mainRows.length > 0) {
      const fallbackPosts = extractPostsFromSheet(mainRows);
      if (fallbackPosts.length > 0) data = { ...data, posts: fallbackPosts };
    }
  } catch {
    // DATA tab unreachable — try to extract posts from the main sheet rows
    if (mainRows.length > 0) {
      const fallbackPosts = extractPostsFromSheet(mainRows);
      if (fallbackPosts.length > 0) data = { ...data, posts: fallbackPosts };
    }
  }

  return (
    <DashboardLayout>
      <InstagramDashboard
        initialData={data}
        initialFetchError={fetchError}
        serverFetchedAt={fetchedAt}
      />
    </DashboardLayout>
  );
}
