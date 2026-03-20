import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InstagramDashboard } from "@/components/instagram/InstagramDashboard";
import { fetchCSV, parseIGData, parsePostLogCSV, type IGData } from "@/lib/sheets";

const IG_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?output=csv";

const IG_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?gid=28382314&single=true&output=csv";

export default async function InstagramPage() {
  let data: IGData = { monthly: [], averages: null, posts: [] };
  let fetchError = false;
  const fetchedAt = new Date().toISOString();

  try {
    const [rows, dataRows] = await Promise.all([
      fetchCSV(IG_CSV_URL),
      fetchCSV(IG_DATA_CSV_URL),
    ]);
    data = parseIGData(rows);
    const posts = parsePostLogCSV(dataRows);
    if (posts.length > 0) data = { ...data, posts };
  } catch {
    fetchError = true;
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
