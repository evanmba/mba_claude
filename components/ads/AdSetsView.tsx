"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SourceRow, AttributionData } from "@/lib/attribution";

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) => n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (n: number) => n === 0 ? "—" : n.toLocaleString("en-US");
const pct = (n: number) => n === 0 ? "—" : `${n.toFixed(1)}%`;
const ratio = (n: number) => n === 0 ? "—" : `${n.toFixed(2)}x`;

// ─── Column definitions ───────────────────────────────────────────────────────
type SortKey = keyof SourceRow;

interface ColDef {
  key: SortKey;
  label: string;
  fmt: (v: number) => string;
  hib: boolean;          // higher is better
  requiresSpend?: boolean;
  group: "source" | "volume" | "cost" | "results" | "roas";
}

const COLS: ColDef[] = [
  // Volume
  { key: "leads",         label: "Leads",         fmt: num,   hib: true,  group: "volume" },
  { key: "bookedCalls",   label: "Booked",         fmt: num,   hib: true,  group: "volume" },
  { key: "takenCalls",    label: "Taken",          fmt: num,   hib: true,  group: "volume" },
  { key: "showUpRate",    label: "Show %",         fmt: pct,   hib: true,  group: "volume" },
  { key: "deals",         label: "Deals",          fmt: num,   hib: true,  group: "volume" },
  { key: "closeRate",     label: "Close %",        fmt: pct,   hib: true,  group: "volume" },
  // Cost (spend required)
  { key: "spend",         label: "Spend",          fmt: $$,    hib: false, requiresSpend: true, group: "cost" },
  { key: "cpl",           label: "Cost/Lead",      fmt: $$,    hib: false, requiresSpend: true, group: "cost" },
  { key: "costPerBooked", label: "Cost/Booked",    fmt: $$,    hib: false, requiresSpend: true, group: "cost" },
  { key: "costPerTaken",  label: "Cost/Taken",     fmt: $$,    hib: false, requiresSpend: true, group: "cost" },
  { key: "cpa",           label: "CPA",            fmt: $$,    hib: false, requiresSpend: true, group: "cost" },
  // Results
  { key: "cashCollected", label: "Cash",           fmt: $$,    hib: true,  group: "results" },
  { key: "revenue",       label: "Revenue",        fmt: $$,    hib: true,  group: "results" },
  // ROAS
  { key: "cashRoas",      label: "Cash ROAS",      fmt: ratio, hib: true,  requiresSpend: true, group: "roas" },
  { key: "revenueRoas",   label: "Rev ROAS",       fmt: ratio, hib: true,  requiresSpend: true, group: "roas" },
];

const GROUP_LABEL: Record<string, string> = { volume: "Volume", cost: "Cost", results: "Results", roas: "ROAS" };
const GROUP_COLOR: Record<string, string> = {
  volume:  "#8b5cf6",
  cost:    "#3b82f6",
  results: "#22c55e",
  roas:    "#f59e0b",
};

// ─── Totals ───────────────────────────────────────────────────────────────────
function calcTotals(rows: SourceRow[]): SourceRow {
  const s = (k: keyof SourceRow) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const spend   = s("spend");
  const leads   = s("leads");
  const booked  = s("bookedCalls");
  const taken   = s("takenCalls");
  const deals   = s("deals");
  const cash    = s("cashCollected");
  const revenue = s("revenue");
  return {
    source: "TOTAL",
    spend, leads,
    bookedCalls:   booked,
    takenCalls:    taken,
    noShows:       s("noShows"),
    showUpRate:    booked > 0 ? (taken  / booked) * 100 : 0,
    deals,
    closeRate:     taken  > 0 ? (deals  / taken)  * 100 : 0,
    cashCollected: cash,
    revenue,
    cpl:           spend > 0 && leads  > 0 ? spend / leads  : 0,
    costPerBooked: spend > 0 && booked > 0 ? spend / booked : 0,
    costPerTaken:  spend > 0 && taken  > 0 ? spend / taken  : 0,
    cpa:           spend > 0 && deals  > 0 ? spend / deals  : 0,
    cashRoas:      spend > 0 ? cash    / spend : 0,
    revenueRoas:   spend > 0 ? revenue / spend : 0,
  };
}

// ─── Cell coloring (vs avg) ───────────────────────────────────────────────────
function cellColor(val: number, avg: number, hib: boolean) {
  if (!val || !avg) return "var(--foreground)";
  const r = val / avg;
  if (hib  ? r >= 1.15 : r <= 0.85) return "#4ade80";
  if (hib  ? r <= 0.85 : r >= 1.15) return "#f87171";
  return "var(--foreground)";
}

