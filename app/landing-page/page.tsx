import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LandingPageView } from "@/components/ads/LandingPageView";

export const dynamic = "force-dynamic";

export default function LandingPageSplitTest() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Landing Page Split Test
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Page 1 vs Page 2 · call quality scoring
          </p>
        </div>
        <LandingPageView />
      </div>
    </DashboardLayout>
  );
}
