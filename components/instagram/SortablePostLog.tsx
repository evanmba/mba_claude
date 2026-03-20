"use client";

import { useState } from "react";
import type { IGPost } from "@/lib/sheets";

// ─── Winning thresholds ───────────────────────────────────────────────────────
const WIN = { reachLike: 2, reachShares: 0.15, reachFollowers: 4 };

function parsePct(s: string): number {
  return parseFloat((s ?? "").replace(/%/g, "")) || 0;
}

function isWinning(p: IGPost): boolean {
  return (
    parsePct(p.reachLike) > WIN.reachLike &&
    parsePct(p.reachShares) > WIN.reachShares &&
    parsePct(p.reachFollowers) > WIN.reachFollowers
  );
}

// ─── Sort types ───────────────────────────────────────────────────────────────
type SortKey =
  | "date" | "title" | "reach" | "likes" | "shares" | "follows"
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
  const [winningOnly, setWinningOnly] = useState(false);

  const onSort = (col: SortKey) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const winCount = posts.filter(isWinning).length;
  const visible = winningOnly ? posts.filter(isWinning) : posts;

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
          {winningOnly ? "Winning Posts" : "Post Log"}{" "}
          <span className="text-sm font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
            — {sorted.length} {sorted.length === 1 ? "post" : "posts"}
          </span>
        </h3>

        {/* Winning toggle */}
        <div className="flex items-center gap-2">
          {winCount > 0 && (
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {winCount} winning
            </span>
          )}
          <button
            onClick={() => setWinningOnly((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: winningOnly ? "rgba(34,197,94,0.15)" : "var(--secondary)",
              color: winningOnly ? "#22c55e" : "var(--muted-foreground)",
              border: `1px solid ${winningOnly ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
            }}
          >
            <span>{winningOnly ? "★" : "☆"}</span>
            Winning only
          </button>
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
        {winningOnly
          ? `Reach:Like >2% · Reach:Shares >0.15% · Reach:Followers >4%`
          : "Individual post performance at 24 hours · click headers to sort"}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <SortTh label="Date"          col="date"          {...thP} />
              <SortTh label="Title"         col="title"         {...thP} />
              <SortTh label="Reach"         col="reach"         {...thP} />
              <SortTh label="Likes"         col="likes"         {...thP} />
              <SortTh label="Shares"        col="shares"        {...thP} />
              <SortTh label="Follows"       col="follows"       {...thP} />
              <SortTh label="Like %"        col="reachLike"     {...thP} />
              <SortTh label="Share %"       col="reachShares"   {...thP} />
              <SortTh label="Follow %"      col="reachFollowers" {...thP} />
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Video</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Who</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Style</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Type</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>CTA</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const winning = isWinning(p);
              const { bg, color } = whoBadge(p.who);
              const likeColor   = parsePct(p.reachLike)      > WIN.reachLike      ? "#22c55e" : parsePct(p.reachLike)      > WIN.reachLike * 0.6  ? "#f59e0b" : "var(--muted-foreground)";
              const shareColor  = parsePct(p.reachShares)    > WIN.reachShares    ? "#22c55e" : parsePct(p.reachShares)    > WIN.reachShares * 0.6 ? "#f59e0b" : "var(--muted-foreground)";
              const followColor = parsePct(p.reachFollowers) > WIN.reachFollowers ? "#22c55e" : parsePct(p.reachFollowers) > WIN.reachFollowers * 0.6 ? "#f59e0b" : "var(--muted-foreground)";
              return (
                <tr key={i} className="hoverable" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {p.date}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: 220 }}>
                    <div className="flex items-center gap-1.5">
                      {winning && !winningOnly && (
                        <span style={{ color: "#22c55e", fontSize: 10, flexShrink: 0 }}>★</span>
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
                  <td className="py-2 pr-4 font-semibold" style={{ color: "#d946ef" }}>
                    {p.reach ? p.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.likes || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.shares || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.follows || "—"}</td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: likeColor }}>
                    {p.reachLike || "—"}
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: shareColor }}>
                    {p.reachShares || "—"}
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: followColor }}>
                    {p.reachFollowers || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {p.videoUrl ? (
                      <a
                        href={p.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg whitespace-nowrap"
                        style={{
                          background: "rgba(217,70,239,0.12)",
                          color: "#d946ef",
                          border: "1px solid rgba(217,70,239,0.3)",
                          textDecoration: "none",
                        }}
                      >
                        ▶ Watch
                      </a>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)" }}>—</span>
                    )}
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
