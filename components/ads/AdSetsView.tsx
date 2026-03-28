"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import type { SourceRow, AttributionData } from "@/lib/attribution";
import type { MetaLevel } from "@/lib/meta";

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const ratio = (n: number) => (n === 0 ? "—" : `${n.toFixed(2)}x`);

// ─── Column definitions ───────────────────────────────────────────────────────
type SortKey = keyof SourceRow;

interface ColDef { key: SortKey; label: string; fmt: (v: number) => string; hib: boolean; }

// Groups: each has a label, color, and 1-2 columns
const COLUMN_GROUPS: { label: string; color: string; cols: ColDef[]; spendOnly?: boolean }[] = [
  {
    label: "Spend", color: "#ef4444", spendOnly: true,
    cols: [{ key: "spend", label: "Amount", fmt: $$, hib: false }],
  },
  {
    label: "Booked Calls", color: "#3b82f6",
    cols: [
      { key: "bookedCalls",   label: "#",    fmt: num, hib: true  },
      { key: "costPerBooked", label: "Cost", fmt: $$,  hib: false },
    ],
  },
  {
    label: "Taken Calls", color: "#f59e0b",
    cols: [
      { key: "takenCalls",   label: "#",    fmt: num, hib: true  },
      { key: "costPerTaken", label: "Cost", fmt: $$,  hib: false },
    ],
  },
  {
    label: "Deals", color: "#22c55e",
    cols: [
      { key: "deals", label: "#",   fmt: num, hib: true  },
      { key: "cpa",   label: "CPA", fmt: $$,  hib: false },
    ],
  },
  {
    label: "Cash", color: "#06b6d4",
    cols: [
      { key: "cashCollected", label: "Collected", fmt: $$,    hib: true },
      { key: "cashRoas",      label: "ROAS",      fmt: ratio, hib: true },
    ],
  },
  {
    label: "Revenue", color: "#a78bfa",
    cols: [
      { key: "revenue",     label: "Total", fmt: $$,    hib: true },
      { key: "revenueRoas", label: "ROAS",  fmt: ratio, hib: true },
    ],
  },
];

const LEVELS: { value: MetaLevel; label: string }[] = [
  { value: "campaign", label: "Campaign" },
  { value: "adset",    label: "Ad Set" },
  { value: "ad",       label: "Creative" },
];

const DATE_PRESETS = [
  { value: "today",               label: "Today" },
  { value: "yesterday",           label: "Yesterday" },
  { value: "this_week_mon_today", label: "This Week" },
  { value: "last_week_mon_sun",   label: "Last Week" },
  { value: "this_month",          label: "This Month" },
  { value: "last_month",          label: "Last Month" },
  { value: "this_quarter",        label: "This Quarter" },
  { value: "last_quarter",        label: "Last Quarter" },
];

// ─── Totals ────────────────────────────────────────────────────────────────────
function totals(rows: SourceRow[]): SourceRow {
  const s = (k: keyof SourceRow) => rows.reduce((a, r) => a + ((r[k] as number) || 0), 0);
  const spend = s("spend"), booked = s("bookedCalls"), taken = s("takenCalls"),
        deals = s("deals"), cash = s("cashCollected"), rev = s("revenue");
  return {
    source: "TOTAL", spend,
    bookedCalls: booked, takenCalls: taken, deals, cashCollected: cash, revenue: rev,
    costPerBooked: spend > 0 && booked > 0 ? spend / booked : 0,
    costPerTaken:  spend > 0 && taken  > 0 ? spend / taken  : 0,
    cpa:           spend > 0 && deals  > 0 ? spend / deals  : 0,
    cashRoas:      spend > 0 ? cash / spend : 0,
    revenueRoas:   spend > 0 ? rev  / spend : 0,
  };
}

