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
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");

  async function refresh() {
    setSyncStatus("syncing");
    try {
      // 1. Push today's live Meta Ads data to the Google Sheet
      const res = await fetch("/api/meta-ads/refresh-today");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[refresh] Meta sync failed:", body);
        setSyncStatus("error");
      } else {
        setSyncStatus("done");
      }
    } catch (e) {
      console.error("[refresh] Meta sync error:", e);
      setSyncStatus("error");
    }
    // 2. Re-fetch the sheet data to update the dashboard
    startTransition(() => { router.refresh(); });
    setTimeout(() => setSyncStatus("idle"), 3000);
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
          disabled={isPending || syncStatus === "syncing"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{
            background: syncStatus === "done" ? "rgba(34,197,94,0.1)" : syncStatus === "error" ? "rgba(239,68,68,0.1)" : "var(--card)",
            border: `1px solid ${syncStatus === "done" ? "rgba(34,197,94,0.3)" : syncStatus === "error" ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
            color: syncStatus === "done" ? "#22c55e" : syncStatus === "error" ? "#ef4444" : isPending || syncStatus === "syncing" ? "var(--muted-foreground)" : "var(--foreground)",
            cursor: isPending || syncStatus === "syncing" ? "not-allowed" : "pointer",
          }}>
          <RefreshCw size={13} style={{ color: syncStatus === "done" ? "#22c55e" : syncStatus === "error" ? "#ef4444" : "#3b82f6", animation: isPending || syncStatus === "syncing" ? "spin 0.8s linear infinite" : "none" }} />
          {syncStatus === "syncing" ? "Syncing Meta…" : syncStatus === "done" ? "Synced!" : syncStatus === "error" ? "Sync failed" : isPending ? "Refreshing…" : "Refresh"}
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
