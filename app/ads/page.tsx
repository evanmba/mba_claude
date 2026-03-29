"use server";
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdSetsView } from "@/components/ads/AdSetsView";
import { fetchAttributionData } from "@/lib/attribution";
import type { MetaLevel } from "@/lib/meta";
import { RefreshButton } from "@/components/ads/RefreshButton";

export const revalidate = 120;

async function revalidateAds() {
  "use server";
  revalidatePath("/ads");
}

async function AttributionLoader({
  level,
  datePreset,
}: {
  level: MetaLevel;
  datePreset: string;
}) {
  const data = await fetchAttributionData(level, datePreset);
  return <AdSetsView data={data} />;
}

function AttributionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => <div key={i} style={{ height: 32, width: 90, borderRadius: 8, background: "#0b1628" }} />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map((i) => <div key={i} style={{ height: 72, borderRadius: 12, background: "#0b1628" }} />)}
      </div>
      <div style={{ height: 400, borderRadius: 16, background: "#0b1628" }} />
    </div>
  );
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; datePreset?: string }>;
}) {
  const params = await searchParams;
  const level = (params.level as MetaLevel) || "adset";
  const datePreset = params.datePreset || "this_month";

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>Ad Attribution</h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              Spend from Meta · funnel metrics from Call Source sheet
            </p>
          </div>
          <RefreshButton action={revalidateAds} />
        </div>
        <Suspense fallback={<AttributionSkeleton />}>
          <AttributionLoader level={level} datePreset={datePreset} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
