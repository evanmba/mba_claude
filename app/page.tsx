import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlatformDashboard } from "@/components/dashboard/PlatformDashboard";
import { fetchCSV, parsePlatformData, type PlatformData } from "@/lib/sheets";

const PLATFORM_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_WHM2ipG0ih1oyHyCUiZckUgkeyUiEks9SfGVns5VyYKSmsl_3QnMpDnRgBwMzm8fQ9OXn8B1rMuL/pub?output=csv";

export default async function DashboardPage() {
  let data: PlatformData = { rows: [] };
  let fetchError = false;
  const fetchedAt = new Date().toISOString();

  try {
    const rows = await fetchCSV(PLATFORM_CSV_URL);
    data = parsePlatformData(rows);
  } catch {
    fetchError = true;
  }

  return (
    <DashboardLayout>
      <PlatformDashboard
        initialData={data}
        initialError={fetchError}
        serverFetchedAt={fetchedAt}
      />
    </DashboardLayout>
  );
}
