"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, DollarSign, RefreshCw, BarChart3, Percent, AlertCircle,
} from "lucide-react";
import { refreshSalesData } from "./actions";
import type { SalesDashboardPayload, CloserData } from "@/lib/sales-fetch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDollar(n: number, compact = false) {
  if (n === 0) return "$0";
  if (compact) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  }
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number) { return n === 0 ? "—" : `${Math.round(n)}%`; }

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
    <span className="text-xs font-semibold px-1 py-0.5 rounded ml-1"
      style={{ background: up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: up ? "#22c55e" : "#ef4444" }}>
      {up ? "+" : ""}{delta}%
    </span>
  );
}

// ─── Aggregation (YTD) ────────────────────────────────────────────────────────

type Period = "monthly" | "ytd";

function aggregateMonths(months: CloserData[], name: string): CloserData {
  if (!months.length) return { name, frontEndRevenue: 0, backEndRevenue: 0, totalRevenue: 0, newCash: 0, backEndCash: 0, totalCash: 0, showRate: 0, offerPct: 0, closePct: 0, cashPerCall: 0, revenuePerCall: 0, takenToFUPct: 0, fuShowRate: 0, fuCloseRate: 0, totalBooked: 0, totalCancels: 0, totalTaken: 0, totalOffers: 0, totalFUBooked: 0, totalFUTaken: 0, totalFUCloses: 0, totalCloses: 0 };
  const s = months.reduce((acc, c) => ({
    ...acc,
    frontEndRevenue: acc.frontEndRevenue + c.frontEndRevenue,
    backEndRevenue:  acc.backEndRevenue  + c.backEndRevenue,
    totalRevenue:    acc.totalRevenue    + c.totalRevenue,
    newCash:         acc.newCash         + c.newCash,
    backEndCash:     acc.backEndCash     + c.backEndCash,
    totalCash:       acc.totalCash       + c.totalCash,
    totalBooked:     acc.totalBooked     + c.totalBooked,
    totalCancels:    acc.totalCancels    + c.totalCancels,
    totalTaken:      acc.totalTaken      + c.totalTaken,
    totalOffers:     acc.totalOffers     + c.totalOffers,
    totalFUBooked:   acc.totalFUBooked   + c.totalFUBooked,
    totalFUTaken:    acc.totalFUTaken    + c.totalFUTaken,
    totalFUCloses:   acc.totalFUCloses   + c.totalFUCloses,
    totalCloses:     acc.totalCloses     + c.totalCloses,
  }), months[0]);
  const b = s.totalBooked, k = s.totalTaken, o = s.totalOffers;
  const fu = s.totalFUBooked, fut = s.totalFUTaken;
  return {
    ...s, name,
    showRate:       b  > 0 ? (k / b)  * 100 : 0,
    offerPct:       k  > 0 ? (o / k)  * 100 : 0,
    closePct:       o  > 0 ? (s.totalCloses / o) * 100 : 0,
    cashPerCall:    k  > 0 ? s.totalCash    / k : 0,
    revenuePerCall: k  > 0 ? s.totalRevenue / k : 0,
    takenToFUPct:   k  > 0 ? (fu  / k)  * 100 : 0,
    fuShowRate:     fu > 0 ? (fut / fu) * 100 : 0,
    fuCloseRate:    fut > 0 ? (s.totalFUCloses / fut) * 100 : 0,
  };
}

function getDisplayData(data: SalesDashboardPayload, period: Period, activeMonth: string): CloserData | null {
  if (period === "ytd") return aggregateMonths(data.monthlyData.map(m => m.closer1), data.closer1Name);
  return data.monthlyData.find(m => m.month === activeMonth)?.closer1 ?? null;
}

// MoM row computed from monthlyData
interface MoMRow {
  month: string;
  booked: number; taken: number; showPct: number;
  offers: number; offerPct: number; closes: number; closePct: number;
  cash: number; cashPerCall: number; revPerCall: number;
  takenToFU: number; fuShow: number; fuClose: number;
}

