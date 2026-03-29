"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { type FunnelData } from "@/lib/funnel";
import { ScoreboardView } from "./ScoreboardView";

interface Props {
  data: FunnelData | null;
  error: boolean;
}

export function FunnelDashboard({ data, error }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => { router.refresh(); });
  }

  return (
    <div style={{ padding: "24px" }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Funnel Dashboard
          </h1>
          {data?.monthLabel && (
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              {data.monthLabel}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: isPending ? "var(--muted-foreground)" : "var(--foreground)",
            cursor: isPending ? "not-allowed" : "pointer",
          }}>
          <RefreshCw size={13} style={{ color: "#3b82f6", animation: isPending ? "spin 0.8s linear infinite" : "none" }} />
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
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
        prevMonthly={data?.prevMonthly ?? []}
        ytd={data?.ytd ?? []}
        ytd2025={data?.ytd2025 ?? []}
        monthLabel={data?.monthLabel ?? ""}
        prevMonthLabel={data?.prevMonthLabel ?? ""}
      />
    </div>
  );
}
