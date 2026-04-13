"use client";

import { useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { EmailData, EmailMonthlyRow } from "@/lib/sheets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function momPct(curr: number, prev: number): string {
  if (!prev) return "";
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)}% vs last month`;
}

function trendDir(curr: number, prev: number | undefined): "up" | "down" | null {
  if (!prev) return null;
  return curr >= prev ? "up" : "down";
}

type SortDir = "asc" | "desc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortRows<T>(arr: T[], key: keyof T, dir: SortDir): T[] {
  return [...arr].sort((a, b) => {
    const av = a[key] as any, bv = b[key] as any;
    if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

// ─── Heat scale (matching YT/IG) ──────────────────────────────────────────────

const HEAT_STOPS: [number, number, number][] = [
  [255,  30,   0],
  [255, 140,   0],
  [255, 220,   0],
  [120, 120, 120],
  [ 22, 101,  52],
  [ 74, 222, 128],
  [ 57, 255,  20],
];

function heatColor(val: number, min: number, max: number): string {
  if (max <= min || isNaN(val)) return "var(--muted-foreground)";
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  const scaled = t * (HEAT_STOPS.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(lo + 1, HEAT_STOPS.length - 1);
  const u = scaled - lo;
  const [r1, g1, b1] = HEAT_STOPS[lo];
  const [r2, g2, b2] = HEAT_STOPS[hi];
  return `rgb(${Math.round(r1+(r2-r1)*u)},${Math.round(g1+(g2-g1)*u)},${Math.round(b1+(b2-b1)*u)})`;
}

function heatWeight(val: number, min: number, max: number): number {
  if (max <= min || isNaN(val)) return 400;
  return Math.round(400 + Math.max(0, Math.min(1, (val - min) / (max - min))) * 500);
}

function colStats(vals: number[]) {
  const nums = vals.filter((v) => !isNaN(v) && v > 0);
  if (!nums.length) return { min: 0, max: 0 };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

// ─── Sortable TH ──────────────────────────────────────────────────────────────

function Th({ label, col, activeCol, dir, onSort }: {
  label: string; col: string; activeCol: string | null; dir: SortDir; onSort: (c: string) => void;
}) {
  const active = col === activeCol;
  return (
    <th
      className="text-left py-2 pr-4 text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
      style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
      onClick={() => onSort(col)}
    >
      {label}{" "}
      <span style={{ opacity: active ? 1 : 0.35, fontSize: 10 }}>
        {active ? (dir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </th>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: "up" | "down" | null;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up"   && <TrendingUp   size={11} style={{ color: "#22c55e" }} />}
          {trend === "down" && <TrendingDown size={11} style={{ color: "#ef4444" }} />}
          <span className="text-xs" style={{
            color: trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "var(--muted-foreground)"
          }}>
            {sub}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Monthly Table (heat-colored, sortable, avg row in white) ─────────────────

type MonthKey = keyof Omit<EmailMonthlyRow, "month">;

function MonthlyTable({ monthly, yearlyAvg }: { monthly: EmailMonthlyRow[]; yearlyAvg: EmailMonthlyRow | null }) {
  const [sortCol, setSortCol]   = useState<MonthKey | null>(null);
  const [sortDir, setSortDir]   = useState<SortDir>("desc");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const onSort = (col: string) => {
    const k = col as MonthKey;
    if (sortCol === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(k); setSortDir("desc"); }
  };

  const filled = monthly.filter((m) => m.delivered > 0);
  const sorted: EmailMonthlyRow[] = sortCol ? sortRows(monthly, sortCol, sortDir) : monthly;
  const rows: Array<EmailMonthlyRow & { _isAvg?: true }> = yearlyAvg
    ? [...sorted, { ...yearlyAvg, _isAvg: true }]
    : sorted;

  if (filled.length === 0) return null;

  const heat = {
    delivered: colStats(filled.map((m) => m.delivered)),
    opens:     colStats(filled.map((m) => m.opens)),
    openPct:   colStats(filled.map((m) => m.openPct)),
    clicks:    colStats(filled.map((m) => m.clicks)),
    ctrPct:    colStats(filled.map((m) => m.ctrPct)),
  };

  const thProps = { activeCol: sortCol, dir: sortDir, onSort };
  const white = "#ffffff";

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>Monthly Performance</p>
      <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Email metrics by month · click headers to sort</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left py-2 pr-6 text-xs font-semibold whitespace-nowrap"
                style={{ color: "var(--muted-foreground)" }}>Month</th>
              <Th label="Delivered" col="delivered" {...thProps} />
              <Th label="Opens"     col="opens"     {...thProps} />
              <Th label="Open %"    col="openPct"   {...thProps} />
              <Th label="Clicks"    col="clicks"    {...thProps} />
              <Th label="CTR %"     col="ctrPct"    {...thProps} />
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const isAvg  = !!m._isAvg;
              const hovered = hoveredRow === i && !isAvg;
              return (
                <tr
                  key={i}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: isAvg
                      ? "rgba(255,255,255,0.04)"
                      : hovered
                      ? "rgba(255,255,255,0.03)"
                      : undefined,
                  }}
                >
                  <td className="py-2.5 pr-6 whitespace-nowrap font-medium"
                    style={{ color: isAvg ? white : "var(--foreground)" }}>
                    {m.month}
                  </td>
                  <td className="py-2.5 pr-6"
                    style={{ color: isAvg ? white : heatColor(m.delivered, heat.delivered.min, heat.delivered.max), fontWeight: isAvg ? 700 : heatWeight(m.delivered, heat.delivered.min, heat.delivered.max) }}>
                    {m.delivered ? fmtNum(m.delivered) : "—"}
                  </td>
                  <td className="py-2.5 pr-6"
                    style={{ color: isAvg ? white : heatColor(m.opens, heat.opens.min, heat.opens.max), fontWeight: isAvg ? 700 : heatWeight(m.opens, heat.opens.min, heat.opens.max) }}>
                    {m.opens ? fmtNum(m.opens) : "—"}
                  </td>
                  <td className="py-2.5 pr-6"
                    style={{ color: isAvg ? white : heatColor(m.openPct, heat.openPct.min, heat.openPct.max), fontWeight: isAvg ? 700 : heatWeight(m.openPct, heat.openPct.min, heat.openPct.max) }}>
                    {m.openPct ? `${m.openPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2.5 pr-6"
                    style={{ color: isAvg ? white : heatColor(m.clicks, heat.clicks.min, heat.clicks.max), fontWeight: isAvg ? 700 : heatWeight(m.clicks, heat.clicks.min, heat.clicks.max) }}>
                    {m.clicks || "—"}
                  </td>
                  <td className="py-2.5 pr-6"
                    style={{ color: isAvg ? white : heatColor(m.ctrPct, heat.ctrPct.min, heat.ctrPct.max), fontWeight: isAvg ? 700 : heatWeight(m.ctrPct, heat.ctrPct.min, heat.ctrPct.max) }}>
                    {m.ctrPct ? `${m.ctrPct.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface Props {
  initialData: EmailData;
  initialError: boolean;
  serverFetchedAt: string;
  currentMonth: string;
}

type RefreshState = "idle" | "loading" | "success" | "error";

export function EmailDashboard({ initialData, initialError, serverFetchedAt, currentMonth }: Props) {
  const [data, setData]           = useState<EmailData>(initialData);
  const [hasError, setHasError]   = useState(initialError);
  const [fetchedAt, setFetchedAt] = useState(serverFetchedAt);
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");

  const refresh = useCallback(async () => {
    setRefreshState("loading");
    try {
      const res  = await fetch("/api/email/refresh");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json.data);
      setFetchedAt(json.fetchedAt);
      setHasError(false);
      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 2500);
    } catch {
      setHasError(true);
      setRefreshState("error");
      setTimeout(() => setRefreshState("idle"), 3000);
    }
  }, []);

  const { monthly, yearlyAvg } = data;
  const filled = monthly.filter((m) => m.delivered > 0);
  const latest = monthly.find((m) => m.month.toLowerCase() === currentMonth.toLowerCase()) ?? null;
  const prev   = filled.filter((m) => m.month.toLowerCase() !== currentMonth.toLowerCase()).at(-1) ?? null;

  return (
    <>
      {/* Error banner */}
      {hasError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
          <AlertCircle size={16} />
          <span>Could not load email sheet data. Check that the CSV URL is still published.</span>
        </div>
      )}

      {/* Header: sync + refresh */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {refreshState === "success" ? (
            <><CheckCircle2 size={13} style={{ color: "#22c55e" }} /><span style={{ color: "#22c55e" }}>Updated just now</span></>
          ) : (
            <span>Last synced: {timeAgo(fetchedAt)}</span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshState === "loading"}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg hover:opacity-80 active:scale-95 disabled:opacity-50"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          <RefreshCw size={12} style={{ animation: refreshState === "loading" ? "spin 0.6s linear infinite" : undefined }} />
          {refreshState === "loading" ? "Syncing…" : "Refresh from Sheet"}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* KPI cards — current month with MoM comparison */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KPI
          label={`Delivered · ${currentMonth}`}
          value={latest?.delivered ? fmtNum(latest.delivered) : "—"}
          sub={latest?.delivered && prev ? momPct(latest.delivered, prev.delivered) : undefined}
          trend={latest?.delivered && prev ? trendDir(latest.delivered, prev.delivered) : null}
        />
        <KPI
          label={`Opens · ${currentMonth}`}
          value={latest?.opens ? fmtNum(latest.opens) : "—"}
          sub={latest?.opens && prev ? momPct(latest.opens, prev.opens) : undefined}
          trend={latest?.opens && prev ? trendDir(latest.opens, prev.opens) : null}
        />
        <KPI
          label={`Open % · ${currentMonth}`}
          value={latest?.openPct ? `${latest.openPct.toFixed(1)}%` : "—"}
          sub={latest?.openPct && prev ? momPct(latest.openPct, prev.openPct) : undefined}
          trend={latest?.openPct && prev ? trendDir(latest.openPct, prev.openPct) : null}
        />
        <KPI
          label={`Clicks · ${currentMonth}`}
          value={latest?.clicks ? fmtNum(latest.clicks) : "—"}
          sub={latest?.clicks && prev ? momPct(latest.clicks, prev.clicks) : undefined}
          trend={latest?.clicks && prev ? trendDir(latest.clicks, prev.clicks) : null}
        />
        <KPI
          label={`CTR % · ${currentMonth}`}
          value={latest?.ctrPct ? `${latest.ctrPct.toFixed(2)}%` : "—"}
          sub={latest?.ctrPct && prev ? momPct(latest.ctrPct, prev.ctrPct) : undefined}
          trend={latest?.ctrPct && prev ? trendDir(latest.ctrPct, prev.ctrPct) : null}
        />
      </div>

      {/* Monthly table */}
      <div className="mb-5">
        <MonthlyTable monthly={monthly} yearlyAvg={yearlyAvg} />
      </div>

      {/* Empty state */}
      {!hasError && filled.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}>
          <AlertCircle size={16} />
          <span>Sheet loaded but no monthly data found. Ensure the CSV URL points to the correct tab.</span>
        </div>
      )}
    </>
  );
}
