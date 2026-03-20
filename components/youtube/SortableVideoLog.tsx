"use client";

import { useState } from "react";
import type { YTVideo } from "@/lib/sheets";

// ─── Thresholds ───────────────────────────────────────────────────────────────
// Winners: ANY one of these (~20 results target)
const WIN = { ctr: 3, watchTime: 60, impressions: 400, wtImpr: 0.12 };
// Outliers: 3 of 4 of these (~5 results target)
const OUT = { ctr: 4, watchTime: 90, impressions: 800, wtImpr: 0.18 };

function parsePct(s: string): number {
  return parseFloat((s ?? "").replace(/%/g, "")) || 0;
}
function parseRatio(s: string): number {
  return parseFloat(s ?? "") || 0;
}

function isWinner(v: YTVideo): boolean {
  const checks = [
    parsePct(v.ctr)             > WIN.ctr,
    v.watchTime                 > WIN.watchTime,
    v.impressions               > WIN.impressions,
    parseRatio(v.wtImpressions) > WIN.wtImpr,
  ];
  return checks.filter(Boolean).length >= 2;
}
function isOutlier(v: YTVideo): boolean {
  const checks = [
    parsePct(v.ctr)             > OUT.ctr,
    v.watchTime                 > OUT.watchTime,
    v.impressions               > OUT.impressions,
    parseRatio(v.wtImpressions) > OUT.wtImpr,
  ];
  return checks.filter(Boolean).length >= 3;
}

// ─── Heat scale: red → orange → yellow → grey → dark green → light green → neon green
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

interface ColStats { min: number; max: number }
function colStats(vals: number[]): ColStats {
  const nums = vals.filter((v) => !isNaN(v) && v > 0);
  if (!nums.length) return { min: 0, max: 0 };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
type SortKey = "publishDate" | "title" | "ctrNum" | "watchTime" | "impressions" | "watchImprNum";
type SortDir = "asc" | "desc";

interface EnrichedVideo extends YTVideo {
  ctrNum: number;
  watchImprNum: number;
}

function SortTh({ label, col, activeCol, dir, onSort }: {
  label: string; col: SortKey; activeCol: SortKey; dir: SortDir; onSort: (c: SortKey) => void;
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

// ─── Component ────────────────────────────────────────────────────────────────
export function SortableVideoLog({ videos }: { videos: YTVideo[] }) {
  const [sortCol, setSortCol] = useState<SortKey>("impressions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | "winners" | "outliers">("all");

  const onSort = (col: SortKey) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  if (videos.length === 0) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          Video Log
        </h3>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No video data found. Make sure the YT DATA tab is published as CSV and{" "}
          <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
            YT_DATA_GID
          </code>{" "}
          is set correctly in the page.
        </p>
      </div>
    );
  }

  const enriched: EnrichedVideo[] = videos.map((v) => ({
    ...v,
    ctrNum:       parsePct(v.ctr),
    watchImprNum: parseRatio(v.wtImpressions),
  }));

  const winnerCount  = enriched.filter(isWinner).length;
  const outlierCount = enriched.filter(isOutlier).length;
  const visible = filter === "winners"  ? enriched.filter(isWinner)
                : filter === "outliers" ? enriched.filter(isOutlier)
                : enriched;

  const sorted = [...visible].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === "number" && typeof bv === "number")
      return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const thP = { activeCol: sortCol, dir: sortDir, onSort };

  // Heat stats computed from ALL videos (not just visible)
  const heat = {
    ctr:       colStats(enriched.map((v) => v.ctrNum)),
    watchTime: colStats(enriched.map((v) => v.watchTime)),
    impr:      colStats(enriched.map((v) => v.impressions)),
    wtImpr:    colStats(enriched.map((v) => v.watchImprNum)),
  };

  return (
    <div
      className="rounded-xl border p-6"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Video Log{" "}
          <span className="text-sm font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
            — {sorted.length} {sorted.length === 1 ? "video" : "videos"}
          </span>
        </h3>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--secondary)" }}>
          {(["all", "winners", "outliers"] as const).map((tab) => {
            const active = filter === tab;
            const count  = tab === "winners" ? winnerCount : tab === "outliers" ? outlierCount : enriched.length;
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
        {filter === "winners"  ? `2 of 4: CTR >${WIN.ctr}% · Watch >${WIN.watchTime}min · Impressions >${WIN.impressions.toLocaleString()} · Watch:Impr >${WIN.wtImpr * 100}%`
       : filter === "outliers" ? `3 of 4: CTR >${OUT.ctr}% · Watch >${OUT.watchTime}min · Impressions >${OUT.impressions.toLocaleString()} · Watch:Impr >${OUT.wtImpr * 100}%`
       : "Individual video performance at 24 hours · click headers to sort"}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <SortTh label="Date"             col="publishDate"  {...thP} />
              <SortTh label="Title"            col="title"        {...thP} />
              <SortTh label="CTR %"            col="ctrNum"       {...thP} />
              <SortTh label="Watch Time (min)" col="watchTime"    {...thP} />
              <SortTh label="Impressions"      col="impressions"  {...thP} />
              <SortTh label="Watch:Impr."      col="watchImprNum" {...thP} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => {
              const outlier = isOutlier(v);
              return (
                <tr key={i} className="hoverable" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {v.publishDate}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: 280 }}>
                    <div className="flex items-center gap-1.5">
                      {outlier && (
                        <span style={{ color: "#39ff14", fontSize: 10, flexShrink: 0 }}>★</span>
                      )}
                      {v.url ? (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                            overflow: "hidden", color: "var(--foreground)",
                            textDecoration: "underline", textDecorationColor: "rgba(239,68,68,0.4)",
                            textUnderlineOffset: 2,
                          }}
                        >
                          {v.title}
                        </a>
                      ) : (
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {v.title}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(v.ctrNum, heat.ctr.min, heat.ctr.max), fontWeight: heatWeight(v.ctrNum, heat.ctr.min, heat.ctr.max) }}>
                    {v.ctr || "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(v.watchTime, heat.watchTime.min, heat.watchTime.max), fontWeight: heatWeight(v.watchTime, heat.watchTime.min, heat.watchTime.max) }}>
                    {v.watchTime ? v.watchTime.toFixed(1) : "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(v.impressions, heat.impr.min, heat.impr.max), fontWeight: heatWeight(v.impressions, heat.impr.min, heat.impr.max) }}>
                    {v.impressions ? v.impressions.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(v.watchImprNum, heat.wtImpr.min, heat.wtImpr.max), fontWeight: heatWeight(v.watchImprNum, heat.wtImpr.min, heat.wtImpr.max) }}>
                    {v.wtImpressions || "—"}
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
