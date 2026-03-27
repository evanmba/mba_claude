"use client";

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from "lucide-react";
import type { AdSetRow, AdSetsData } from "@/lib/adsets";

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) => n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (n: number) => n === 0 ? "—" : n.toLocaleString("en-US");
const pct = (n: number) => n === 0 ? "—" : `${n.toFixed(1)}%`;
const ratio = (n: number) => n === 0 ? "—" : `${n.toFixed(2)}x`;

// ─── Column config ────────────────────────────────────────────────────────────
type SortKey = keyof AdSetRow;

interface Col {
  key: SortKey;
  label: string;
  shortLabel: string;
  fmt: (n: number) => string;
  higherIsBetter: boolean;
  group: "spend" | "leads" | "calls" | "deals" | "revenue";
}

const COLS: Col[] = [
  { key: "spend",        label: "Spend",           shortLabel: "Spend",   fmt: $$,    higherIsBetter: false, group: "spend" },
  { key: "leads",        label: "Leads",            shortLabel: "Leads",   fmt: num,   higherIsBetter: true,  group: "leads" },
  { key: "costPerLead",  label: "Cost/Lead",        shortLabel: "CPL",     fmt: $$,    higherIsBetter: false, group: "leads" },
  { key: "bookedCalls",  label: "Booked",           shortLabel: "Booked",  fmt: num,   higherIsBetter: true,  group: "calls" },
  { key: "costPerBooked",label: "Cost/Booked",      shortLabel: "CPB",     fmt: $$,    higherIsBetter: false, group: "calls" },
  { key: "takenCalls",   label: "Taken Calls",      shortLabel: "Taken",   fmt: num,   higherIsBetter: true,  group: "calls" },
  { key: "costPerTaken", label: "Cost/Taken",       shortLabel: "CPT",     fmt: $$,    higherIsBetter: false, group: "calls" },
  { key: "showUpRate",   label: "Show Rate",        shortLabel: "Show%",   fmt: pct,   higherIsBetter: true,  group: "calls" },
  { key: "deals",        label: "Deals",            shortLabel: "Deals",   fmt: num,   higherIsBetter: true,  group: "deals" },
  { key: "closeRate",    label: "Close Rate",       shortLabel: "Close%",  fmt: pct,   higherIsBetter: true,  group: "deals" },
  { key: "cpa",          label: "CPA",              shortLabel: "CPA",     fmt: $$,    higherIsBetter: false, group: "deals" },
  { key: "cash",         label: "Cash",             shortLabel: "Cash",    fmt: $$,    higherIsBetter: true,  group: "revenue" },
  { key: "revenue",      label: "Revenue",          shortLabel: "Rev",     fmt: $$,    higherIsBetter: true,  group: "revenue" },
  { key: "cashRoas",     label: "Cash ROAS",        shortLabel: "ROAS",    fmt: ratio, higherIsBetter: true,  group: "revenue" },
];

const GROUP_COLORS: Record<string, string> = {
  spend:   "#3b82f6",
  leads:   "#8b5cf6",
  calls:   "#f59e0b",
  deals:   "#ef4444",
  revenue: "#22c55e",
};

