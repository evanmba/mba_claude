"use client";

import { useState, useCallback } from "react";
import { StatCard } from "@/components/shared/StatCard";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { SortablePostLog } from "@/components/instagram/SortablePostLog";
import { Eye, Heart, Share2, UserPlus, Timer, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import type { IGMonthlyRow, IGData } from "@/lib/sheets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(curr: number, prev: number): string {
  if (!prev) return "";
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
}

function trendDir(curr: number, prev: number | undefined): "up" | "down" | "neutral" {
  if (!prev) return "neutral";
  return curr >= prev ? "up" : "down";
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Shared heat scale (mirrors SortablePostLog) ─────────────────────────────
const MONTHLY_HEAT_STOPS: [number, number, number][] = [
  [255,  30,   0],
  [255, 140,   0],
  [255, 220,   0],
  [120, 120, 120],
  [ 22, 101,  52],
  [ 74, 222, 128],
  [ 57, 255,  20],
];
function mHeatColor(val: number, min: number, max: number): string {
  if (max <= min || isNaN(val)) return "var(--muted-foreground)";
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  const scaled = t * (MONTHLY_HEAT_STOPS.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(lo + 1, MONTHLY_HEAT_STOPS.length - 1);
  const u = scaled - lo;
  const [r1, g1, b1] = MONTHLY_HEAT_STOPS[lo];
  const [r2, g2, b2] = MONTHLY_HEAT_STOPS[hi];
  return `rgb(${Math.round(r1+(r2-r1)*u)},${Math.round(g1+(g2-g1)*u)},${Math.round(b1+(b2-b1)*u)})`;
}
function mHeatWeight(val: number, min: number, max: number): number {
  if (max <= min || isNaN(val)) return 400;
  return Math.round(400 + Math.max(0, Math.min(1, (val - min) / (max - min))) * 500);
}
function mStats(vals: number[]) {
  const nums = vals.filter((v) => !isNaN(v) && v > 0);
  if (!nums.length) return { min: 0, max: 0 };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}
function parsePctM(s: string): number {
  return parseFloat((s ?? "").replace(/%/g, "")) || 0;
}

// ─── Monthly table ────────────────────────────────────────────────────────────

function MonthlyTable({ monthly, averages }: { monthly: IGMonthlyRow[]; averages: IGMonthlyRow | null }) {
  const filled = monthly.filter((m) => m.reach > 0);
  if (filled.length === 0) return null;

  const cols = [
    "Month", "Avg Reach", "Watch Time", "Avg Likes", "Avg Shares",
    "Avg Follows", "Reach:Like", "Reach:Shares", "Reach:Follows",
  ];

  const rows = averages ? [...monthly, averages] : monthly;

  // Compute heat stats from data rows only (exclude averages row and zero-rows)
  const heat = {
    reach:          mStats(filled.map((m) => m.reach)),
    watchTime:      mStats(filled.map((m) => m.watchTime)),
    likes:          mStats(filled.map((m) => m.likes)),
    shares:         mStats(filled.map((m) => m.shares)),
    follows:        mStats(filled.map((m) => m.follows)),
    reachLike:      mStats(filled.map((m) => parsePctM(m.reachLike))),
    reachShares:    mStats(filled.map((m) => parsePctM(m.reachShares))),
    reachFollowers: mStats(filled.map((m) => parsePctM(m.reachFollowers))),
  };

  return (
    <PlaceholderCard title="Monthly Performance" description="24-hour average metrics by month">
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {cols.map((c) => (
                <th
                  key={c}
                  className="text-left py-2 pr-5 text-xs font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const isAvg = m.month === "Average";
              const white = "#ffffff";
              const rc  = isAvg ? white : mHeatColor(m.reach,          heat.reach.min,          heat.reach.max);
              const wc  = isAvg ? white : mHeatColor(m.watchTime,       heat.watchTime.min,       heat.watchTime.max);
              const lc  = isAvg ? white : mHeatColor(m.likes,           heat.likes.min,           heat.likes.max);
              const sc  = isAvg ? white : mHeatColor(m.shares,          heat.shares.min,          heat.shares.max);
              const fc  = isAvg ? white : mHeatColor(m.follows,         heat.follows.min,         heat.follows.max);
              const rlc = isAvg ? white : mHeatColor(parsePctM(m.reachLike),      heat.reachLike.min,      heat.reachLike.max);
              const rsc = isAvg ? white : mHeatColor(parsePctM(m.reachShares),    heat.reachShares.min,    heat.reachShares.max);
              const rfc = isAvg ? white : mHeatColor(parsePctM(m.reachFollowers), heat.reachFollowers.min, heat.reachFollowers.max);
              return (
                <tr
                  key={i}
                  className="hoverable"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: isAvg ? "rgba(255,255,255,0.04)" : undefined,
                  }}
                >
                  <td className="py-2.5 pr-5 whitespace-nowrap font-medium"
                    style={{ color: isAvg ? white : "var(--foreground)" }}>
                    {m.month}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: rc, fontWeight: isAvg ? 700 : mHeatWeight(m.reach, heat.reach.min, heat.reach.max) }}>
                    {m.reach ? m.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: wc, fontWeight: isAvg ? 700 : mHeatWeight(m.watchTime, heat.watchTime.min, heat.watchTime.max) }}>
                    {m.watchTime ? `${m.watchTime.toFixed(2)}s` : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: lc, fontWeight: isAvg ? 700 : mHeatWeight(m.likes, heat.likes.min, heat.likes.max) }}>
                    {m.likes ? m.likes.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: sc, fontWeight: isAvg ? 700 : mHeatWeight(m.shares, heat.shares.min, heat.shares.max) }}>
                    {m.shares ? m.shares.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: fc, fontWeight: isAvg ? 700 : mHeatWeight(m.follows, heat.follows.min, heat.follows.max) }}>
                    {m.follows ? m.follows.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: rlc, fontWeight: isAvg ? 700 : mHeatWeight(parsePctM(m.reachLike), heat.reachLike.min, heat.reachLike.max) }}>
                    {m.reachLike || "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: rsc, fontWeight: isAvg ? 700 : mHeatWeight(parsePctM(m.reachShares), heat.reachShares.min, heat.reachShares.max) }}>
                    {m.reachShares || "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: rfc, fontWeight: isAvg ? 700 : mHeatWeight(parsePctM(m.reachFollowers), heat.reachFollowers.min, heat.reachFollowers.max) }}>
                    {m.reachFollowers || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PlaceholderCard>
  );
}

// ─── Who badge ────────────────────────────────────────────────────────────────

function whoBadge(who: string): { bg: string; color: string } {
  switch (who.toLowerCase()) {
    case "evan":  return { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" };
    case "nate":  return { bg: "rgba(217,70,239,0.15)",  color: "#d946ef" };
    case "yasir": return { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" };
    default:      return { bg: "rgba(100,116,139,0.15)", color: "var(--muted-foreground)" };
  }
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

interface Props {
  initialData: IGData;
  initialFetchError: boolean;
  serverFetchedAt: string;
  currentMonth: string;
}

type RefreshState = "idle" | "loading" | "success" | "error";

export function InstagramDashboard({ initialData, initialFetchError, serverFetchedAt, currentMonth }: Props) {
  const [data, setData]           = useState<IGData>(initialData);
  const [fetchError, setFetchError] = useState(initialFetchError);
  const [fetchedAt, setFetchedAt] = useState(serverFetchedAt);
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const [, forceUpdate] = useState(0); // tick to re-render timeAgo

  const refresh = useCallback(async () => {
    setRefreshState("loading");
    try {
      const res = await fetch("/api/instagram/refresh");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json.data);
      setFetchedAt(json.fetchedAt);
      setFetchError(false);
      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 2500);
    } catch {
      setFetchError(true);
      setRefreshState("error");
      setTimeout(() => setRefreshState("idle"), 3000);
    }
    forceUpdate((n) => n + 1);
  }, []);

  const { monthly, averages, posts } = data;
  const filled  = monthly.filter((m) => m.reach > 0);
  const latest  = filled[filled.length - 1];
  const prev    = filled[filled.length - 2];
  const mon     = currentMonth;

  return (
    <>
      {/* Error banner */}
      {fetchError && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
        >
          <AlertCircle size={16} />
          <span>Could not load sheet data. Check that the CSV URL is still published.</span>
        </div>
      )}

      {/* Stat cards + Refresh row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {refreshState === "success" ? (
            <>
              <CheckCircle2 size={13} style={{ color: "#22c55e" }} />
              <span style={{ color: "#22c55e" }}>Updated just now</span>
            </>
          ) : (
            <span>Last synced: {timeAgo(fetchedAt)}</span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshState === "loading"}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          <RefreshCw
            size={12}
            style={{
              transition: "transform 0.6s linear",
              animation: refreshState === "loading" ? "spin 0.6s linear infinite" : undefined,
            }}
          />
          {refreshState === "loading" ? "Syncing…" : "Refresh from Sheet"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          title={`Avg Reach${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.reach.toLocaleString() : "—"}
          change={latest && prev ? pct(latest.reach, prev.reach) : ""}
          trend={latest && prev ? trendDir(latest.reach, prev.reach) : "neutral"}
          icon={Eye}
        />
        <StatCard
          title={`Avg Watch Time${mon ? ` · ${mon}` : ""}`}
          value={latest ? `${latest.watchTime.toFixed(1)}s` : "—"}
          change={latest && prev ? pct(latest.watchTime, prev.watchTime) : ""}
          trend={latest && prev ? trendDir(latest.watchTime, prev.watchTime) : "neutral"}
          icon={Timer}
        />
        <StatCard
          title={`Avg Likes${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.likes.toFixed(1) : "—"}
          change={latest && prev ? pct(latest.likes, prev.likes) : ""}
          trend={latest && prev ? trendDir(latest.likes, prev.likes) : "neutral"}
          icon={Heart}
        />
        <StatCard
          title={`Avg Shares${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.shares.toFixed(1) : "—"}
          change={latest && prev ? pct(latest.shares, prev.shares) : ""}
          trend={latest && prev ? trendDir(latest.shares, prev.shares) : "neutral"}
          icon={Share2}
        />
        <StatCard
          title={`Avg Follows${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.follows.toFixed(2) : "—"}
          change={latest && prev ? pct(latest.follows, prev.follows) : ""}
          trend={latest && prev ? trendDir(latest.follows, prev.follows) : "neutral"}
          icon={UserPlus}
        />
      </div>

      {/* Monthly breakdown */}
      <div className="mb-6">
        <MonthlyTable monthly={monthly} averages={averages} />
      </div>

      {/* Post log */}
      <SortablePostLog posts={posts} />

      {/* Empty state */}
      {!fetchError && filled.length === 0 && posts.length === 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}
        >
          <AlertCircle size={16} />
          <span>Sheet loaded but no data rows detected. Make sure the published tab contains IG tracker data.</span>
        </div>
      )}
    </>
  );
}
