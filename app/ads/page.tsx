import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SpendCards } from "@/components/ads/AdSetsView";
import { fetchMainCreativeSpend } from "@/lib/attribution";
import type { AdWindow } from "@/lib/attribution";

export const dynamic = "force-dynamic";

const VALID_WINDOWS: AdWindow[] = ["7d", "14d", "month"];

async function Cards({ window }: { window: AdWindow }) {
  const { cards, metaError } = await fetchMainCreativeSpend(window);
  return <SpendCards data={cards} window={window} metaError={metaError} />;
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div style={{ height: 32, width: 240, borderRadius: 8, background: "#0b1628" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 220, borderRadius: 16, background: "#0b1628" }} />
        ))}
      </div>
    </div>
  );
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const params = await searchParams;
  const window = (VALID_WINDOWS.includes(params.w as AdWindow) ? params.w : "7d") as AdWindow;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Ad Creative Spend
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            CBO Winners · calls from Call Source sheet
          </p>
        </div>
        <Suspense fallback={<CardsSkeleton />}>
          <Cards window={window} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
