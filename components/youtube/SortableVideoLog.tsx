"use client";

import { useState } from "react";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import type { YTVideo } from "@/lib/sheets";

type SortKey = "publishDate" | "title" | "ctrNum" | "watchTime" | "impressions" | "watchImprNum";
type SortDir = "asc" | "desc";

interface EnrichedVideo extends YTVideo {
  ctrNum: number;       // parsed CTR %
  watchImprNum: number; // parsed watch:impressions ratio
}

function SortTh({ label, col, activeCol, dir, onSort }: {
  label: string; col: SortKey; activeCol: SortKey | null; dir: SortDir; onSort: (c: SortKey) => void;
}) {
  const active = col === activeCol;
  return (
    <th
      className="text-left py-2 pr-4 text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
      style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
      onClick={() => onSort(col)}
    >
      {label} <span style={{ opacity: active ? 1 : 0.35, fontSize: 10 }}>{active ? (dir === "desc" ? "↓" : "↑") : "↕"}</span>
    </th>
  );
}

export function SortableVideoLog({ videos }: { videos: YTVideo[] }) {
  const [sortCol, setSortCol] = useState<SortKey>("impressions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (videos.length === 0) return null;

  const onSort = (col: SortKey) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const enriched: EnrichedVideo[] = videos.map((v) => ({
    ...v,
    ctrNum:       parseFloat(v.ctr) || 0,
    watchImprNum: parseFloat(v.wtImpressions) || 0,
  }));

  const sorted = [...enriched].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const thP = { activeCol: sortCol, dir: sortDir, onSort };

  return (
    <PlaceholderCard
      title={`Video Log — ${videos.length} videos`}
      description="Individual video performance at 24 hours · click headers to sort"
    >
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <SortTh label="Date"            col="publishDate"  {...thP} />
              <SortTh label="Title"           col="title"        {...thP} />
              <SortTh label="CTR %"           col="ctrNum"       {...thP} />
              <SortTh label="Watch Time (min)" col="watchTime"   {...thP} />
              <SortTh label="Impressions"     col="impressions"  {...thP} />
              <SortTh label="Watch:Impr."     col="watchImprNum" {...thP} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => {
              const ctrColor = v.ctrNum >= 4 ? "#22c55e" : v.ctrNum >= 2 ? "#f59e0b" : "var(--muted-foreground)";
              const wiColor  = v.watchImprNum >= 0.5 ? "#22c55e" : v.watchImprNum >= 0.3 ? "#f59e0b" : "var(--muted-foreground)";
              return (
                <tr key={i} className="hoverable" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {v.publishDate}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: "280px" }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {v.title}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: ctrColor }}>
                    {v.ctr || "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>
                    {v.watchTime || "—"}
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: "#ef4444" }}>
                    {v.impressions ? v.impressions.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: wiColor }}>
                    {v.wtImpressions || "—"}
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