function computeMoMRows(data: SalesDashboardPayload): MoMRow[] {
  return data.monthlyData.map(m => {
    const d = m.closer1;
    if (!d) return null;
    return {
      month:      m.month.split(" ")[0],
      booked:     d.totalBooked,
      taken:      d.totalTaken,
      showPct:    d.showRate,
      offers:     d.totalOffers,
      offerPct:   d.offerPct,
      closes:     d.totalCloses,
      closePct:   d.closePct,
      cash:       d.totalCash,
      cashPerCall: d.cashPerCall,
      revPerCall:  d.revenuePerCall,
      takenToFU:  d.takenToFUPct,
      fuShow:     d.fuShowRate,
      fuClose:    d.fuCloseRate,
    } as MoMRow;
  }).filter((r): r is MoMRow => r !== null);
}

function computeYTDRow(rows: MoMRow[]): MoMRow {
  if (!rows.length) return { month: "YTD", booked: 0, taken: 0, showPct: 0, offers: 0, offerPct: 0, closes: 0, closePct: 0, cash: 0, cashPerCall: 0, revPerCall: 0, takenToFU: 0, fuShow: 0, fuClose: 0 };
  const b = rows.reduce((s, r) => s + r.booked, 0);
  const k = rows.reduce((s, r) => s + r.taken, 0);
  const o = rows.reduce((s, r) => s + r.offers, 0);
  const c = rows.reduce((s, r) => s + r.closes, 0);
  const cash = rows.reduce((s, r) => s + r.cash, 0);
  return {
    month: "YTD",
    booked: b, taken: k,
    showPct:   b > 0 ? (k / b) * 100 : 0,
    offers: o,
    offerPct:  k > 0 ? (o / k) * 100 : 0,
    closes: c,
    closePct:  o > 0 ? (c / o) * 100 : 0,
    cash,
    cashPerCall: k > 0 ? cash / k : 0,
    revPerCall:  0, // can't sum per-call without total revenue
    takenToFU: 0, fuShow: 0, fuClose: 0,
  };
}

// ─── Sales Funnel ─────────────────────────────────────────────────────────────

