import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdSetsView } from "@/components/ads/AdSetsView";
import { fetchAdSetsData } from "@/lib/adsets";

export const revalidate = 120;

async function AdSetsLoader() {
  const data = await fetchAdSetsData();
  return <AdSetsView data={data} />;
}

function AdSetsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map((i) => (
          <div key={i} style={{ height: 80, borderRadius: 12, background: "#0b1628" }} />
        ))}
      </div>
      <div style={{ height: 420, borderRadius: 16, background: "#0b1628" }} />
    </div>
  );
}

export default function AdsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>Ad Attribution</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Per ad set · cost per lead, call, deal and revenue
          </p>
        </div>
        <Suspense fallback={<AdSetsSkeleton />}>
          <AdSetsLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