// ─── Spend setup card ─────────────────────────────────────────────────────────
function SpendSetupBanner() {
  return (
    <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
      <span style={{ color: "#3b82f6", fontSize: 16, lineHeight: 1.5 }}>ℹ</span>
      <div className="text-xs" style={{ color: "#94a3b8" }}>
        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Spend data not connected.</span>
        {" "}Add a tab named <code className="px-1 py-0.5 rounded font-mono text-[11px]" style={{ background: "#1e293b", color: "#a78bfa" }}>AD SPEND</code> to your sheet with two columns: <code className="font-mono text-[11px]" style={{ color: "#a78bfa" }}>Source | Spend</code>.
        Each row = one source and its total spend. Cost and ROAS columns will auto-populate.
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AdSetsView({ data }: { data: AttributionData }) {
  const [sortKey, setSortKey] = useState<SortKey>("bookedCalls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (data.rows.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>No call data found</p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Make sure the <code className="font-mono px-1 py-0.5 rounded" style={{ background: "var(--secondary)", color: "#a78bfa" }}>CALLS</code> tab exists in your Google Sheet and the API key is set.
        </p>
      </div>
    );
  }

  const activeCols = COLS.filter((c) => !c.requiresSpend || data.hasSpend);
  const total = calcTotals(data.rows);

  // Averages per column for color coding
  const avgs: Partial<Record<SortKey, number>> = {};
  for (const col of activeCols) {
    const vals = data.rows.map((r) => r[col.key] as number).filter((v) => v > 0);
    avgs[col.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const sorted = [...data.rows].sort((a, b) => {
    const av = a[sortKey] as number, bv = b[sortKey] as number;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  // Summary strip — always show key totals
  const summaryCards = [
    { label: "Total Booked", value: num(total.bookedCalls), color: "#8b5cf6" },
    { label: "Taken Calls",  value: num(total.takenCalls),  color: "#f59e0b" },
    { label: "Deals Closed", value: num(total.deals),       color: "#22c55e" },
    { label: "Cash",         value: $$(total.cashCollected), color: "#3b82f6" },
    ...(data.hasSpend ? [
      { label: "Total Spend", value: $$(total.spend),       color: "#ef4444" },
      { label: "Cash ROAS",   value: ratio(total.cashRoas), color: "#f59e0b" },
    ] : []),
  ];

  // Group headers: which cols belong to each group
  const groups = ["volume", "cost", "results", "roas"] as const;

  return (
    <div className="space-y-4">
      {!data.hasSpend && <SpendSetupBanner />}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.slice(0, 4).map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Group row */}
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="sticky left-0 z-10 px-4 py-2" style={{ background: "var(--card)", minWidth: 170 }} />
                {groups.map((g) => {
                  const cols = activeCols.filter((c) => c.group === g);
                  if (!cols.length) return null;
                  return (
                    <th key={g} colSpan={cols.length}
                      className="px-2 py-1.5 text-center text-xs font-bold uppercase tracking-widest"
                      style={{ color: GROUP_COLOR[g], borderLeft: "1px solid var(--border)" }}>
                      {GROUP_LABEL[g]}
                    </th>
                  );
                })}
              </tr>
              {/* Column row */}
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                <th className="sticky left-0 z-10 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ background: "var(--card)", color: "var(--muted-foreground)", minWidth: 170 }}>
                  Source
                </th>
                {activeCols.map((col, ci) => {
                  const prevGroup = ci > 0 ? activeCols[ci - 1].group : null;
                  return (
                    <th key={col.key}
                      className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                      style={{
                        color: sortKey === col.key ? "#e2e8f0" : "var(--muted-foreground)",
                        borderLeft: prevGroup !== col.group ? "1px solid var(--border)" : undefined,
                      }}
                      onClick={() => toggleSort(col.key)}>
                      <span className="inline-flex items-center justify-end gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? (sortDir === "desc" ? <ArrowDown size={11} style={{ color: "#3b82f6" }} /> : <ArrowUp size={11} style={{ color: "#3b82f6" }} />)
                          : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, ri) => (
                <tr key={row.source}
                  style={{ borderTop: "1px solid var(--border)", background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td className="sticky left-0 z-10 px-4 py-3 font-medium text-sm truncate max-w-[170px]"
                    style={{ background: ri % 2 === 0 ? "var(--card)" : "#0d1a2d", color: "var(--foreground)" }}
                    title={row.source}>
                    {row.source}
                  </td>
                  {activeCols.map((col, ci) => {
                    const val = row[col.key] as number;
                    const prevGroup = ci > 0 ? activeCols[ci - 1].group : null;
                    return (
                      <td key={col.key}
                        className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-sm"
                        style={{
                          color: cellColor(val, avgs[col.key] ?? 0, col.hib),
                          fontWeight: val > 0 ? 500 : 400,
                          borderLeft: prevGroup !== col.group ? "1px solid var(--border)" : undefined,
                        }}>
                        {col.fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Totals */}
              <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(59,130,246,0.05)" }}>
                <td className="sticky left-0 z-10 px-4 py-3 text-xs font-bold uppercase tracking-wider"
                  style={{ background: "rgba(59,130,246,0.05)", color: "#3b82f6" }}>Total</td>
                {activeCols.map((col, ci) => {
                  const prevGroup = ci > 0 ? activeCols[ci - 1].group : null;
                  return (
                    <td key={col.key}
                      className="px-3 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap"
                      style={{
                        color: "#e2e8f0",
                        borderLeft: prevGroup !== col.group ? "1px solid var(--border)" : undefined,
                      }}>
                      {col.fmt(total[col.key] as number)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
          <span><span style={{ color: "#4ade80" }}>■</span> above avg</span>
          <span><span style={{ color: "#f87171" }}>■</span> below avg</span>
          <span className="ml-auto">{data.rows.length} sources · updated {data.lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}
