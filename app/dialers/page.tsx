import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Phone } from "lucide-react";
import { getDialerDashboardData } from "@/lib/dialers-fetch";
import DialerClient from "./DialerClient";

export default async function DialersPage() {
  const data = await getDialerDashboardData();

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <Phone size={16} style={{ color: "#3b82f6" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              Setter Dashboard
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Team dialing performance, individual metrics, and speed to lead tracking
          </p>
        </div>
      </div>

      <DialerClient data={data} />
    </DashboardLayout>
  );
}
