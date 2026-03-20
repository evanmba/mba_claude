"use client";

import { useState } from "react";
import type { IGPost } from "@/lib/sheets";

// ─── Winning thresholds ───────────────────────────────────────────────────────
const WIN = { reachLike: 2, reachShares: 0.15, reachFollowers: 4 };

function parsePct(s: string): number {
  return parseFloat((s ?? "").replace(/%/g, "")) || 0;
}

// Winner = ANY one threshold met. Outlier = ALL three met.
function isWinner(p: IGPost): boolean {
  return (
    parsePct(p.reachLike)      > WIN.reachLike   ||
    parsePct(p.reachShares)    > WIN.reachShares  ||
    parsePct(p.reachFollowers) > WIN.reachFollowers
  );
}
function isOutlier(p: IGPost): boolean {
  return (
    parsePct(p.reachLike)      > WIN.reachLike   &&
    parsePct(p.reachShares)    > WIN.reachShares  &&
    parsePct(p.reachFollowers) > WIN.reachFollowers
  );
}

// ─── Color scale: red → orange → yellow → grey → dark green → light green → neon green
const HEAT_STOPS: [number, number, number][] = [
  [255,  30,   0],   // red
  [255, 140,   0],   // orange
  [255, 220,   0],   // yellow
  [120, 120, 120],   // grey
  [ 22, 101,  52],   // dark green
  [ 74, 222, 128],   // light green
  [ 57, 255,  20],   // neon green
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
  const r = Math.round(r1 + (r2 - r1) * u);
  const g = Math.round(g1 + (g2 - g1) * u);
  const b = Math.round(b1 + (b2 - b1) * u);
  return `rgb(${r}, ${g}, ${b})`;
}

function heatWeight(val: number, min: number, max: number): number {
  if (max <= min || isNaN(val)) return 400;
  const t = (val - min) / (max - min);
  // 400 at min, 900 at max
  return Math.round(400 + t * 500);
}

