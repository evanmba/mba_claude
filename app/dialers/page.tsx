import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Phone } from "lucide-react";
import {
  GOALS_DATA, SPEED_TO_LEAD, TEAM_MONTHLY, DIALER_METRICS, DIALERS,
} from "@/lib/dialer-data";
import DialerClient from "./DialerClient";

// Attempt to fetch from Google Sheets API; fall back to mock data.
async function getDialerData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/dialers`, { next: { revalidate: 300 } });
    if (res.ok) return res.json();
  } catch {
    // fall through to mock
  }
  return {
    source: "mock",
    goals: GOALS_DATA,
    speedToLead: SPEED_TO_LEAD,
    teamMonthly: TEAM_MONTHLY,
    dialerMetrics: DIALER_METRICS,
    dialers: DIALERS,
  };
}

export default async function DialersPage() {
  const data = await getDialerData();

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