// ─── Cell color vs column average ─────────────────────────────────────────────
function cellColor(val: number, avg: number, hib: boolean) {
  if (!val || !avg) return "var(--foreground)";
  const r = val / avg;
  if (hib ? r >= 1.2 : r <= 0.8) return "#4ade80";
  if (hib ? r <= 0.8 : r >= 1.2) return "#f87171";
  return "var(--foreground)";
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AdSetsView({ data }: { data: AttributionData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>("bookedCalls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function navigate(level: MetaLevel, datePreset: string) {
    startTransition(() => router.push(`/ads?level=${level}&datePreset=${datePreset}`));
  }

  const activeGroups = COLUMN_GROUPS.filter((g) => !g.spendOnly || data.hasSpend);
  const allCols = activeGroups.flatMap((g) => g.cols);

  // Per-column averages for color coding
  const avgs: Partial<Record<SortKey, number>> = {};
  for (const col of allCols) {
    const vals = data.rows.map((r) => r[col.key] as number).filter((v) => v > 0);
    avgs[col.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const sorted = [...data.rows].sort((a, b) => {
    const av = (a[sortKey] as number) || 0, bv = (b[sortKey] as number) || 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  const total = totals(data.rows);

  if (data.error || data.rows.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>No data</p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {data.error ?? "No rows with booked calls found in the Call Source tab."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.15s" }}>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: data.metaConnected ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)", border: `1px solid ${data.metaConnected ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)"}` }}>
          {data.metaConnected
            ? <><CheckCircle2 size={12} style={{ color: "#22c55e" }} /><span style={{ color: "#22c55e" }}>Meta spend live</span></>
            : <><AlertCircle size={12} style={{ color: "#64748b" }} /><span style={{ color: "#64748b" }}>No spend data</span></>}
        </div>

        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {LEVELS.map((l) => (
            <button key={l.value} onClick={() => navigate(l.value, data.datePreset)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: data.level === l.value ? "#3b82f6" : "var(--card)", color: data.level === l.value ? "#fff" : "var(--muted-foreground)" }}>
              {l.label}
            </button>
          ))}
        </div>

        <select value={data.datePreset} onChange={(e) => navigate(data.level, e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5"
          style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", outline: "none" }}>
          {DATE_PRESETS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {[
          ...(data.hasSpend ? [{ label: "Spend",   value: $$(total.spend),         color: "#ef4444" }] : []),
          { label: "Booked",  value: num(total.bookedCalls),   color: "#3b82f6" },
          { label: "Taken",   value: num(total.takenCalls),    color: "#f59e0b" },
          { label: "Deals",   value: num(total.deals),         color: "#22c55e" },
          { label: "Cash",    value: $$(total.cashCollected),  color: "#06b6d4" },
          ...(data.hasSpend ? [{ label: "Cash ROAS", value: ratio(total.cashRoas), color: "#a78bfa" }] : []),
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3 sm:p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
            <p className="text-base sm:text-xl font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Group labels */}
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="sticky left-0 z-10 px-4 py-2" style={{ background: "var(--card)", minWidth: 180 }} />
                {activeGroups.map((g) => (
                  <th key={g.label} colSpan={g.cols.length}
                    className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{ color: g.color, borderLeft: "1px solid var(--border)" }}>
                    {g.label}
                  </th>
                ))}
              </tr>
              {/* Column headers */}
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                <th className="sticky left-0 z-10 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: "rgba(15,23,42,0.98)", color: "var(--muted-foreground)" }}>
                  {data.level === "campaign" ? "Campaign" : data.level === "ad" ? "Creative" : "Ad Set"}
                </th>
                {activeGroups.map((g) =>
                  g.cols.map((col, ci) => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                      style={{ color: sortKey === col.key ? "#e2e8f0" : "var(--muted-foreground)", borderLeft: ci === 0 ? "1px solid var(--border)" : undefined }}>
                      <span className="inline-flex items-center justify-end gap-1">
                        {col.label}
                        {sortKey === col.key && (sortDir === "desc"
                          ? <ArrowDown size={10} style={{ color: "#3b82f6" }} />
                          : <ArrowUp size={10} style={{ color: "#3b82f6" }} />)}
                      </span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, ri) => (
                <tr key={row.source} style={{ borderTop: "1px solid var(--border)", background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}>
                  <td className="sticky left-0 z-10 px-4 py-3 font-medium text-sm"
                    style={{ background: ri % 2 === 0 ? "var(--card)" : "#0d1a2d", maxWidth: 220 }}>
                    <div className="flex items-center gap-2">
                      {row.metaStatus && (
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                          style={{ background: row.metaStatus === "ACTIVE" ? "#22c55e" : row.metaStatus === "PAUSED" ? "#f59e0b" : "#475569" }} />
                      )}
                      <span className="truncate" style={{ color: "var(--foreground)" }} title={row.source}>{row.source}</span>
                    </div>
                  </td>
                  {activeGroups.map((g) =>
                    g.cols.map((col, ci) => {
                      const val = (row[col.key] as number) || 0;
                      return (
                        <td key={col.key}
                          className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-sm"
                          style={{ color: cellColor(val, avgs[col.key] ?? 0, col.hib), fontWeight: val > 0 ? 500 : 400, borderLeft: ci === 0 ? "1px solid var(--border)" : undefined }}>
                          {col.fmt(val)}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(59,130,246,0.06)" }}>
                <td className="sticky left-0 z-10 px-4 py-3 text-xs font-bold uppercase tracking-wider"
                  style={{ background: "rgba(10,20,40,0.98)", color: "#3b82f6" }}>Total</td>
                {activeGroups.map((g) =>
                  g.cols.map((col, ci) => (
                    <td key={col.key}
                      className="px-3 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap"
                      style={{ color: "#e2e8f0", borderLeft: ci === 0 ? "1px solid var(--border)" : undefined }}>
                      {col.fmt((total[col.key] as number) || 0)}
                    </td>
                  ))
                )}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 flex items-center gap-3 text-xs flex-wrap"
          style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
          <span><span style={{ color: "#4ade80" }}>■</span> above avg</span>
          <span><span style={{ color: "#f87171" }}>■</span> below avg</span>
          <span className="ml-auto">{data.rows.length} rows · {data.lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}