function FunnelBar({ label, count, max, note, color, isSub = false }: {
  label: string; count: number; max: number; note?: string; color: string; isSub?: boolean;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className={`flex items-center gap-3 ${isSub ? "pl-5" : ""}`}>
      <div className="w-24 sm:w-32 flex-shrink-0">
        <p className="text-xs font-semibold" style={{ color: isSub ? "var(--muted-foreground)" : "var(--foreground)" }}>{label}</p>
        {note && <p className="text-xs hidden sm:block" style={{ color: "var(--muted-foreground)" }}>{note}</p>}
      </div>
      <div className="flex-1 relative h-7 rounded" style={{ background: "var(--secondary)" }}>
        <div className="h-full rounded transition-all duration-500"
          style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%`, background: color + (isSub ? "99" : "cc") }} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold"
          style={{ color: count > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>{count}</span>
      </div>
    </div>
  );
}

function SalesFunnel({ d, label }: { d: CloserData; label: string }) {
  const max = d.totalBooked;
  const noShow = Math.max(0, d.totalBooked - d.totalCancels - d.totalTaken);
  return (
    <div className="rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "rgba(16,185,129,0.05)" }}>
        <BarChart3 size={15} style={{ color: "#10b981" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Sales Funnel</h2>
        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>— {label}</span>
      </div>
      <div className="px-5 py-4 space-y-2.5">
        <FunnelBar label="Booked"    count={d.totalBooked}  max={max} color="#3b82f6" />
        <FunnelBar label="Cancels"   count={d.totalCancels} max={max} color="#ef4444" isSub
          note={d.totalBooked > 0 ? `${fmtPct((d.totalCancels / d.totalBooked) * 100)} of booked` : undefined} />
        <FunnelBar label="No-Shows"  count={noShow}          max={max} color="#f59e0b" isSub
          note={noShow > 0 && d.totalBooked > 0 ? `${fmtPct((noShow / d.totalBooked) * 100)} of booked` : undefined} />
        <FunnelBar label="Taken"     count={d.totalTaken}   max={max} color="#a855f7"
          note={`${fmtPct(d.showRate)} show rate`} />
        <FunnelBar label="Offered"   count={d.totalOffers}  max={max} color="#10b981"
          note={`${fmtPct(d.offerPct)} of taken`} />
        <FunnelBar label="Closed"    count={d.totalCloses}  max={max} color="#22c55e"
          note={`${fmtPct(d.closePct)} close rate`} />

        <div className="pt-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-dashed" style={{ borderColor: "var(--border)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider px-2" style={{ color: "var(--muted-foreground)" }}>Follow-Up</span>
            <div className="flex-1 border-t border-dashed" style={{ borderColor: "var(--border)" }} />
          </div>
        </div>

        <FunnelBar label="FU Booked"  count={d.totalFUBooked}  max={max} color="#f59e0b"
          note={`${fmtPct(d.takenToFUPct)} of taken`} />
        <FunnelBar label="FU Taken"   count={d.totalFUTaken}   max={max} color="#f59e0b" isSub
          note={`${fmtPct(d.fuShowRate)} FU show`} />
        <FunnelBar label="FU Closed"  count={d.totalFUCloses}  max={max} color="#22c55e" isSub
          note={`${fmtPct(d.fuCloseRate)} FU close`} />
      </div>
      <div className="px-5 py-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ borderColor: "var(--border)", background: "rgba(16,185,129,0.04)" }}>
        {[
          { label: "Booked",  value: d.totalBooked },
          { label: "Taken",   value: d.totalTaken  },
          { label: "Offers",  value: d.totalOffers },
          { label: "Closes",  value: d.totalCloses },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-lg font-bold" style={{ color: value > 0 ? "#10b981" : "var(--muted-foreground)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue & Cash ───────────────────────────────────────────────────────────

function RevenueCashCard({ d, label }: { d: CloserData; label: string }) {
  return (
    <div className="rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "rgba(59,130,246,0.05)" }}>
        <DollarSign size={15} style={{ color: "#3b82f6" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Revenue & Cash</h2>
        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>— {label}</span>
      </div>
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Revenue</p>
        <div className="space-y-2">
          {[
            { label: "Front End",       value: d.frontEndRevenue, color: "#3b82f6" },
            { label: "Back End",        value: d.backEndRevenue,  color: "#a855f7" },
            { label: "Total Revenue",   value: d.totalRevenue,    color: "#3b82f6", bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: bold ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: bold ? 700 : 400 }}>{label}</span>
              <span className="text-sm font-bold" style={{ color: value > 0 ? color : "var(--muted-foreground)" }}>{fmtDollar(value)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-5 border-t my-2" style={{ borderColor: "var(--border)" }} />
      <div className="px-5 pt-2 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Cash Collected</p>
        <div className="space-y-2">
          {[
            { label: "New Cash",        value: d.newCash,      color: "#10b981" },
            { label: "Back End Cash",   value: d.backEndCash,  color: "#22c55e" },
            { label: "Total Cash",      value: d.totalCash,    color: "#10b981", bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: bold ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: bold ? 700 : 400 }}>{label}</span>
              <span className="text-sm font-bold" style={{ color: value > 0 ? color : "var(--muted-foreground)" }}>{fmtDollar(value)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
        {[
          { label: "Cash / Call",    value: fmtDollar(d.cashPerCall),    color: "#10b981" },
          { label: "Revenue / Call", value: fmtDollar(d.revenuePerCall), color: "#3b82f6" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 text-center" style={{ background: "var(--card)" }}>
            <p className="text-lg font-bold" style={{ color }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rate Metrics ─────────────────────────────────────────────────────────────

function RateMetricsCard({ d, label }: { d: CloserData; label: string }) {
  const rates = [
    { label: "Show Rate",     value: d.showRate,     good: 50, warn: 30 },
    { label: "Offer %",       value: d.offerPct,     good: 80, warn: 60 },
    { label: "Close %",       value: d.closePct,     good: 30, warn: 20 },
    { label: "Taken → FU",   value: d.takenToFUPct, good: 60, warn: 40 },
    { label: "FU Show Rate",  value: d.fuShowRate,   good: 40, warn: 20 },
    { label: "FU Close Rate", value: d.fuCloseRate,  good: 60, warn: 40 },
  ];
  return (
    <div className="rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "rgba(245,158,11,0.05)" }}>
        <Percent size={15} style={{ color: "#f59e0b" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Rate Metrics</h2>
        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>— {label}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
        {rates.map(({ label, value, good, warn }) => (
          <div key={label} className="p-4 flex flex-col gap-1" style={{ background: "var(--card)" }}>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: rateColor(value, good, warn) }}>{fmtPct(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Month-over-Month Table ───────────────────────────────────────────────────

function MoMTable({ rows, ytd }: { rows: MoMRow[]; ytd: MoMRow }) {
  if (!rows.length) return null;

  type Col = { key: keyof MoMRow; label: string; fmt: (v: number) => string; good?: number; warn?: number };
  const cols: Col[] = [
    { key: "booked",     label: "Booked",     fmt: v => String(v) },
    { key: "taken",      label: "Taken",       fmt: v => String(v) },
    { key: "showPct",    label: "Show %",      fmt: fmtPct, good: 50, warn: 30 },
    { key: "offers",     label: "Offers",      fmt: v => String(v) },
    { key: "offerPct",   label: "Offer %",     fmt: fmtPct, good: 80, warn: 60 },
    { key: "closes",     label: "Closes",      fmt: v => String(v) },
    { key: "closePct",   label: "Close %",     fmt: fmtPct, good: 30, warn: 20 },
    { key: "cash",       label: "Cash",        fmt: v => fmtDollar(v, true) },
    { key: "cashPerCall",label: "Cash/Call",   fmt: v => fmtDollar(v, true) },
    { key: "revPerCall", label: "Rev/Call",    fmt: v => fmtDollar(v, true) },
    { key: "takenToFU",  label: "Taken→FU",   fmt: fmtPct, good: 60, warn: 40 },
    { key: "fuShow",     label: "FU Show",     fmt: fmtPct, good: 40, warn: 20 },
    { key: "fuClose",    label: "FU Close",    fmt: fmtPct, good: 60, warn: 40 },
  ];

  const stickyCell = (bg = "var(--card)") => ({
    position: "sticky" as const, left: 0, background: bg,
    zIndex: 1, boxShadow: "2px 0 6px rgba(0,0,0,0.25)",
  });

  function DataCells({ row, prev, isBold, isYTD }: { row: MoMRow; prev?: MoMRow; isBold?: boolean; isYTD?: boolean }) {
    return (
      <>
        {cols.map(col => {
          const val = row[col.key] as number;
          const color = col.good
            ? rateColor(val, col.good, col.warn!)
            : isYTD ? "#10b981" : "var(--foreground)";
          const delta = !isYTD && !isBold && prev ? momDelta(val, prev[col.key] as number) : null;
          return (
            <td key={col.key} className="px-3 py-2.5 text-right text-xs whitespace-nowrap"
              style={{ color, fontWeight: isBold || isYTD ? 700 : 400 }}>
              {col.fmt(val)}{delta !== null && <MoMBadge delta={delta} />}
            </td>
          );
        })}
      </>
    );
  }

  const headerBg = "rgba(30,41,59,0.4)";

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "rgba(16,185,129,0.05)" }}>
        <TrendingUp size={15} style={{ color: "#10b981" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Month-over-Month</h2>
        <span className="text-xs ml-1" style={{ color: "var(--muted-foreground)" }}>— badges show change vs prior month</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: headerBg }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap"
                style={{ ...stickyCell(headerBg), color: "var(--muted-foreground)" }}>
                Month
              </th>
              {cols.map(c => (
                <th key={c.key} className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)", borderLeft: "1px solid var(--border)" }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rowBg = i % 2 === 1 ? "rgba(30,41,59,0.15)" : "var(--card)";
              return (
                <tr key={row.month} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-2.5 text-xs font-medium whitespace-nowrap"
                    style={{ ...stickyCell(rowBg), color: "var(--foreground)" }}>
                    {row.month}
                  </td>
                  <DataCells row={row} prev={rows[i - 1]} />
                </tr>
              );
            })}
            <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(16,185,129,0.06)" }}>
              <td className="px-4 py-2.5 text-xs font-bold whitespace-nowrap"
                style={{ ...stickyCell("rgba(16,185,129,0.06)"), color: "#10b981" }}>
                YTD
              </td>
              <DataCells row={ytd} isYTD />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Selector pill helper ─────────────────────────────────────────────────────

function Pills<T extends string>({
  options, value, onChange, accent,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; accent: string }) {
  return (
    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
      <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--secondary)", width: "max-content" }}>
        {options.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)}
            className="px-3 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap"
            style={{ background: value === o.id ? accent : "transparent", color: value === o.id ? "#fff" : "var(--muted-foreground)" }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function SalesClient({ data }: { data: SalesDashboardPayload }) {
  const lastMonth = data.monthlyData[data.monthlyData.length - 1]?.month ?? "";
  const [period,      setPeriod]      = useState<Period>("monthly");
  const [activeMonth, setActiveMonth] = useState(data.currentMonth?.month ?? lastMonth);
  const [isPending,   startTransition] = useTransition();
  const router = useRouter();

  const periodLabel  = period === "ytd" ? "Year to Date" : activeMonth;
  const contextLabel = `${data.closer1Name} · ${periodLabel}`;

  const d       = getDisplayData(data, period, activeMonth);
  const momRows = computeMoMRows(data);
  const ytdRow  = computeYTDRow(momRows);

  const ACCENT = "#10b981";

  function handleRefresh() {
    startTransition(async () => {
      await refreshSalesData();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">

      {/* Mock banner */}
      {data.source === "mock" && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
          <AlertCircle size={14} />
          Showing mock data. Set <code className="font-bold mx-1">SALES_DASHBOARD_SHEET_ID</code> in environment to connect live data.
        </div>
      )}

      {/* Page header — title left, refresh top-right */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
              <TrendingUp size={16} style={{ color: ACCENT }} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>Sales Dashboard</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Call funnel, revenue & cash, rate metrics · {data.closer1Name}
          </p>
        </div>
        {/* Refresh — top right */}
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium flex-shrink-0 transition-all"
          style={{
            color: isPending ? ACCENT : "var(--muted-foreground)",
            background: isPending ? "rgba(16,185,129,0.1)" : "var(--secondary)",
            border: "1px solid transparent",
          }}
          onMouseEnter={e => { if (!isPending) { e.currentTarget.style.color = ACCENT; e.currentTarget.style.background = "rgba(16,185,129,0.1)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.25)"; }}}
          onMouseLeave={e => { if (!isPending) { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "var(--secondary)"; e.currentTarget.style.borderColor = "transparent"; }}}
        >
          <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{isPending ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {/* Period + Month selectors */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Pills<Period>
            options={[{ id: "monthly", label: "Monthly" }, { id: "ytd", label: "Year to Date" }]}
            value={period} onChange={setPeriod} accent={ACCENT}
          />
          {period === "monthly" && (
            <div className="min-w-0 max-w-full">
              <Pills<string>
                options={data.monthlyData.map(m => ({ id: m.month, label: m.month.split(" ")[0] }))}
                value={activeMonth} onChange={setActiveMonth} accent="#3b82f6"
              />
            </div>
          )}
        </div>
      </div>

      {!d ? (
        <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>No data for this selection.</div>
      ) : (
        <>
          {/* 2 KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Cash / Call",        value: fmtDollar(d.cashPerCall),       color: ACCENT,    icon: DollarSign },
              { label: "Total Cash Collected", value: fmtDollar(d.totalCash, true), color: "#22c55e", icon: DollarSign },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-xl border p-5 flex flex-col gap-1"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <Icon size={14} style={{ color }} className="mb-0.5" />
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{contextLabel}</p>
              </div>
            ))}
          </div>

          {/* Funnel + Revenue & Cash */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3"><SalesFunnel d={d} label={contextLabel} /></div>
            <div className="lg:col-span-2"><RevenueCashCard d={d} label={contextLabel} /></div>
          </div>

          {/* Rate Metrics */}
          <RateMetricsCard d={d} label={contextLabel} />

        </>
      )}

      {/* MoM table — always visible, driven by closer selector */}
      <MoMTable rows={momRows} ytd={ytdRow} />
    </div>
  );
}
