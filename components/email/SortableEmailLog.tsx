"use client";

import { useState } from "react";
import type { EmailLog } from "@/lib/sheets";

// ─── Thresholds ────────────────────────────────────────────────────────────────
// Winners: 2 of 4 (~top ~30%)
const WIN = { openPct: 72, ctrPct: 0.8, clicks: 20, delivered: 500 };
// Outliers: 3 of 4 (~top ~10%)
const OUT = { openPct: 82, ctrPct: 1.3, clicks: 35, delivered: 700 };

function isWinner(e: EmailLog): boolean {
  const checks = [
    e.openPct   > WIN.openPct,
    e.ctrPct    > WIN.ctrPct,
    e.clicks    > WIN.clicks,
    e.delivered > WIN.delivered,
  ];
  return checks.filter(Boolean).length >= 2;
}

function isOutlier(e: EmailLog): boolean {
  const checks = [
    e.openPct   > OUT.openPct,
    e.ctrPct    > OUT.ctrPct,
    e.clicks    > OUT.clicks,
    e.delivered > OUT.delivered,
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

// ─── Sort ──────────────────────────────────────────────────────────────────────
type SortKey = "date" | "subject" | "delivered" | "opens" | "openPct" | "clicks" | "ctrPct";
type SortDir = "asc" | "desc";

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

// ─── Component ─────────────────────────────────────────────────────────────────
export function SortableEmailLog({ emails }: { emails: EmailLog[] }) {
  const [sortCol, setSortCol] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | "winners" | "outliers">("all");

  const onSort = (col: SortKey) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  if (emails.length === 0) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          Email Log
        </h3>
        <p className="text-sm mb-3" style={{ color: "var(--muted-foreground)" }}>
          No email data found. The spreadsheet is not publicly accessible — you need to publish the DATA tab.
        </p>
        <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "var(--muted-foreground)" }}>
          <li>Open your email spreadsheet in Google Sheets</li>
          <li>Go to <strong style={{ color: "var(--foreground)" }}>File → Share → Publish to web</strong></li>
          <li>Select the <strong style={{ color: "var(--foreground)" }}>DATA</strong> sheet and <strong style={{ color: "var(--foreground)" }}>CSV</strong> format, then click Publish</li>
          <li>Copy the URL and add it to <code className="px-1 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>.env.local</code> as <code className="px-1 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>GOOGLE_EMAIL_DATA_CSV_URL</code></li>
          <li>Restart the dev server</li>
        </ol>
        <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)" }}>
          Debug info:{" "}
          <a href="/api/email/debug" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "underline" }}>
            /api/email/debug
          </a>
        </p>
      </div>
    );
  }

  const winnerCount  = emails.filter(isWinner).length;
  const outlierCount = emails.filter(isOutlier).length;
  const visible = filter === "winners"  ? emails.filter(isWinner)
                : filter === "outliers" ? emails.filter(isOutlier)
                : emails;

  const sorted = [...visible].sort((a, b) => {
    if (sortCol === "date") {
      const ad = Date.parse(a.date), bd = Date.parse(b.date);
      return sortDir === "asc" ? ad - bd : bd - ad;
    }
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === "number" && typeof bv === "number")
      return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const thP = { activeCol: sortCol, dir: sortDir, onSort };

  // Heat stats from ALL emails
  const heat = {
    openPct:   colStats(emails.map((e) => e.openPct)),
    ctrPct:    colStats(emails.map((e) => e.ctrPct)),
    clicks:    colStats(emails.map((e) => e.clicks)),
    delivered: colStats(emails.map((e) => e.delivered)),
    opens:     colStats(emails.map((e) => e.opens)),
  };

  return (
    <div
      className="rounded-xl border p-6"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Email Log{" "}
          <span className="text-sm font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
            — {sorted.length} {sorted.length === 1 ? "email" : "emails"}
          </span>
        </h3>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--secondary)" }}>
          {(["all", "winners", "outliers"] as const).map((tab) => {
            const active = filter === tab;
            const count  = tab === "winners" ? winnerCount : tab === "outliers" ? outlierCount : emails.length;
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
        {filter === "winners"  ? `2 of 4: Open% >${WIN.openPct}% · CTR >${WIN.ctrPct}% · Clicks >${WIN.clicks} · Delivered >${WIN.delivered.toLocaleString()}`
       : filter === "outliers" ? `3 of 4: Open% >${OUT.openPct}% · CTR >${OUT.ctrPct}% · Clicks >${OUT.clicks} · Delivered >${OUT.delivered.toLocaleString()}`
       : "Individual email performance · click headers to sort"}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <SortTh label="Date"      col="date"      {...thP} />
              <SortTh label="Subject"   col="subject"   {...thP} />
              <SortTh label="Delivered" col="delivered" {...thP} />
              <SortTh label="Opens"     col="opens"     {...thP} />
              <SortTh label="Open %"    col="openPct"   {...thP} />
              <SortTh label="Clicks"    col="clicks"    {...thP} />
              <SortTh label="CTR %"     col="ctrPct"    {...thP} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, i) => {
              const outlier = isOutlier(e);
              return (
                <tr key={i} className="hoverable" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {e.date}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: 300 }}>
                    <div className="flex items-center gap-1.5">
                      {outlier && (
                        <span style={{ color: "#39ff14", fontSize: 10, flexShrink: 0 }}>★</span>
                      )}
                      {e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                            overflow: "hidden", color: "var(--foreground)",
                            textDecoration: "underline", textDecorationColor: "rgba(34,197,94,0.4)",
                            textUnderlineOffset: 2,
                          }}
                        >
                          {e.subject}
                        </a>
                      ) : (
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {e.subject}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(e.delivered, heat.delivered.min, heat.delivered.max), fontWeight: heatWeight(e.delivered, heat.delivered.min, heat.delivered.max) }}>
                    {e.delivered ? e.delivered.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(e.opens, heat.opens.min, heat.opens.max), fontWeight: heatWeight(e.opens, heat.opens.min, heat.opens.max) }}>
                    {e.opens ? e.opens.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(e.openPct, heat.openPct.min, heat.openPct.max), fontWeight: heatWeight(e.openPct, heat.openPct.min, heat.openPct.max) }}>
                    {e.openPct ? `${e.openPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(e.clicks, heat.clicks.min, heat.clicks.max), fontWeight: heatWeight(e.clicks, heat.clicks.min, heat.clicks.max) }}>
                    {e.clicks || "—"}
                  </td>
                  <td className="py-2 pr-4"
                    style={{ color: heatColor(e.ctrPct, heat.ctrPct.min, heat.ctrPct.max), fontWeight: heatWeight(e.ctrPct, heat.ctrPct.min, heat.ctrPct.max) }}>
                    {e.ctrPct ? `${e.ctrPct.toFixed(2)}%` : "—"}
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
