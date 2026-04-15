import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdsPageClient } from "@/components/ads/AdsPageClient";

export const dynamic = "force-dynamic";

export default function AdsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Ad Performance
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Campaign → Ad Set → Ad Creative · Spend, Booked Calls &amp; Grade Quality
          </p>
        </div>
        <AdsPageClient />
      </div>
    </DashboardLayout>
  );
}
