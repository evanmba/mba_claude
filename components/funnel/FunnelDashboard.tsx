"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ChevronDown } from "lucide-react";
import { type FunnelData } from "@/lib/funnel";
import { ScoreboardView } from "./ScoreboardView";

const MONTH_ABBRS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

/** All available months from JAN 2026 through current month, newest first. */
function getAvailableMonths(): string[] {
  const now = new Date();
  const months: string[] = [];
  let year = 2026, month = 0; // start: Jan 2026
  while (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth())) {
    months.push(`${MONTH_ABBRS[month]} ${year}`);
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return months.reverse();
}

interface Props {
  data: FunnelData | null;
  error: boolean;
}

export function FunnelDashboard({ data, error }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const availableMonths = getAvailableMonths();
  const currentMonth = data?.monthLabel ?? availableMonths[0] ?? "";

  function refresh() {
    startTransition(() => { router.refresh(); });
  }

  function selectMonth(month: string) {
    setDropdownOpen(false);
    const isCurrentMonth = month === availableMonths[0]; // most recent = current
    const url = isCurrentMonth ? "/funnel" : `/funnel?month=${encodeURIComponent(month)}`;
    startTransition(() => { router.push(url); });
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Funnel Dashboard
          </h1>
          {currentMonth && (
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              {currentMonth}
            </p>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Month selector */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                cursor: "pointer",
                minWidth: 110,
              }}>
              <span className="truncate">{currentMonth}</span>
              <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  onClick={() => setDropdownOpen(false)}
                />
                {/* Dropdown */}
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20,
                    background: "#0f172a", border: "1px solid var(--border)", borderRadius: 8,
                    minWidth: 130, maxHeight: 260, overflowY: "auto",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}>
                  {availableMonths.map((m) => (
                    <button
                      key={m}
                      onClick={() => selectMonth(m)}
                      className="w-full text-left px-3 py-2 text-xs"
                      style={{
                        background: m === currentMonth ? "rgba(59,130,246,0.15)" : "transparent",
                        color: m === currentMonth ? "#3b82f6" : "var(--foreground)",
                        fontWeight: m === currentMonth ? 600 : 400,
                        display: "block",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
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
