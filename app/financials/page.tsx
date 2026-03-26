import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FinancialsDashboard } from "@/components/financials/FinancialsDashboard";
import { fetchFinancialsData } from "@/lib/stripe-financials";
import { DollarSign } from "lucide-react";

export const dynamic = "force-dynamic"; // skeleton shows instantly; data cached 5 min via unstable_cache

async function FinancialsDataLoader() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  console.log("[financials] STRIPE_SECRET_KEY prefix:", key ? key.slice(0, 10) + "..." : "(empty)");
  const data = await fetchFinancialsData(key);
  return <FinancialsDashboard data={data} />;
}

function FinancialsSkeleton() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <div style={{ height: 28, width: 160, borderRadius: 6, background: "#1e293b", marginBottom: 8 }} />
        <div style={{ height: 14, width: 280, borderRadius: 4, background: "#1e293b" }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 110, borderRadius: 16, background: "#0b1628" }} />
        ))}
      </div>
      <div style={{ height: 320, borderRadius: 16, background: "#0b1628" }}>
        <div className="flex items-center gap-2 p-6">
          <DollarSign size={18} style={{ color: "#1e293b" }} />
          <div style={{ height: 16, width: 160, borderRadius: 4, background: "#1e293b" }} />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 52, margin: "0 24px", borderRadius: 8, background: "#1e293b", marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<FinancialsSkeleton />}>
        <FinancialsDataLoader />
      </Suspense>
    </DashboardLayout>
  );
}
