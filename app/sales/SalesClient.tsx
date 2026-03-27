"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, DollarSign, Phone, Target, RefreshCw,
  BarChart3, ArrowDown, Users, Percent, AlertCircle,
} from "lucide-react";
import { refreshSalesData } from "./actions";
import type { SalesDashboardPayload, CloserData, YearRow } from "@/lib/sales-fetch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDollar(n: number, compact = false) {
  if (n === 0) return "$0";
  if (compact) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  }
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number) {
  return n === 0 ? "—" : `${Math.round(n)}%`;
}

function rateColor(p: number, good: number, warn: number): string {
  if (p === 0) return "var(--muted-foreground)";
  if (p >= good) return "#22c55e";
  if (p >= warn) return "#f59e0b";
  return "#ef4444";
}

function momDelta(curr: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function MoMBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <span
      className="text-xs font-semibold px-1 py-0.5 rounded"
      style={{
        background: up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: up ? "#22c55e" : "#ef4444",
      }}
    >
      {up ? "+" : ""}{delta}%
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ElementType;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {Icon && <Icon size={14} style={{ color: color ?? "var(--muted-foreground)" }} className="mb-0.5" />}
      <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-xl font-bold leading-tight" style={{ color: color ?? "var(--foreground)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{sub}</p>}
    </div>
  );
}

// ─── Sales Funnel ─────────────────────────────────────────────────────────────

