"use client";

import { type MonthlyRow, type SalesDashboard, type YTDRow } from "@/lib/funnel";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Format helpers ────────────────────────────────────────────────────────
const $$ = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const $$$ = (n: number) =>
  n === 0 ? "$0.00" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => (n === 0 ? "0%" : `${n.toFixed(1)}%`);
const num = (n: number) => n.toLocaleString("en-US");
const ratio = (n: number) => (n === 0 ? "0.00x" : `${n.toFixed(2)}x`);

// ─── Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ values, color = "#3b82f6" }: { values: number[]; color?: string }) {
  const data = values.filter((v) => !isNaN(v) && isFinite(v));
  if (data.length < 2) return <div style={{ height: 40 }} />;
  const W = 160;
  const H = 40;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── MoM delta helpers ─────────────────────────────────────────────────────
function momDelta(current: number, previous: number): number | null {
  if (!previous || !current) return null;
  return ((current - previous) / previous) * 100;
}

// ─── Big KPI card ──────────────────────────────────────────────────────────
function BigCard({
  label,
  value,
  sub,
  bg,
  current,
  previous,
  prevLabel,
  higherIsBetter = true,
}: {
  label: string;
  value: string;
  sub?: string;
  bg: string;
  current?: number;
  previous?: number;
  prevLabel?: string;
  higherIsBetter?: boolean;
}) {
  const delta = current != null && previous != null ? momDelta(current, previous) : null;
  const isGood = delta == null ? null : higherIsBetter ? delta >= 0 : delta <= 0;

  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between"
      style={{ background: bg, minHeight: 160 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
            {label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            Month to date
          </p>
        </div>
        {delta != null && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: isGood ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
              color: isGood ? "#86efac" : "#fca5a5",
            }}
          >
            {delta > 0.5 ? (
              <TrendingUp size={11} />
            ) : delta < -0.5 ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-4xl font-bold text-white">{value}</p>
        <div className="flex items-center justify-between mt-1">
          {sub && <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{sub}</p>}
          {previous != null && prevLabel && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              vs {prevLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small stat card ───────────────────────────────────────────────────────
function momDeltaPct(cur: number, prev: number): number | null {
  if (!prev || !cur) return null;
  return ((cur - prev) / prev) * 100;
}

function SmallCard({
  label,
  value,
  color = "#3b82f6",
  values,
  prev,
  curVal,
  higherIsBetter = true,
}: {
  label: string;
  value: string;
  color?: string;
  values?: number[];
  prev?: number | null;
  curVal?: number;
  higherIsBetter?: boolean;
}) {
  const d = prev != null && curVal != null ? momDeltaPct(curVal, prev) : null;
  const isGood = d == null ? null : higherIsBetter ? d >= 0 : d <= 0;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-xl font-bold mb-1" style={{ color }}>
        {value}
      </p>
      {d != null && (
        <p className="text-xs font-semibold mb-1" style={{ color: isGood ? "#4ade80" : "#f87171" }}>
          {d > 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}% vs prior mo
        </p>
      )}
      {values && values.length > 1 && <Sparkline values={trimTrailingZeros(values)} color={color} />}
    </div>
  );
}

function trimTrailingZeros(arr: number[]): number[] {
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return arr.slice(0, end);
}

// Month name mapping for YTD row lookup
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Main component ────────────────────────────────────────────────────────
interface Props {
  monthly: MonthlyRow[];
  salesDashboard: SalesDashboard | null;
  monthLabel: string;
  ytd: YTDRow[];
}

export function MonthlyView({ monthly, salesDashboard, monthLabel, ytd }: Props) {
  const rollup30 = monthly.find((r) => r.period === "30 Days");
  const kpi = rollup30 ?? monthly.find((r) => r.isRollup) ?? null;

  const dailyRows = monthly.filter((r) => !r.isRollup);

  // ── MoM: find previous month's YTD row ──────────────────────────────────
  const [abbr] = monthLabel.split(" ");
  const ABBRS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const currentMonthIdx = ABBRS.indexOf(abbr?.toUpperCase() ?? "");
  const prevMonthIdx = currentMonthIdx > 0 ? currentMonthIdx - 1 : -1;
  const prevMonthName = prevMonthIdx >= 0 ? MONTH_NAMES[prevMonthIdx] : null;
  const prevMonthAbbr = prevMonthIdx >= 0 ? ABBRS[prevMonthIdx] : null;

  const prevYTD = prevMonthName
    ? ytd.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null
    : null;

  const cashPerCall = kpi && kpi.takenCalls > 0 ? kpi.cash / kpi.takenCalls : 0;
  const prevCashPerCall = prevYTD && prevYTD.takenCalls > 0 ? prevYTD.cash / prevYTD.takenCalls : 0;

  // Sparkline data — trimmed to actual tracked days (no trailing zeros)
  const dailySpend  = dailyRows.map((r) => r.amountSpent);
  const dailyLeads  = dailyRows.map((r) => r.leads);
  const dailyBooked = dailyRows.map((r) => r.bookedCalls);
  const dailyClosed = dailyRows.map((r) => r.dealsClosed);

  return (
    <div>
      {/* Big KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BigCard
          label="Taken Calls"
          value={kpi ? num(kpi.takenCalls) : "—"}
          sub={kpi ? `Show-up: ${pct(kpi.showUpRate)}` : undefined}
          bg="#1e3a5f"
          current={kpi?.takenCalls}
          previous={prevYTD?.takenCalls}
          prevLabel={prevMonthAbbr ?? undefined}
        />
        <BigCard
          label="$ Per Call"
          value={kpi ? $$(cashPerCall) : "—"}
          sub={kpi ? `Cash: ${$$(kpi.cash)}` : undefined}
          bg="#78350f"
          current={cashPerCall}
          previous={prevCashPerCall}
          prevLabel={prevMonthAbbr ?? undefined}
        />
        <BigCard
          label="Show Up Rate"
          value={kpi ? pct(kpi.showUpRate) : "—"}
          sub={kpi ? `${num(kpi.takenCalls)} of ${num(kpi.bookedCalls)} booked` : undefined}
          bg={kpi && kpi.showUpRate >= 50 ? "#14532d" : "#7f1d1d"}
          current={kpi?.showUpRate}
          previous={prevYTD?.showUpRate}
          prevLabel={prevMonthAbbr ?? undefined}
        />
        <BigCard
          label="Cash Collected"
          value={kpi ? $$(kpi.cash) : "—"}
          sub={kpi ? `Revenue: ${$$(kpi.revenue)}` : undefined}
          bg="#14532d"
          current={kpi?.cash}
          previous={prevYTD?.cash}
          prevLabel={prevMonthAbbr ?? undefined}
        />
      </div>

      {/* Sales Dashboard callout (if available) */}
      {salesDashboard && (
        <div
          className="rounded-xl p-5 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
              Sales Summary
            </p>
            <div className="space-y-2">
              <SalesRow label="Total Revenue" value={$$(salesDashboard.totalRevenue)} />
              <SalesRow label="Total Cash"    value={$$(salesDashboard.totalCash)} />
              <SalesRow label="Front End Rev" value={$$(salesDashboard.frontEndRevenue)} />
              <SalesRow label="New Cash"      value={$$(salesDashboard.newCash)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
              Call Metrics
            </p>
            <div className="space-y-2">
              <SalesRow label="Calls Booked"  value={num(salesDashboard.totalCallsBooked)} />
              <SalesRow label="Calls Taken"   value={num(salesDashboard.totalCallsTaken)} />
              <SalesRow label="Show Rate"     value={pct(salesDashboard.showRate)} />
              <SalesRow label="Cancels"       value={num(salesDashboard.totalCancels)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
              Close Metrics
            </p>
            <div className="space-y-2">
              <SalesRow label="Offers"        value={num(salesDashboard.totalOffers)} />
              <SalesRow label="Offer Rate"    value={pct(salesDashboard.offerRate)} />
              <SalesRow label="Closes"        value={num(salesDashboard.totalCloses)} />
              <SalesRow label="Close Rate"    value={pct(salesDashboard.closeRate)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
              Per-Call Metrics
            </p>
            <div className="space-y-2">
              <SalesRow label="Cash / Call"    value={$$$(salesDashboard.cashPerCall)} />
              <SalesRow label="Revenue / Call" value={$$$(salesDashboard.revenuePerCall)} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom stat cards with sparklines + MoM */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallCard label="Amount Spent" value={kpi ? $$(kpi.amountSpent) : "—"} color="#ef4444" values={dailySpend}  curVal={kpi?.amountSpent} prev={prevYTD?.amountSpent} higherIsBetter={false} />
        <SmallCard label="AgeQ Leads"   value={kpi ? num(kpi.leads) : "—"}       color="#3b82f6" values={dailyLeads}  curVal={kpi?.leads}       prev={prevYTD?.leads} />
        <SmallCard label="Booked Calls" value={kpi ? num(kpi.bookedCalls) : "—"} color="#06b6d4" values={dailyBooked} curVal={kpi?.bookedCalls} prev={prevYTD?.bookedCalls} />
        <SmallCard label="Deals Closed" value={kpi ? num(kpi.dealsClosed) : "—"} color="#22c55e" values={dailyClosed} curVal={kpi?.dealsClosed} prev={prevYTD?.dealsClosed} />
        <SmallCard label="Close Rate"   value={kpi ? pct(kpi.closeRate) : "—"}   color="#f59e0b" curVal={kpi?.closeRate}    prev={prevYTD?.closeRate}    higherIsBetter />
        <SmallCard label="Cash ROAS"    value={kpi ? ratio(kpi.cashROAS) : "—"}   color="#10b981" curVal={kpi?.cashROAS}     prev={prevYTD?.cashROAS} />
        <SmallCard label="Rev ROAS"     value={kpi ? ratio(kpi.revenueROAS) : "—"} color="#a78bfa" curVal={kpi?.revenueROAS}  prev={prevYTD?.revenueROAS} />
        <SmallCard label="Cash"         value={kpi ? $$(kpi.cash) : "—"}           color="#22c55e" curVal={kpi?.cash}         prev={prevYTD?.cash} />
        <SmallCard label="Revenue"      value={kpi ? $$(kpi.revenue) : "—"}        color="#3b82f6" curVal={kpi?.revenue}      prev={prevYTD?.revenue} />
        <SmallCard
          label="Cash:Revenue Ratio"
          value={kpi && kpi.revenue > 0 ? ratio(kpi.cash / kpi.revenue) : "—"}
          color="#d946ef"
          curVal={kpi && kpi.revenue > 0 ? kpi.cash / kpi.revenue : undefined}
          prev={prevYTD && prevYTD.revenue > 0 ? prevYTD.cash / prevYTD.revenue : null}
        />
      </div>

    </div>
  );
}

function SalesRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{value}</span>
    </div>
  );
}
