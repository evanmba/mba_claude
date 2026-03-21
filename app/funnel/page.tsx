import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FunnelDashboard } from "@/components/funnel/FunnelDashboard";
import { fetchFunnelData, type FunnelData } from "@/lib/funnel";

export default async function FunnelPage() {
  const apiKey = process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
  let data: FunnelData | null = null;
  let fetchError = false;

  try {
    data = await fetchFunnelData(apiKey);
  } catch (err) {
    console.error("[funnel] fetch error:", err);
    fetchError = true;
  }

  return (
    <DashboardLayout>
      <FunnelDashboard data={data} error={fetchError} />
    </DashboardLayout>
  );
}
