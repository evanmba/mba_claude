"use client";

import { type MonthlyRow, type SalesDashboard } from "@/lib/funnel";

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

// ─── Big KPI card ──────────────────────────────────────────────────────────
function BigCard({
  label,
  value,
  sub,
  bg,
}: {
  label: string;
  value: string;
  sub?: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col justify-between"
      style={{ background: bg, minHeight: 140 }}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
          {label}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Month to date
        </p>
      </div>
      <div>
        <p className="text-4xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Small stat card ───────────────────────────────────────────────────────
function SmallCard({
  label,
  value,
  color = "#3b82f6",
  values,
}: {
  label: string;
  value: string;
  color?: string;
  values?: number[];
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-xl font-bold mb-2" style={{ color }}>
        {value}
      </p>
      {values && values.length > 1 && <Sparkline values={values} color={color} />}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
interface Props {
  monthly: MonthlyRow[];
  salesDashboard: SalesDashboard | null;
  monthLabel: string;
}

export function MonthlyView({ monthly, salesDashboard, monthLabel }: Props) {
  const rollup30 = monthly.find((r) => r.period === "30 Days");
  const kpi = rollup30 ?? monthly.find((r) => r.isRollup) ?? null;

  const dailyRows = monthly.filter((r) => !r.isRollup);
  const rollupRows = monthly.filter((r) => r.isRollup);

  const revenuePerCall = kpi && kpi.takenCalls > 0 ? kpi.revenue / kpi.takenCalls : 0;

  // Sparkline data from daily rows
  const dailySpend  = dailyRows.map((r) => r.amountSpent);
  const dailyLeads  = dailyRows.map((r) => r.leads);
  const dailyBooked = dailyRows.map((r) => r.bookedCalls);
  const dailyTaken  = dailyRows.map((r) => r.takenCalls);
  const dailyClosed = dailyRows.map((r) => r.dealsClosed);
  const dailyCash   = dailyRows.map((r) => r.cash);
  const dailyRev    = dailyRows.map((r) => r.revenue);

  const tableRows = [...rollupRows, ...dailyRows];

  return (
    <div>
      {/* Big KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <BigCard
          label="Taken Calls"
          value={kpi ? num(kpi.takenCalls) : "—"}
          sub={kpi ? `Show-up: ${pct(kpi.showUpRate)}` : undefined}
          bg="#1e3a5f"
        />
        <BigCard
          label="$ Per Call"
          value={kpi ? $$(revenuePerCall) : "—"}
          sub={kpi ? `Revenue: ${$$(kpi.revenue)}` : undefined}
          bg="#78350f"
        />
        <BigCard
          label="Show Up Rate"
          value={kpi ? pct(kpi.showUpRate) : "—"}
          sub={kpi ? `${num(kpi.takenCalls)} of ${num(kpi.bookedCalls)} booked` : undefined}
          bg={kpi && kpi.showUpRate >= 50 ? "#14532d" : "#7f1d1d"}
        />
        <BigCard
          label="Cash Collected"
          value={kpi ? $$(kpi.cash) : "—"}
          sub={kpi ? `Revenue: ${$$(kpi.revenue)}` : undefined}
          bg="#14532d"
        />
      </div>

      {/* Small stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <SmallCard label="Amount Spent" value={kpi ? $$(kpi.amountSpent) : "—"} color="#ef4444" values={dailySpend} />
        <SmallCard label="AgeQ Leads"   value={kpi ? num(kpi.leads) : "—"}       color="#3b82f6" values={dailyLeads} />
        <SmallCard label="Apps"         value={kpi ? num(kpi.apps) : "—"}        color="#8b5cf6" values={dailyRows.map(r => r.apps)} />
        <SmallCard label="Booked Calls" value={kpi ? num(kpi.bookedCalls) : "—"} color="#06b6d4" values={dailyBooked} />
        <SmallCard label="Deals Closed" value={kpi ? num(kpi.dealsClosed) : "—"} color="#22c55e" values={dailyClosed} />
        <SmallCard label="Close Rate"   value={kpi ? pct(kpi.closeRate) : "—"}   color="#f59e0b" />
        <SmallCard label="Cash ROAS"    value={kpi ? ratio(kpi.cashROAS) : "—"}   color="#10b981" values={dailyCash} />
        <SmallCard label="Rev ROAS"     value={kpi ? ratio(kpi.revenueROAS) : "—"} color="#a78bfa" values={dailyRev} />
      </div>

      {/* Sales Dashboard callout (if available) */}
      {salesDashboard && (
        <div
          className="rounded-xl p-5 mb-6 grid grid-cols-4 gap-4"
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

      {/* Data table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {monthLabel} — Daily Breakdown
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {dailyRows.length} days tracked
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                {[
                  "Period","Spent","Freq","Reach","Clicks","CTR",
                  "Leads","Apps","Booked","Taken","Show%",
                  "Closed","Close%","Cash","Revenue","ROAS","CPA",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr
                  key={row.period + i}
                  style={{
                    background: row.isRollup
                      ? "rgba(59,130,246,0.08)"
                      : i % 2 === 0
                      ? "var(--card)"
                      : "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: row.isRollup ? 600 : 400,
                  }}
                >
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: row.isRollup ? "#3b82f6" : "var(--foreground)" }}>
                    {row.period}
                  </td>
                  <Td>{$$$(row.amountSpent)}</Td>
                  <Td>{row.frequency > 0 ? row.frequency.toFixed(2) : "—"}</Td>
                  <Td>{num(row.reach)}</Td>
                  <Td>{num(row.uniqueClicks)}</Td>
                  <Td>{pct(row.ctr)}</Td>
                  <Td>{num(row.leads)}</Td>
                  <Td>{num(row.apps)}</Td>
                  <Td>{num(row.bookedCalls)}</Td>
                  <Td>{num(row.takenCalls)}</Td>
                  <Td>{pct(row.showUpRate)}</Td>
                  <Td>{num(row.dealsClosed)}</Td>
                  <Td>{pct(row.closeRate)}</Td>
                  <Td>{$$(row.cash)}</Td>
                  <Td>{$$(row.revenue)}</Td>
                  <Td>{ratio(row.revenueROAS)}</Td>
                  <Td>{row.cpa > 0 ? $$$(row.cpa) : "—"}</Td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    No data — check that the sheet tab is named <strong>{monthLabel}</strong> and is accessible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
      {children}
    </td>
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