interface ColStats { min: number; max: number }
function stats(vals: number[]): ColStats {
  const nums = vals.filter((v) => !isNaN(v) && v !== 0);
  if (nums.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

// ─── Sort types ───────────────────────────────────────────────────────────────
type SortKey =
  | "date" | "title" | "reach" | "watchTime" | "likes" | "shares" | "follows"
  | "reachLike" | "reachShares" | "reachFollowers";
type SortDir = "asc" | "desc";

function SortTh({
  label, col, activeCol, dir, onSort,
}: {
  label: string; col: SortKey; activeCol: SortKey; dir: SortDir;
  onSort: (c: SortKey) => void;
}) {
  const active = col === activeCol;
  return (
    <th
      className="text-left py-2 pr-4 text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
      style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
      onClick={() => onSort(col)}
    >
      {label}{" "}
      <span style={{ opacity: active ? 1 : 0.3, fontSize: 10 }}>
        {active ? (dir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </th>
  );
}

function whoBadge(who: string): { bg: string; color: string } {
  switch (who.toLowerCase()) {
    case "evan":  return { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" };
    case "nate":  return { bg: "rgba(217,70,239,0.15)",  color: "#d946ef" };
    case "yasir": return { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" };
    default:      return { bg: "rgba(100,116,139,0.15)", color: "var(--muted-foreground)" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SortablePostLog({ posts }: { posts: IGPost[] }) {
  const [sortCol, setSortCol] = useState<SortKey>("reach");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | "winners" | "outliers">("all");

  const onSort = (col: SortKey) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const winnerCount  = posts.filter(isWinner).length;
  const outlierCount = posts.filter(isOutlier).length;
  const visible = filter === "winners" ? posts.filter(isWinner)
                : filter === "outliers" ? posts.filter(isOutlier)
                : posts;

  const sorted = [...visible].sort((a, b) => {
    let av: string | number = a[sortCol as keyof IGPost] as string | number;
    let bv: string | number = b[sortCol as keyof IGPost] as string | number;
    // For ratio string columns, sort numerically
    if (sortCol === "reachLike" || sortCol === "reachShares" || sortCol === "reachFollowers") {
      av = parsePct(av as string);
      bv = parsePct(bv as string);
    }
    if (typeof av === "number" && typeof bv === "number")
      return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const thP = { activeCol: sortCol, dir: sortDir, onSort };

  // ─── Color scale stats (computed from ALL posts, not just visible) ─────────
  const heat = {
    reach:          stats(posts.map((p) => p.reach)),
    watchTime:      stats(posts.map((p) => p.watchTime)),
    likes:          stats(posts.map((p) => p.likes)),
    shares:         stats(posts.map((p) => p.shares)),
    follows:        stats(posts.map((p) => p.follows)),
    reachLike:      stats(posts.map((p) => parsePct(p.reachLike))),
    reachShares:    stats(posts.map((p) => parsePct(p.reachShares))),
    reachFollowers: stats(posts.map((p) => parsePct(p.reachFollowers))),
  };

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (posts.length === 0) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Winning Post Log
          </h3>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
          Individual post performance at 24 hours · click headers to sort
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No post data found. Publish the DATA tab as CSV and update{" "}
          <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
            IG_DATA_CSV_URL
          </code>{" "}
          in the code.
        </p>
      </div>
    );
  }

  // ─── Table ────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl border p-6"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Post Log{" "}
          <span className="text-sm font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
            — {sorted.length} {sorted.length === 1 ? "post" : "posts"}
          </span>
        </h3>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--secondary)" }}>
          {(["all", "winners", "outliers"] as const).map((tab) => {
            const active = filter === tab;
            const count  = tab === "winners" ? winnerCount : tab === "outliers" ? outlierCount : posts.length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className="text-xs px-3 py-1 rounded-md transition-all capitalize"
                style={{
                  background: active ? "var(--card)" : "transparent",
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {tab} <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
        {filter === "winners"  ? "Any one of: Reach:Like >2% · Reach:Shares >0.15% · Reach:Followers >4%"
       : filter === "outliers" ? "All three: Reach:Like >2% · Reach:Shares >0.15% · Reach:Followers >4%"
       : "Individual post performance at 24 hours · click headers to sort"}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <SortTh label="Date"          col="date"          {...thP} />
              <SortTh label="Title"         col="title"         {...thP} />
              <SortTh label="Reach"         col="reach"         {...thP} />
              <SortTh label="Watch Time"    col="watchTime"     {...thP} />
              <SortTh label="Likes"         col="likes"         {...thP} />
              <SortTh label="Shares"        col="shares"        {...thP} />
              <SortTh label="Follows"       col="follows"       {...thP} />
              <SortTh label="Like %"        col="reachLike"     {...thP} />
              <SortTh label="Share %"       col="reachShares"   {...thP} />
              <SortTh label="Follow %"      col="reachFollowers" {...thP} />
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Who</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Style</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Type</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>CTA</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const outlier = isOutlier(p);
              const { bg, color } = whoBadge(p.who);
              return (
                <tr key={i} className="hoverable" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {p.date}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: 220 }}>
                    <div className="flex items-center gap-1.5">
                      {outlier && filter !== "outliers" && (
                        <span style={{ color: "#39ff14", fontSize: 10, flexShrink: 0 }}>★</span>
                      )}
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                            overflow: "hidden", color: "var(--foreground)",
                            textDecoration: "underline", textDecorationColor: "rgba(217,70,239,0.4)",
                            textUnderlineOffset: 2,
                          }}
                        >
                          {p.title}
                        </a>
                      ) : (
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {p.title}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(p.reach, heat.reach.min, heat.reach.max), fontWeight: heatWeight(p.reach, heat.reach.min, heat.reach.max) }}>
                    {p.reach ? p.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(p.watchTime, heat.watchTime.min, heat.watchTime.max), fontWeight: heatWeight(p.watchTime, heat.watchTime.min, heat.watchTime.max) }}>
                    {p.watchTime ? p.watchTime.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(p.likes, heat.likes.min, heat.likes.max), fontWeight: heatWeight(p.likes, heat.likes.min, heat.likes.max) }}>
                    {p.likes || "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(p.shares, heat.shares.min, heat.shares.max), fontWeight: heatWeight(p.shares, heat.shares.min, heat.shares.max) }}>
                    {p.shares || "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(p.follows, heat.follows.min, heat.follows.max), fontWeight: heatWeight(p.follows, heat.follows.min, heat.follows.max) }}>
                    {p.follows || "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(parsePct(p.reachLike), heat.reachLike.min, heat.reachLike.max), fontWeight: heatWeight(parsePct(p.reachLike), heat.reachLike.min, heat.reachLike.max) }}>
                    {p.reachLike || "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(parsePct(p.reachShares), heat.reachShares.min, heat.reachShares.max), fontWeight: heatWeight(parsePct(p.reachShares), heat.reachShares.min, heat.reachShares.max) }}>
                    {p.reachShares || "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(parsePct(p.reachFollowers), heat.reachFollowers.min, heat.reachFollowers.max), fontWeight: heatWeight(parsePct(p.reachFollowers), heat.reachFollowers.min, heat.reachFollowers.max) }}>
                    {p.reachFollowers || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: bg, color }}>
                      {p.who || "—"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>{p.style || "—"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>{p.type || "—"}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{
                      background: p.cta === "Yes" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.12)",
                      color: p.cta === "Yes" ? "#22c55e" : "var(--muted-foreground)",
                    }}>
                      {p.cta || "—"}
                    </span>
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