function FunnelBar({
  label, count, max, rate, rateLabel, color, isSub = false,
}: {
  label: string; count: number; max: number; rate?: number; rateLabel?: string;
  color: string; isSub?: boolean;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className={`flex items-center gap-3 ${isSub ? "pl-5" : ""}`}>
      <div className="w-28 flex-shrink-0">
        <p className="text-xs font-semibold" style={{ color: isSub ? "var(--muted-foreground)" : "var(--foreground)" }}>
          {label}
        </p>
        {rateLabel && rate !== undefined && (
          <p className="text-xs" style={{ color: rateLabel ? rateColor(rate, 50, 30) : "var(--muted-foreground)" }}>
            {rateLabel}
          </p>
        )}
      </div>
      <div className="flex-1 relative h-7 rounded" style={{ background: "var(--secondary)" }}>
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${Math.max(pct, 2)}%`, background: color + (isSub ? "99" : "cc") }}
        />
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold"
          style={{ color: count > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

function SalesFunnel({ d }: { d: CloserData }) {
  const max = d.totalBooked;
  const noShow = d.totalBooked - d.totalCancels - d.totalTaken;
  const ACCENT = "#10b981";

  const funnelSteps = [
    { label: "Booked",   count: d.totalBooked,  rate: undefined,       rateLabel: undefined,                   color: "#3b82f6" },
    { label: "Cancels",  count: d.totalCancels, rate: undefined,       rateLabel: undefined,                   color: "#ef4444", isSub: true },
    { label: "No-Shows", count: noShow > 0 ? noShow : 0, rate: undefined, rateLabel: undefined,                color: "#f59e0b", isSub: true },
    { label: "Taken",    count: d.totalTaken,   rate: d.showRate,      rateLabel: `${fmtPct(d.showRate)} show`, color: "#a855f7" },
    { label: "Offered",  count: d.totalOffers,  rate: d.offerPct,      rateLabel: `${fmtPct(d.offerPct)} offered`, color: ACCENT },
    { label: "Closed",   count: d.totalCloses,  rate: d.closePct,      rateLabel: `${fmtPct(d.closePct)} close`, color: "#22c55e" },
  ];

  return (
    <div
      className="rounded-xl border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "rgba(16,185,129,0.05)" }}
      >
        <BarChart3 size={15} style={{ color: ACCENT }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Sales Funnel
        </h2>
        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>
          — {d.name}: what happens after booking
        </span>
      </div>

      <div className="px-5 py-4 space-y-2.5">
        {funnelSteps.map(step => (
          <FunnelBar key={step.label} {...step} max={max} />
        ))}

        {/* Divider before FU section */}
        <div className="pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-dashed" style={{ borderColor: "var(--border)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider px-2" style={{ color: "var(--muted-foreground)" }}>
              Follow-Up Pipeline
            </span>
            <div className="flex-1 border-t border-dashed" style={{ borderColor: "var(--border)" }} />
          </div>
        </div>

        <FunnelBar label="FU Booked"  count={d.totalFUBooked}  max={max} color="#f59e0b"
          rate={d.takenToFUPct} rateLabel={`${fmtPct(d.takenToFUPct)} of taken → FU`} />
        <FunnelBar label="FU Taken"   count={d.totalFUTaken}   max={max} color="#f59e0b" isSub
          rate={d.fuShowRate} rateLabel={`${fmtPct(d.fuShowRate)} FU show`} />
        <FunnelBar label="FU Closed"  count={d.totalFUCloses}  max={max} color="#22c55e" isSub
          rate={d.fuCloseRate} rateLabel={`${fmtPct(d.fuCloseRate)} FU close`} />
      </div>

      {/* Summary row */}
      <div
        className="px-5 py-3 border-t grid grid-cols-4 gap-3"
        style={{ borderColor: "var(--border)", background: "rgba(16,185,129,0.04)" }}
      >
        {[
          { label: "Total Booked", value: d.totalBooked },
          { label: "Total Taken",  value: d.totalTaken  },
          { label: "Total Offers", value: d.totalOffers },
          { label: "Total Closes", value: d.totalCloses },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-lg font-bold" style={{ color: value > 0 ? ACCENT : "var(--muted-foreground)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue & Cash card ──────────────────────────────────────────────────────

function RevenueCashCard({ d }: { d: CloserData }) {
  return (
    <div
      className="rounded-xl border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "rgba(59,130,246,0.05)" }}
      >
        <DollarSign size={15} style={{ color: "#3b82f6" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Revenue & Cash</h2>
      </div>

      {/* Revenue column */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Revenue</p>
        <div className="space-y-2">
          {[
            { label: "Front End",   value: d.frontEndRevenue, color: "#3b82f6" },
            { label: "Back End",    value: d.backEndRevenue,  color: "#a855f7" },
            { label: "Total Revenue", value: d.totalRevenue,  color: "#3b82f6", bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: bold ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: bold ? 700 : 400 }}>
                {label}
              </span>
              <span className="text-sm font-bold" style={{ color: value > 0 ? color : "var(--muted-foreground)" }}>
                {fmtDollar(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-5 border-t my-2" style={{ borderColor: "var(--border)" }} />

      {/* Cash column */}
      <div className="px-5 pt-2 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Cash Collected</p>
        <div className="space-y-2">
          {[
            { label: "New Cash",     value: d.newCash,       color: "#10b981" },
            { label: "Back End Cash", value: d.backEndCash,  color: "#22c55e" },
            { label: "Total Cash",   value: d.totalCash,     color: "#10b981", bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: bold ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: bold ? 700 : 400 }}>
                {label}
              </span>
              <span className="text-sm font-bold" style={{ color: value > 0 ? color : "var(--muted-foreground)" }}>
                {fmtDollar(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-call metrics */}
      <div
        className="grid grid-cols-2 gap-px border-t"
        style={{ borderColor: "var(--border)", background: "var(--border)" }}
      >
        {[
          { label: "Cash / Call",    value: fmtDollar(d.cashPerCall),    color: "#10b981" },
          { label: "Revenue / Call", value: fmtDollar(d.revenuePerCall), color: "#3b82f6" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="p-3 text-center"
            style={{ background: "var(--card)" }}
          >
            <p className="text-lg font-bold" style={{ color }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rate Metrics card ────────────────────────────────────────────────────────

function RateMetricsCard({ d }: { d: CloserData }) {
  const rates = [
    { label: "Show Rate",     value: d.showRate,      good: 50, warn: 30, fmt: fmtPct },
    { label: "Offer %",       value: d.offerPct,      good: 80, warn: 60, fmt: fmtPct },
    { label: "Close %",       value: d.closePct,      good: 30, warn: 20, fmt: fmtPct },
    { label: "Taken → FU",   value: d.takenToFUPct,  good: 60, warn: 40, fmt: fmtPct },
    { label: "FU Show Rate",  value: d.fuShowRate,    good: 40, warn: 20, fmt: fmtPct },
    { label: "FU Close Rate", value: d.fuCloseRate,   good: 60, warn: 40, fmt: fmtPct },
  ];

  return (
    <div
      className="rounded-xl border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "rgba(245,158,11,0.05)" }}
      >
        <Percent size={15} style={{ color: "#f59e0b" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Rate Metrics</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
        {rates.map(({ label, value, good, warn }) => {
          const color = rateColor(value, good, warn);
          return (
            <div key={label} className="p-4 flex flex-col gap-1" style={{ background: "var(--card)" }}>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{fmtPct(value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month-on-Month Table ─────────────────────────────────────────────────────

function MoMTable({ yearRows, sums, monthlyAvg }: { yearRows: YearRow[]; sums: YearRow | null; monthlyAvg: YearRow | null }) {
  if (!yearRows.length) return null;

  const cols: { key: keyof YearRow; label: string; fmt: (v: number) => string; good?: number; warn?: number }[] = [
    { key: "booked",        label: "Booked",     fmt: v => String(v) },
    { key: "taken",         label: "Taken",      fmt: v => String(v) },
    { key: "showPct",       label: "Show %",     fmt: fmtPct, good: 50, warn: 30 },
    { key: "offers",        label: "Offers",     fmt: v => String(v) },
    { key: "closes",        label: "Closes",     fmt: v => String(v) },
    { key: "closePct",      label: "Close %",    fmt: fmtPct, good: 30, warn: 20 },
    { key: "cashCollected", label: "Cash",       fmt: v => fmtDollar(v, true) },
    { key: "cashPerCall",   label: "Cash/Call",  fmt: v => fmtDollar(v, true) },
  ];

  function RowCells({ row, isBold = false, isTotal = false }: { row: YearRow; isBold?: boolean; isTotal?: boolean }) {
    const prevIdx = yearRows.findIndex(r => r.month === row.month) - 1;
    const prev = yearRows[prevIdx];
    return (
      <>
        {cols.map((col, ci) => {
          const val = row[col.key] as number;
          const color = col.good ? rateColor(val, col.good, col.warn!) : (isTotal ? "#10b981" : "var(--foreground)");
          const delta = !isTotal && !isBold && prev ? momDelta(val, prev[col.key] as number) : null;
          return (
            <td
              key={col.key}
              className="px-3 py-2.5 text-right text-xs"
              style={{
                color: isTotal ? color : col.good ? rateColor(val, col.good, col.warn!) : (isBold ? "#10b981" : "var(--foreground)"),
                fontWeight: isBold || isTotal ? 700 : 400,
                background: isTotal ? "rgba(16,185,129,0.06)" : undefined,
                borderLeft: ci === 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div className="flex items-center justify-end gap-1">
                {col.fmt(val)}
                {delta !== null && <MoMBadge delta={delta} />}
              </div>
            </td>
          );
        })}
      </>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "rgba(16,185,129,0.05)" }}
      >
        <TrendingUp size={15} style={{ color: "#10b981" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Month-over-Month</h2>
        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>
          — badges show change vs previous month
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(30,41,59,0.4)" }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Month</th>
              {cols.map(c => (
                <th key={c.key} className="px-3 py-2.5 text-right text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderLeft: "1px solid var(--border)" }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yearRows.map((row, i) => (
              <tr key={row.month} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 1 ? "rgba(30,41,59,0.15)" : undefined }}>
                <td className="px-4 py-2.5 text-xs font-medium" style={{ color: "var(--foreground)", whiteSpace: "nowrap" }}>{row.month}</td>
                <RowCells row={row} />
              </tr>
            ))}

            {monthlyAvg && (
              <tr style={{ borderBottom: "1px solid var(--border)", borderTop: "2px solid var(--border)", background: "rgba(30,41,59,0.4)" }}>
                <td className="px-4 py-2.5 text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>Monthly Avg</td>
                <RowCells row={monthlyAvg} isBold />
              </tr>
            )}

            {sums && (
              <tr style={{ background: "rgba(16,185,129,0.06)" }}>
                <td className="px-4 py-2.5 text-xs font-bold" style={{ color: "#10b981" }}>YTD Total</td>
                <RowCells row={sums} isTotal />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function SalesClient({ data }: { data: SalesDashboardPayload }) {
  const [activeMonth, setActiveMonth] = useState(
    data.currentMonth?.month ?? data.monthlyData[data.monthlyData.length - 1]?.month ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const current = data.monthlyData.find(m => m.month === activeMonth) ?? data.currentMonth;
  const d = current?.closer1;

  function handleRefresh() {
    startTransition(async () => {
      await refreshSalesData();
      router.refresh();
    });
  }

  const ACCENT = "#10b981";

  return (
    <div className="space-y-5">

      {/* Mock data banner */}
      {data.source === "mock" && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}
        >
          <AlertCircle size={14} />
          Showing mock data. Set <code className="font-bold mx-1">SALES_DASHBOARD_SHEET_ID</code> +{" "}
          <code className="font-bold mx-1">GOOGLE_SHEETS_API_KEY</code> in environment to connect live data.
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <TrendingUp size={16} style={{ color: ACCENT }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Sales Dashboard</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {data.closer1Name} · Call funnel, revenue & cash, month-over-month breakdown
          </p>
        </div>

        {/* Month tabs + Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--secondary)" }}>
            {data.monthlyData.map(m => (
              <button
                key={m.month}
                onClick={() => setActiveMonth(m.month)}
                className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                style={{
                  background: activeMonth === m.month ? ACCENT : "transparent",
                  color:      activeMonth === m.month ? "#fff" : "var(--muted-foreground)",
                }}
              >
                {m.month.split(" ")[0]}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium"
            style={{ color: ACCENT, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
            {isPending ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {!d ? (
        <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>No data for this month.</div>
      ) : (
        <>
          {/* KPI stat cards row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Total Booked"    value={String(d.totalBooked)}   icon={Phone}     color="#3b82f6" />
            <MetricCard label="Calls Taken"     value={String(d.totalTaken)}    icon={Phone}     color="#a855f7" />
            <MetricCard label="Total Offers"    value={String(d.totalOffers)}   icon={Target}    color={ACCENT} />
            <MetricCard label="Total Closes"    value={String(d.totalCloses)}   icon={Users}     color="#22c55e" />
            <MetricCard label="Cash / Call"     value={fmtDollar(d.cashPerCall)} icon={DollarSign} color={ACCENT} />
            <MetricCard label="Total Cash"      value={fmtDollar(d.totalCash, true)} icon={DollarSign} color="#22c55e" />
          </div>

          {/* Funnel + Revenue + Rates */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <SalesFunnel d={d} />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-4">
              <RevenueCashCard d={d} />
            </div>
          </div>

          {/* Rate metrics */}
          <RateMetricsCard d={d} />

          {/* Closer #2 if present */}
          {current?.closer2 && (
            <div
              className="rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div
                className="flex items-center gap-2 px-5 py-3 border-b"
                style={{ borderColor: "var(--border)", background: "rgba(168,85,247,0.05)" }}
              >
                <Users size={15} style={{ color: "#a855f7" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {current.closer2.name} · Closer #2
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px" style={{ background: "var(--border)" }}>
                {[
                  { label: "Booked",     value: String(current.closer2.totalBooked) },
                  { label: "Taken",      value: String(current.closer2.totalTaken) },
                  { label: "Offers",     value: String(current.closer2.totalOffers) },
                  { label: "Closes",     value: String(current.closer2.totalCloses) },
                  { label: "Show %",     value: fmtPct(current.closer2.showRate) },
                  { label: "Close %",    value: fmtPct(current.closer2.closePct) },
                  { label: "Cash/Call",  value: fmtDollar(current.closer2.cashPerCall) },
                  { label: "Total Cash", value: fmtDollar(current.closer2.totalCash, true) },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 text-center" style={{ background: "var(--card)" }}>
                    <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Year MoM table always visible */}
      <MoMTable yearRows={data.yearRows} sums={data.sums} monthlyAvg={data.monthlyAvg} />
    </div>
  );
}
