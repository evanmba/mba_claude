import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CalendarDays } from "lucide-react";
import CoverageCalendar from "./CoverageCalendar";

export default function CoveragePage() {
  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)" }}
            >
              <CalendarDays size={16} style={{ color: "#22c55e" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              Coverage Planner
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Drag &amp; drop 3-hour blocks to schedule setter coverage for the week
          </p>
        </div>
      </div>

      <CoverageCalendar />
    </DashboardLayout>
  );
}
