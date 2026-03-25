import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FunnelDashboard } from "@/components/funnel/FunnelDashboard";
import { fetchFunnelData, type FunnelData } from "@/lib/funnel";

async function FunnelDataLoader() {
  const apiKey = process.env.GOOGLE_MASTER_SHEETS_API_KEY ?? "";
  let data: FunnelData | null = null;
  let fetchError = false;
  try {
    data = await fetchFunnelData(apiKey);
  } catch (err) {
    console.error("[funnel] fetch error:", err);
    fetchError = true;
  }
  return <FunnelDashboard data={data} error={fetchError} />;
}

function FunnelSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ height: 28, width: 220, borderRadius: 6, background: "#1e293b", marginBottom: 8 }} />
      <div style={{ height: 16, width: 100, borderRadius: 4, background: "#1e293b", marginBottom: 32 }} />
      {[0, 1, 2, 3].map((s) => (
        <div key={s} style={{ marginBottom: 20 }}>
          <div style={{ height: 12, width: 140, borderRadius: 4, background: "#1e293b", marginBottom: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[0, 1, 2].map((c) => (
              <div key={c} style={{ height: 100, borderRadius: 12, background: "#0b1628" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FunnelPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<FunnelSkeleton />}>
        <FunnelDataLoader />
      </Suspense>
    </DashboardLayout>
  );
}
