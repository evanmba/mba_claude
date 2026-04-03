import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SpendCards } from "@/components/ads/AdSetsView";
import { fetchMainCreativeSpend } from "@/lib/attribution";

export const dynamic = "force-dynamic";

async function Cards() {
  const data = await fetchMainCreativeSpend();
  return <SpendCards data={data} />;
}

function CardsSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 200, borderRadius: 16, background: "#0b1628" }} />
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
            Ad Creative Spend
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            CBO Winners campaign · live from Meta
          </p>
        </div>
        <Suspense fallback={<CardsSkeleton />}>
          <Cards />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
