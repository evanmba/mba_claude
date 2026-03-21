"use client";

import { type FunnelData } from "@/lib/funnel";
import { ScoreboardView } from "./ScoreboardView";

interface Props {
  data: FunnelData | null;
  error: boolean;
}

export function FunnelDashboard({ data, error }: Props) {
  return (
    <div style={{ padding: "24px" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Funnel Dashboard
        </h1>
        {data?.monthLabel && (
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {data.monthLabel}
          </p>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg p-4 mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          Could not load sheet data. Check tab names:&nbsp;
          <strong>{data?.monthLabel ?? "MAR 2026"}</strong>, <strong>2026</strong>.
        </div>
      )}

      <ScoreboardView
        scoreboard={data?.scoreboard ?? []}
        monthly={data?.monthly ?? []}
        ytd={data?.ytd ?? []}
        monthLabel={data?.monthLabel ?? ""}
      />
    </div>
  );
}
