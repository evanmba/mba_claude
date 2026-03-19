"use client";

import { useState } from "react";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import type { IGPost } from "@/lib/sheets";

type PostSortKey =
  | "date" | "title" | "reach" | "likes" | "shares" | "follows"
  | "shareRate" | "followRate" | "likeRate";
type SortDir = "asc" | "desc";

interface EnrichedPost extends IGPost {
  shareRate: number;
  followRate: number;
  likeRate: number;
}

function whoBadge(who: string): { bg: string; color: string } {
  switch (who.toLowerCase()) {
    case "evan":  return { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" };
    case "nate":  return { bg: "rgba(217,70,239,0.15)",  color: "#d946ef" };
    case "yasir": return { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" };
    default:      return { bg: "rgba(100,116,139,0.15)", color: "var(--muted-foreground)" };
  }
}

function SortTh({ label, col, activeCol, dir, onSort }: {
  label: string;
  col: PostSortKey;
  activeCol: PostSortKey;
  dir: SortDir;
  onSort: (c: PostSortKey) => void;
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

export function SortablePostLog({ posts }: { posts: IGPost[] }) {
  const [sortCol, setSortCol] = useState<PostSortKey>("reach");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (posts.length === 0) return null;

  const onSort = (col: PostSortKey) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const enriched: EnrichedPost[] = posts.map((p) => ({
    ...p,
    shareRate:  p.reach > 0 ? (p.shares  / p.reach) * 100 : 0,
    followRate: p.reach > 0 ? (p.follows / p.reach) * 100 : 0,
    likeRate:   p.reach > 0 ? (p.likes   / p.reach) * 100 : 0,
  }));

  const sorted = [...enriched].sort((a, b) => {
    const av = a[sortCol] as string | number;
    const bv = b[sortCol] as string | number;
    if (typeof av === "number" && typeof bv === "number")
      return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const thP = { activeCol: sortCol, dir: sortDir, onSort };

  return (
    <PlaceholderCard
      title={`Post Log — ${posts.length} posts`}
      description="Individual post performance at 24 hours · click headers to sort"
    >
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <SortTh label="Date"      col="date"       {...thP} />
              <SortTh label="Title"     col="title"      {...thP} />
              <SortTh label="Reach"     col="reach"      {...thP} />
              <SortTh label="Likes"     col="likes"      {...thP} />
              <SortTh label="Like %"    col="likeRate"   {...thP} />
              <SortTh label="Shares"    col="shares"     {...thP} />
              <SortTh label="Share %"   col="shareRate"  {...thP} />
              <SortTh label="Follows"   col="follows"    {...thP} />
              <SortTh label="Follow %"  col="followRate" {...thP} />
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Who</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Type</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>CTA</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const { bg, color } = whoBadge(p.who);
              const shareColor  = p.shareRate  >= 5   ? "#22c55e" : p.shareRate  >= 2   ? "#f59e0b" : "var(--muted-foreground)";
              const followColor = p.followRate >= 2   ? "#22c55e" : p.followRate >= 0.5 ? "#f59e0b" : "var(--muted-foreground)";
              const likeColor   = p.likeRate   >= 10  ? "#22c55e" : p.likeRate   >= 5   ? "#f59e0b" : "var(--muted-foreground)";
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>{p.date}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: 220 }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p.title}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: "#d946ef" }}>
                    {p.reach ? p.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.likes || "—"}</td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: likeColor }}>
                    {p.likeRate > 0 ? `${p.likeRate.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.shares || "—"}</td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: shareColor }}>
                    {p.shareRate > 0 ? `${p.shareRate.toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.follows || "—"}</td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: followColor }}>
                    {p.followRate > 0 ? `${p.followRate.toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>
                      {p.who || "—"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>{p.type || "—"}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full" style={{
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
    </PlaceholderCard>
  );
}