// ─── Setup instructions ───────────────────────────────────────────────────────
function SetupCard() {
  return (
    <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#3b82f615" }}>
          <Info size={18} style={{ color: "#3b82f6" }} />
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Connect your ad set data</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Add a tab called <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "var(--secondary)", color: "#a78bfa" }}>AD SETS</code> to your Google Sheet with these columns:
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--secondary)" }}>
              {["Ad Set", "Spend", "Leads", "Cost Per Lead", "Booked", "Cost Per Booked", "Taken", "Cost Per Taken", "Show Rate", "Deals", "Close Rate", "CPA", "Cash", "Revenue", "Cash ROAS"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              {["Top of Feed - Broad", "$4,210", "38", "$110", "12", "$350", "9", "$467", "75%", "3", "33%", "$1,403", "$12,600", "$19,800", "2.99x"].map((v, i) => (
                <td key={i} className="px-3 py-2 whitespace-nowrap" style={{ color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>{v}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <p>1. Add the tab to your sheet and fill in one row per ad set.</p>
        <p>2. Publish it: <span style={{ color: "var(--foreground)" }}>File → Share → Publish to web → Sheet: AD SETS → CSV</span> → copy the URL.</p>
        <p>3. Add it to Vercel: <span style={{ color: "var(--foreground)" }}>Settings → Environment Variables → <code className="font-mono" style={{ color: "#a78bfa" }}>AD_SETS_CSV_URL</code></span> → Redeploy.</p>
      </div>
    </div>
  );
}

// ─── Total row ────────────────────────────────────────────────────────────────
function totals(rows: AdSetRow[]): AdSetRow {
  const sum = (k: keyof AdSetRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const spend     = sum("spend");
  const leads     = sum("leads");
  const booked    = sum("bookedCalls");
  const taken     = sum("takenCalls");
  const deals     = sum("deals");
  const cash      = sum("cash");
  const revenue   = sum("revenue");
  return {
    name:          "TOTAL",
    spend,
    leads,
    costPerLead:   leads  > 0 ? spend / leads  : 0,
    bookedCalls:   booked,
    costPerBooked: booked > 0 ? spend / booked : 0,
    takenCalls:    taken,
    costPerTaken:  taken  > 0 ? spend / taken  : 0,
    showUpRate:    booked > 0 ? (taken / booked) * 100 : 0,
    deals,
    closeRate:     taken  > 0 ? (deals / taken) * 100  : 0,
    cpa:           deals  > 0 ? spend / deals   : 0,
    cash,
    revenue,
    cashRoas:      spend  > 0 ? cash / spend    : 0,
    revenueRoas:   spend  > 0 ? revenue / spend : 0,
  };
}

// ─── Cell color ───────────────────────────────────────────────────────────────
function cellColor(val: number, avg: number, col: Col): string {
  if (val === 0 || avg === 0) return "var(--foreground)";
  const ratio = val / avg;
  const good = col.higherIsBetter ? ratio >= 1.1 : ratio <= 0.9;
  const bad  = col.higherIsBetter ? ratio <= 0.9 : ratio >= 1.1;
  if (good) return "#4ade80";
  if (bad)  return "#f87171";
  return "var(--foreground)";
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AdSetsView({ data }: { data: AdSetsData }) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (data.error === "no_data" || data.rows.length === 0) {
    return <SetupCard />;
  }

  const sorted = [...data.rows].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const total = totals(data.rows);

  // Per-column averages (for color coding)
  const avgs: Partial<Record<SortKey, number>> = {};
  for (const col of COLS) {
    const vals = data.rows.map((r) => r[col.key] as number).filter((v) => v > 0);
    avgs[col.key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={11} style={{ opacity: 0.3 }} />;
    return sortDir === "desc" ? <ArrowDown size={11} style={{ color: "#3b82f6" }} /> : <ArrowUp size={11} style={{ color: "#3b82f6" }} />;
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Spend",  value: $$(total.spend),      color: "#3b82f6" },
          { label: "Total Leads",  value: num(total.leads),     color: "#8b5cf6" },
          { label: "Taken Calls",  value: num(total.takenCalls),color: "#f59e0b" },
          { label: "Cash ROAS",    value: ratio(total.cashRoas),color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Group header */}
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-2 text-left sticky left-0 z-10" style={{ background: "var(--card)", minWidth: 160 }} />
                {(["spend","leads","calls","deals","revenue"] as const).map((g) => {
                  const count = COLS.filter((c) => c.group === g).length;
                  return (
                    <th key={g} colSpan={count} className="px-2 py-1.5 text-center text-xs font-bold uppercase tracking-widest"
                      style={{ color: GROUP_COLORS[g], borderLeft: "1px solid var(--border)", letterSpacing: "0.08em" }}>
                      {g}
                    </th>
                  );
                })}
              </tr>
              {/* Column header */}
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider sticky left-0 z-10"
                  style={{ background: "var(--card)", color: "var(--muted-foreground)", minWidth: 160 }}>
                  Ad Set
                </th>
                {COLS.map((col, ci) => (
                  <th key={col.key}
                    className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    style={{
                      color: sortKey === col.key ? "#e2e8f0" : "var(--muted-foreground)",
                      borderLeft: ci === 0 || COLS[ci - 1]?.group !== col.group ? "1px solid var(--border)" : undefined,
                    }}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      <span className="hidden sm:inline">{col.label}</span>
                      <span className="sm:hidden">{col.shortLabel}</span>
                      <SortIcon k={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, ri) => (
                <tr key={row.name}
                  style={{ borderTop: "1px solid var(--border)", background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td className="px-4 py-3 font-medium text-sm sticky left-0 z-10 truncate max-w-[160px]"
                    style={{ background: ri % 2 === 0 ? "var(--card)" : "#0d1a2d", color: "var(--foreground)" }}
                    title={row.name}>
                    {row.name}
                  </td>
                  {COLS.map((col, ci) => {
                    const val = row[col.key] as number;
                    const color = cellColor(val, avgs[col.key] ?? 0, col);
                    return (
                      <td key={col.key}
                        className="px-3 py-3 text-right text-sm tabular-nums whitespace-nowrap"
                        style={{
                          color,
                          fontWeight: val > 0 ? 500 : 400,
                          borderLeft: ci === 0 || COLS[ci - 1]?.group !== col.group ? "1px solid var(--border)" : undefined,
                        }}>
                        {col.fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Totals row */}
              <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(59,130,246,0.05)" }}>
                <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider sticky left-0 z-10"
                  style={{ background: "rgba(59,130,246,0.05)", color: "#3b82f6" }}>
                  Total
                </td>
                {COLS.map((col, ci) => (
                  <td key={col.key}
                    className="px-3 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap"
                    style={{
                      color: "#e2e8f0",
                      borderLeft: ci === 0 || COLS[ci - 1]?.group !== col.group ? "1px solid var(--border)" : undefined,
                    }}>
                    {col.fmt(total[col.key] as number)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 text-xs" style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
          <span style={{ color: "#4ade80" }}>■</span> above avg &nbsp;
          <span style={{ color: "#f87171" }}>■</span> below avg &nbsp;·&nbsp;
          {data.rows.length} ad sets &nbsp;·&nbsp; updated {data.lastUpdated}
        </div>
      </div>
    </div>
  );
}
