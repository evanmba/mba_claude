import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreativeTable } from "@/components/ads/AdSetsView";
import { fetchCreativeAttribution } from "@/lib/attribution";

export const dynamic = "force-dynamic";

async function TableLoader() {
  const data = await fetchCreativeAttribution();
  return <CreativeTable data={data} />;
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: "#0b1628", opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export default async function AdsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Ad Creative Performance
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Spend per window from Meta CBO Winners · booked/shown/deals from Call Source (30 days)
          </p>
        </div>
        <Suspense fallback={<TableSkeleton />}>
          <TableLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
