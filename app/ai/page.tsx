import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdsAIChat } from "@/components/ads/AdsAIChat";

export default function AIPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            AI Assistant
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Funnel, ad attribution, landing page split test, and sales
          </p>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <AdsAIChat />
        </div>
      </div>
    </DashboardLayout>
  );
}
