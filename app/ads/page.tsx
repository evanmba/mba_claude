import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreativeTable } from "@/components/ads/AdSetsView";
import { fetchCreativeAttribution } from "@/lib/attribution";
import type { AdWindow } from "@/lib/meta";

export const dynamic = "force-dynamic";

const WINDOWS: { key: AdWindow; label: string }[] = [
  { key: "4d",    label: "4 Days"  },
  { key: "7d",    label: "7 Days"  },
  { key: "14d",   label: "14 Days" },
  { key: "month", label: "Month"   },
];

async function TableLoader({ window }: { window: AdWindow }) {
  const data = await fetchCreativeAttribution(window);
  return <CreativeTable data={data} window={window} />;
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0,1,2,3,4].map((i) => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: "#0b1628", opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const params = await searchParams;
  const window = (WINDOWS.find((w) => w.key === params.w)?.key ?? "7d") as AdWindow;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Ad Creative Performance
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Spend from CBO Winners · calls from Call Source sheet
          </p>
        </div>

        {/* Period tabs — client-side nav via links */}
        <div className="flex rounded-lg overflow-hidden self-start" style={{ border: "1px solid var(--border)" }}>
          {WINDOWS.map((w) => (
            <a
              key={w.key}
              href={`/ads?w=${w.key}`}
              className="px-4 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: window === w.key ? "#3b82f6" : "var(--card)",
                color: window === w.key ? "#fff" : "var(--muted-foreground)",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {w.label}
            </a>
          ))}
        </div>

        <Suspense fallback={<TableSkeleton />}>
          <TableLoader window={window} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
