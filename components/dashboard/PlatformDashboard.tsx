"use client";

import { useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { PlatformData, PlatformGoals, PlatformMonthRow } from "@/lib/sheets";

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { key: "ig",       goalKey: "ig",       label: "Instagram",  color: "#d946ef", bg: "rgba(217,70,239,0.15)" },
  { key: "ytLong",   goalKey: "ytLong",   label: "YT Long",    color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  { key: "ytShorts", goalKey: "ytShorts", label: "YT Shorts",  color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  { key: "ytPosts",  goalKey: "ytPosts",  label: "YT Posts",   color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  { key: "fbPosts",  goalKey: "fbPosts",  label: "Facebook",   color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { key: "tiktok",   goalKey: "tiktok",   label: "TikTok",     color: "#14b8a6", bg: "rgba(20,184,166,0.15)" },
  { key: "x",        goalKey: "x",        label: "X",          color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
  { key: "podcasts", goalKey: "podcasts", label: "Podcasts",   color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { key: "email",    goalKey: "email",    label: "Email",      color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
] as const;

const LEAD_PLATFORMS = [
  { key: "igLeads",    label: "Instagram", color: "#d946ef", bg: "rgba(217,70,239,0.15)" },
  { key: "ytLeads",    label: "YouTube",   color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  { key: "fbLeads",    label: "Facebook",  color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { key: "ttLeads",    label: "TikTok",    color: "#14b8a6", bg: "rgba(20,184,166,0.15)" },
  { key: "emailLeads", label: "Email",     color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
] as const;

// Fallback monthly goals (used if sheet doesn't expose a GOALS row yet)
const FALLBACK_GOALS: PlatformGoals = {
  ig: 200, email: 25, ytLong: 13, ytShorts: 70,
  ytPosts: 20, fbPosts: 30, tiktok: 30, x: 30, podcasts: 13,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function pct(curr: number, prev: number) {
  if (!prev) return null;
  const d = ((curr - prev) / prev) * 100;
  return { val: `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`, up: d >= 0 };
}

function fmtValue(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

// ─── Bar row ─────────────────────────────────────────────────────────────────

/** Goal-aware bar: fills to current/goal, shows % inside + "current / goal" label */
function GoalBarRow({
  label, value, goal, color,
}: { label: string; value: number; goal: number; color: string }) {
  const fillPct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const done    = fillPct >= 100;
  const barColor = done ? "#22c55e" : color;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 flex-shrink-0 text-right" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
      <div className="flex-1 relative h-5 rounded-md overflow-hidden" style={{ background: "var(--secondary)" }}>
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
          style={{ width: `${fillPct}%`, background: barColor, opacity: 0.85 }}
        />
        {/* % label — inside if bar is wide enough, otherwise outside */}
        {fillPct > 18 ? (
          <span
            className="absolute inset-y-0 left-0 flex items-center pl-2 text-xs font-bold tabular-nums pointer-events-none"
            style={{ color: "#fff" }}
          >
            {Math.round(fillPct)}%
          </span>
        ) : (
          <span
            className="absolute inset-y-0 flex items-center text-xs font-bold tabular-nums pointer-events-none"
            style={{ left: `${fillPct + 1}%`, color: "var(--muted-foreground)" }}
          >
            {Math.round(fillPct)}%
          </span>
        )}
      </div>
      {/* current / goal */}
      <span className="text-xs tabular-nums flex-shrink-0 text-right" style={{ minWidth: "4rem" }}>
        <span className="font-semibold" style={{ color: value > 0 ? barColor : "var(--muted-foreground)" }}>
          {value}
        </span>
        <span style={{ color: "var(--muted-foreground)" }}> / {goal}</span>
      </span>
    </div>
  );
}

/** Relative bar: fills relative to max (used for leads where no goal exists) */
function BarRow({
  label, value, max, color,
}: { label: string; value: number; max: number; color: string; bg?: string }) {
  const fillPct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 flex-shrink-0 text-right" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: "var(--secondary)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${fillPct}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-semibold w-7 flex-shrink-0 text-right tabular-nums"
        style={{ color: value > 0 ? color : "var(--muted-foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function KPI({
  label, value, change, projected, progressPct,
}: {
  label: string;
  value: string;
  change: { val: string; up: boolean } | null;
  projected?: { value: string; dayPct: number };
  progressPct?: number;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>

      {/* Projected end-of-month */}
      {projected && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              on pace for
            </span>
            <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
              {projected.value} projected
            </span>
          </div>
          {/* Dual progress bar: month elapsed (muted) + content pace (amber) */}
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
            {/* Month elapsed */}
            <div
              className="absolute inset-y-0 left-0 rounded-full opacity-30"
              style={{ width: `${projected.dayPct}%`, background: "#f59e0b" }}
            />
            {/* Actual pace vs projected */}
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${Math.min((progressPct ?? 0), 100)}%`, background: "#f59e0b" }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            day {Math.round(projected.dayPct / 100 * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())} of {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}
          </p>
        </div>
      )}

      {change && !projected && (
        <div className="flex items-center gap-1 mt-1">
          {change.up
            ? <TrendingUp size={11} style={{ color: "#22c55e" }} />
            : <TrendingDown size={11} style={{ color: "#ef4444" }} />}
          <span className="text-xs font-medium" style={{ color: change.up ? "#22c55e" : "#ef4444" }}>
            {change.val} vs last month
          </span>
        </div>
      )}
      {change && projected && (
        <div className="flex items-center gap-1 mt-2">
          {change.up
            ? <TrendingUp size={11} style={{ color: "#22c55e" }} />
            : <TrendingDown size={11} style={{ color: "#ef4444" }} />}
          <span className="text-xs font-medium" style={{ color: change.up ? "#22c55e" : "#ef4444" }}>
            {change.val} vs last month
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Monthly history table ────────────────────────────────────────────────────

function HistoryTable({ rows }: { rows: PlatformMonthRow[] }) {
  const active = rows.filter((r) => r.totalPieces > 0 || r.totalLeads > 0);
  if (active.length === 0) return null;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>
        Monthly History
      </p>
      <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
        Pieces published and leads generated by month
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Month","IG","YT Long","YT Short","YT Posts","FB","TikTok","X","Pod","Email","Total Pieces","IG Leads","YT Leads","FB Leads","TT Leads","Email Leads","Total Leads","Value"].map((h) => (
                <th key={h} className="text-left py-2 pr-4 font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-2.5 pr-4 font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>{r.month}</td>
                <td className="py-2.5 pr-4" style={{ color: r.ig > 0 ? "#d946ef" : "var(--muted-foreground)" }}>{r.ig || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.ytLong > 0 ? "#ef4444" : "var(--muted-foreground)" }}>{r.ytLong || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.ytShorts > 0 ? "#f97316" : "var(--muted-foreground)" }}>{r.ytShorts || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.ytPosts > 0 ? "#fb923c" : "var(--muted-foreground)" }}>{r.ytPosts || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.fbPosts > 0 ? "#3b82f6" : "var(--muted-foreground)" }}>{r.fbPosts || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.tiktok > 0 ? "#14b8a6" : "var(--muted-foreground)" }}>{r.tiktok || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.x > 0 ? "#94a3b8" : "var(--muted-foreground)" }}>{r.x || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.podcasts > 0 ? "#f59e0b" : "var(--muted-foreground)" }}>{r.podcasts || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.email > 0 ? "#22c55e" : "var(--muted-foreground)" }}>{r.email || "—"}</td>
                <td className="py-2.5 pr-4 font-semibold" style={{ color: "var(--foreground)" }}>{r.totalPieces || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.igLeads > 0 ? "#d946ef" : "var(--muted-foreground)" }}>{r.igLeads || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.ytLeads > 0 ? "#ef4444" : "var(--muted-foreground)" }}>{r.ytLeads || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.fbLeads > 0 ? "#3b82f6" : "var(--muted-foreground)" }}>{r.fbLeads || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.ttLeads > 0 ? "#14b8a6" : "var(--muted-foreground)" }}>{r.ttLeads || "—"}</td>
                <td className="py-2.5 pr-4" style={{ color: r.emailLeads > 0 ? "#22c55e" : "var(--muted-foreground)" }}>{r.emailLeads || "—"}</td>
                <td className="py-2.5 pr-4 font-semibold" style={{ color: "#f59e0b" }}>{r.totalLeads || "—"}</td>
                <td className="py-2.5 pr-4 font-semibold whitespace-nowrap" style={{ color: r.generatedValue > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
                  {r.generatedValue > 0 ? fmtValue(r.generatedValue) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialData: PlatformData;
  initialError: boolean;
  serverFetchedAt: string;
}

type RefreshState = "idle" | "loading" | "success" | "error";

export function PlatformDashboard({ initialData, initialError, serverFetchedAt }: Props) {
  const [data, setData]       = useState<PlatformData>(initialData);
  const [hasError, setHasError] = useState(initialError);
  const [fetchedAt, setFetchedAt] = useState(serverFetchedAt);
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");

  const refresh = useCallback(async () => {
    setRefreshState("loading");
    try {
      const res  = await fetch("/api/platform/refresh");
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

  const { rows } = data;
  const active = rows.filter((r) => r.totalPieces > 0 || r.totalLeads > 0);
  const latest = active[active.length - 1];
  const prev   = active[active.length - 2];

  // Totals across all months with data
  const ytdPieces = active.reduce((s, r) => s + r.totalPieces, 0);
  const ytdLeads  = active.reduce((s, r) => s + r.totalLeads, 0);
  const ytdValue  = active.reduce((s, r) => s + r.generatedValue, 0);

  // Max values for bar scaling
  const maxPieces = Math.max(...PLATFORMS.map(p => latest ? (latest[p.key as keyof PlatformMonthRow] as number) : 0), 1);
  const maxLeads  = Math.max(...LEAD_PLATFORMS.map(p => latest ? (latest[p.key as keyof PlatformMonthRow] as number) : 0), 1);

  // YTD bar scaling
  const ytdMaxPieces = Math.max(...PLATFORMS.map(p =>
    active.reduce((s, r) => s + (r[p.key as keyof PlatformMonthRow] as number), 0)
  ), 1);
  const ytdMaxLeads = Math.max(...LEAD_PLATFORMS.map(p =>
    active.reduce((s, r) => s + (r[p.key as keyof PlatformMonthRow] as number), 0)
  ), 1);

  // End-of-month projection for Total Pieces (only when latest month = current month)
  const projection = (() => {
    if (!latest) return null;
    const now = new Date();
    const currentMonthName = now.toLocaleString("en-US", { month: "long" });
    if (latest.month.toLowerCase() !== currentMonthName.toLowerCase()) return null;
    const today = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projected = Math.round((latest.totalPieces / today) * daysInMonth);
    const dayPct = Math.round((today / daysInMonth) * 100);
    // progressPct = how far through projected total we are (actual / projected * 100)
    const progressPct = projected > 0 ? Math.round((latest.totalPieces / projected) * 100) : 0;
    return { value: String(projected), dayPct, progressPct };
  })();

  const [view, setView] = useState<"latest" | "ytd">("latest");
  const isLatest = view === "latest";

  const pieceVal = (key: string) => isLatest
    ? (latest ? (latest[key as keyof PlatformMonthRow] as number) : 0)
    : active.reduce((s, r) => s + (r[key as keyof PlatformMonthRow] as number), 0);

  const maxP = isLatest ? maxPieces : ytdMaxPieces;
  const maxL = isLatest ? maxLeads  : ytdMaxLeads;

  return (
    <>
      {/* Error banner */}
      {hasError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
          <AlertCircle size={16} />
          <span>Could not load platform data. Check the sheet is published to web.</span>
        </div>
      )}

      {/* Header row: sync status + refresh */}
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
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg hover:opacity-80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          <RefreshCw size={12} style={{ animation: refreshState === "loading" ? "spin 0.6s linear infinite" : undefined }} />
          {refreshState === "loading" ? "Syncing…" : "Refresh from Sheet"}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI
          label={`Total Pieces${latest ? ` · ${latest.month}` : " · YTD"}`}
          value={latest ? String(latest.totalPieces) : String(ytdPieces)}
          change={latest && prev ? pct(latest.totalPieces, prev.totalPieces) : null}
          projected={projection ?? undefined}
          progressPct={projection?.progressPct}
        />
        <KPI
          label={`Total Leads${latest ? ` · ${latest.month}` : " · YTD"}`}
          value={latest ? String(latest.totalLeads) : String(ytdLeads)}
          change={latest && prev ? pct(latest.totalLeads, prev.totalLeads) : null}
        />
        <KPI
          label={`Generated Value${latest ? ` · ${latest.month}` : " · YTD"}`}
          value={latest ? fmtValue(latest.generatedValue) : fmtValue(ytdValue)}
          change={latest && prev ? pct(latest.generatedValue, prev.generatedValue) : null}
        />
        <KPI
          label="YTD Total Leads"
          value={String(ytdLeads)}
          change={null}
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-5">
        {(["latest", "ytd"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{
              background: view === v ? "var(--primary)" : "var(--secondary)",
              color: view === v ? "#fff" : "var(--muted-foreground)",
            }}
          >
            {v === "latest" ? `Latest Month${latest ? ` (${latest.month})` : ""}` : "Year to Date"}
          </button>
        ))}
      </div>

      {/* Main 2-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Effort / pieces published */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between mb-0.5">
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Content Effort
            </p>
            {isLatest && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                vs monthly goal
              </span>
            )}
          </div>
          <p className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>
            Pieces published per channel
          </p>
          <div className="space-y-3">
            {PLATFORMS.map((p) => {
              const goals = data.goals ?? FALLBACK_GOALS;
              const goal  = goals[p.goalKey as keyof PlatformGoals];
              const val   = pieceVal(p.key);
              return isLatest ? (
                <GoalBarRow key={p.key} label={p.label} value={val} goal={goal} color={p.color} />
              ) : (
                <BarRow key={p.key} label={p.label} value={val} max={maxP} color={p.color} />
              );
            })}
          </div>
          {/* Total row */}
          {(() => {
            const goals    = data.goals ?? FALLBACK_GOALS;
            const goalTotal = isLatest
              ? Object.values(goals).reduce((s, v) => s + v, 0)
              : null;
            const actual = isLatest ? (latest?.totalPieces ?? 0) : ytdPieces;
            const totalPct = goalTotal ? Math.round((actual / goalTotal) * 100) : null;
            return (
              <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                  Total pieces{goalTotal ? ` (${totalPct}% of ${goalTotal})` : ""}
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                  {actual}
                  {goalTotal && (
                    <span className="text-xs font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>/ {goalTotal}</span>
                  )}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Lead sources */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>
            Lead Sources
          </p>
          <p className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>
            Where leads are coming from
          </p>
          <div className="space-y-3">
            {LEAD_PLATFORMS.map((p) => (
              <BarRow
                key={p.key}
                label={p.label}
                value={pieceVal(p.key)}
                max={maxL}
                color={p.color}
                bg={p.bg}
              />
            ))}
          </div>
          {/* Total + value */}
          <div className="mt-4 pt-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Total leads</span>
              <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>
                {isLatest ? (latest?.totalLeads ?? 0) : ytdLeads}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Generated value</span>
              <span className="text-sm font-bold" style={{ color: "#22c55e" }}>
                {fmtValue(isLatest ? (latest?.generatedValue ?? 0) : ytdValue)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Monthly history */}
      <HistoryTable rows={rows} />

      {/* Empty state */}
      {!hasError && active.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}>
          <AlertCircle size={16} />
          <span>Sheet loaded but no data found. Check the tab is published and has Month rows.</span>
        </div>
      )}
    </>
  );
}
