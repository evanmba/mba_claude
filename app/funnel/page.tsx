import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FunnelDashboard } from "@/components/funnel/FunnelDashboard";
import { fetchFunnelData, type FunnelData } from "@/lib/funnel";

export default async function FunnelPage() {
  let data: FunnelData | null = null;
  let fetchError = false;

  try {
    data = await fetchFunnelData();
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
