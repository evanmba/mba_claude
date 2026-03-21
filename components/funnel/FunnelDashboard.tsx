"use client";

import { useState } from "react";
import { type FunnelData } from "@/lib/funnel";
import { MonthlyView } from "./MonthlyView";
import { YTDView } from "./YTDView";
import { ScoreboardView } from "./ScoreboardView";
import { BarChart2, Calendar } from "lucide-react";

type Tab = "scoreboard" | "ytd";

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "scoreboard", label: "Scoreboard", icon: BarChart2,  color: "#3b82f6" },
  { id: "ytd",        label: "YTD 2026",   icon: Calendar,   color: "#22c55e" },
];

interface Props {
  data: FunnelData | null;
  error: boolean;
}

export function FunnelDashboard({ data, error }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("scoreboard");

  return (
    <div style={{ padding: "24px" }}>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Funnel Dashboard
        </h1>
        {data?.monthLabel && (
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Current month: {data.monthLabel}
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-lg p-4 mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          Could not load sheet data. Make sure the Google Sheet is shared and tab names match:&nbsp;
          <strong>{data?.monthLabel ?? "MAR 2026"}</strong>, <strong>2026</strong>.
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ background: "var(--secondary)" }}
      >
        {TABS.map(({ id, label, icon: Icon, color }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: isActive ? "var(--card)" : "transparent",
                color: isActive ? color : "var(--muted-foreground)",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "scoreboard" && (
        <div className="flex flex-col gap-8">
          <ScoreboardView scoreboard={data?.scoreboard ?? []} />
          <MonthlyView
            monthly={data?.monthly ?? []}
            salesDashboard={data?.salesDashboard ?? null}
            monthLabel={data?.monthLabel ?? "—"}
            ytd={data?.ytd ?? []}
          />
        </div>
      )}
      {activeTab === "ytd" && <YTDView ytd={data?.ytd ?? []} />}
    </div>
  );
}
