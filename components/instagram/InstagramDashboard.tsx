"use client";

import { useState, useCallback } from "react";
import { StatCard } from "@/components/shared/StatCard";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { Eye, Heart, Share2, UserPlus, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import type { IGMonthlyRow, IGPost, IGData } from "@/lib/sheets";

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

// ─── Monthly table ────────────────────────────────────────────────────────────

function MonthlyTable({ monthly, averages }: { monthly: IGMonthlyRow[]; averages: IGMonthlyRow | null }) {
  const filled = monthly.filter((m) => m.reach > 0);
  if (filled.length === 0) return null;

  const cols = [
    "Month", "Avg Reach", "Watch Time", "Avg Likes", "Avg Shares",
    "Avg Follows", "Reach:Like", "Reach:Shares", "Reach:Follows",
  ];

  const rows = averages ? [...filled, averages] : filled;

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
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: isAvg ? "rgba(217,70,239,0.04)" : undefined,
                  }}
                >
                  <td className="py-2.5 pr-5 whitespace-nowrap font-medium"
                    style={{ color: isAvg ? "#d946ef" : "var(--foreground)" }}>
                    {m.month}
                  </td>
                  <td className="py-2.5 pr-5 font-semibold" style={{ color: "#d946ef" }}>
                    {m.reach ? m.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
                    {m.watchTime ? `${m.watchTime.toFixed(2)}s` : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--foreground)" }}>
                    {m.likes ? m.likes.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--foreground)" }}>
                    {m.shares ? m.shares.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--foreground)" }}>
                    {m.follows ? m.follows.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
                    {m.reachLike || "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
                    {m.reachShares || "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
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

// ─── Post log ─────────────────────────────────────────────────────────────────

function PostLog({ posts }: { posts: IGPost[] }) {
  if (posts.length === 0) return null;

  const headers = ["Date", "Title", "Reach", "Likes", "Shares", "Follows", "Reach:Like", "Who", "Type", "CTA"];

  return (
    <PlaceholderCard
      title={`Post Log — ${posts.length} posts`}
      description="Individual post performance at 24 hours"
    >
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className="text-left py-2 pr-4 font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => {
              const { bg, color } = whoBadge(p.who);
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {p.date}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: "240px" }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p.title}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: "#d946ef" }}>
                    {p.reach ? p.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.likes || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.shares || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.follows || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--muted-foreground)" }}>{p.reachLike || "—"}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>
                      {p.who || "—"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {p.type || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        background: p.cta === "Yes" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.12)",
                        color: p.cta === "Yes" ? "#22c55e" : "var(--muted-foreground)",
                      }}
                    >
                      {p.cta || "—"}
                    </span>
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

// ─── Main dashboard ───────────────────────────────────────────────────────────

interface Props {
  initialData: IGData;
  initialFetchError: boolean;
  serverFetchedAt: string;
}

type RefreshState = "idle" | "loading" | "success" | "error";

export function InstagramDashboard({ initialData, initialFetchError, serverFetchedAt }: Props) {
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
  const mon     = latest?.month ?? "";

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={`Avg Reach${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.reach.toLocaleString() : "—"}
          change={latest && prev ? pct(latest.reach, prev.reach) : ""}
          trend={latest && prev ? trendDir(latest.reach, prev.reach) : "neutral"}
          icon={Eye}
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
      <PostLog posts={posts} />

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
