"use client";

import { type YTDRow } from "@/lib/funnel";

const $$ = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const ratio = (n: number) => (n === 0 ? "—" : n.toFixed(2) + "x");

interface Props {
  ytd: YTDRow[];
  ytd2025?: YTDRow[];
}

export function YTDView({ ytd, ytd2025 }: Props) {
  const months    = ytd.filter((r) => !r.isSummary);
  const summaries = ytd.filter((r) => r.isSummary);
  const n         = months.length;

  // YTD totals
  const totals = months.reduce(
    (acc, r) => {
      acc.amountSpent    += r.amountSpent;
      acc.leads          += r.leads;
      acc.bookedCalls    += r.bookedCalls;
      acc.takenCalls     += r.takenCalls;
      acc.dealsClosed    += r.dealsClosed;
      acc.cash           += r.cash;
      acc.revenue        += r.revenue;
      return acc;
    },
    { amountSpent: 0, leads: 0, bookedCalls: 0, takenCalls: 0, dealsClosed: 0, cash: 0, revenue: 0 }
  );

  // Monthly averages (divide totals by number of data months)
  const avg = n > 0 ? {
    amountSpent: totals.amountSpent / n,
    leads:       totals.leads       / n,
    bookedCalls: totals.bookedCalls / n,
    takenCalls:  totals.takenCalls  / n,
    dealsClosed: totals.dealsClosed / n,
    cash:        totals.cash        / n,
    revenue:     totals.revenue     / n,
  } : null;

  const allRows = [...months, ...summaries];

  return (
    <div>
      {/* ── Hero cards: Totals + Averages ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Total Ad Spend"  value={$$(totals.amountSpent)} sub={avg ? `avg ${$$(avg.amountSpent)}/mo` : undefined} color="#ef4444" />
        <SummaryCard label="Total Cash"      value={$$(totals.cash)}        sub={avg ? `avg ${$$(avg.cash)}/mo`        : undefined} color="#22c55e" />
        <SummaryCard label="Total Revenue"   value={$$(totals.revenue)}     sub={avg ? `avg ${$$(avg.revenue)}/mo`     : undefined} color="#3b82f6" />
        <SummaryCard label="Deals Closed"    value={String(totals.dealsClosed)} sub={avg ? `avg ${avg.dealsClosed.toFixed(1)}/mo` : undefined} color="#f59e0b" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Total Leads"      value={num(totals.leads)}       sub={avg ? `avg ${avg.leads.toFixed(1)}/mo`       : undefined} color="#8b5cf6" />
        <SummaryCard label="Booked Calls"     value={num(totals.bookedCalls)} sub={avg ? `avg ${avg.bookedCalls.toFixed(1)}/mo` : undefined} color="#22c55e" />
        <SummaryCard label="Taken Calls"      value={num(totals.takenCalls)}  sub={avg ? `avg ${avg.takenCalls.toFixed(1)}/mo`  : undefined} color="#f59e0b" />
        <SummaryCard label="Cash ROAS"
          value={totals.amountSpent > 0 ? `${(totals.cash / totals.amountSpent).toFixed(2)}x` : "—"}
          sub="YTD blended" color="#06b6d4" />
      </div>

      {/* ── Monthly table ── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            2026 Year-to-Date — Monthly Breakdown
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                {[
                  "Month","Ad Spend","CPM","Clicks","CTR","Leads","Opt-In%","Cost/Lead",
                  "Booked","Lead→Book%","Cost/Booked","Taken","Show%","Closed",
                  "Close%","Cash","Revenue","C:R%","CashROAS","RevROAS","CPA",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                    style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRows.map((row, i) => (
                <DataRow key={row.month + i} row={row} i={i} />
              ))}

              {/* Monthly Average row */}
              {avg && n > 1 && (
                <tr style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#f59e0b" }}>
                    Monthly Avg
                  </td>
                  <Td>{$$(avg.amountSpent)}</Td>
                  <Td>—</Td><Td>—</Td><Td>—</Td>
                  <Td>{avg.leads.toFixed(1)}</Td>
                  <Td>—</Td><Td>—</Td>
                  <Td>{avg.bookedCalls.toFixed(1)}</Td>
                  <Td>—</Td><Td>—</Td>
                  <Td>{avg.takenCalls.toFixed(1)}</Td>
                  <Td>—</Td>
                  <Td>{avg.dealsClosed.toFixed(1)}</Td>
                  <Td>—</Td>
                  <Td>{$$(avg.cash)}</Td>
                  <Td>{$$(avg.revenue)}</Td>
                  <Td>—</Td>
                  <Td>{avg.amountSpent > 0 ? `${(avg.cash / avg.amountSpent).toFixed(2)}x` : "—"}</Td>
                  <Td>{avg.amountSpent > 0 ? `${(avg.revenue / avg.amountSpent).toFixed(2)}x` : "—"}</Td>
                  <Td>{avg.dealsClosed > 0 ? $$(avg.amountSpent / avg.dealsClosed) : "—"}</Td>
                </tr>
              )}

              {allRows.length === 0 && (
                <tr>
                  <td colSpan={21} className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    No YTD data — ensure the <strong>2026</strong> tab is accessible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2025 comparison table ── */}
      {ytd2025 && ytd2025.filter((r) => !r.isSummary).length > 0 && (
        <div className="rounded-xl overflow-hidden mt-4" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-3" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              2025 Year-to-Date — For Comparison
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                  {["Month","Ad Spend","Leads","Booked","Taken","Closed","Cash","Revenue","CashROAS"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                      style={{ color: "var(--muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ytd2025.filter((r) => !r.isSummary).map((row, i) => (
                  <tr key={row.month + i}
                    style={{ background: i % 2 === 0 ? "var(--card)" : "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>{row.month}</td>
                    <Td>{$$(row.amountSpent)}</Td>
                    <Td>{num(row.leads)}</Td>
                    <Td>{num(row.bookedCalls)}</Td>
                    <Td>{num(row.takenCalls)}</Td>
                    <Td>{num(row.dealsClosed)}</Td>
                    <Td>{$$(row.cash)}</Td>
                    <Td>{$$(row.revenue)}</Td>
                    <Td>{row.cashROAS > 0 ? ratio(row.cashROAS) : (row.amountSpent > 0 ? `${(row.cash / row.amountSpent).toFixed(2)}x` : "—")}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DataRow({ row, i }: { row: YTDRow; i: number }) {
  return (
    <tr
      style={{
        background: row.isSummary ? "rgba(59,130,246,0.08)" : i % 2 === 0 ? "var(--card)" : "rgba(255,255,255,0.02)",
        borderBottom: "1px solid var(--border)",
        fontWeight: row.isSummary ? 600 : 400,
      }}>
      <td className="px-3 py-2 whitespace-nowrap" style={{ color: row.isSummary ? "#3b82f6" : "var(--foreground)" }}>
        {row.month}
      </td>
      <Td>{$$(row.amountSpent)}</Td>
      <Td>{row.cpm > 0 ? `$${row.cpm.toFixed(2)}` : "—"}</Td>
      <Td>{num(row.uniqueClicks)}</Td>
      <Td>{pct(row.ctr)}</Td>
      <Td>{num(row.leads)}</Td>
      <Td>{pct(row.optInConv)}</Td>
      <Td>{row.costPerLead > 0 ? `$${row.costPerLead.toFixed(2)}` : "—"}</Td>
      <Td>{num(row.bookedCalls)}</Td>
      <Td>{pct(row.leadToBookedRate)}</Td>
      <Td>{row.costPerBooked > 0 ? $$(row.costPerBooked) : "—"}</Td>
      <Td>{num(row.takenCalls)}</Td>
      <Td>{pct(row.showUpRate)}</Td>
      <Td>{num(row.dealsClosed)}</Td>
      <Td>{pct(row.closeRate)}</Td>
      <Td>{$$(row.cash)}</Td>
      <Td>{$$(row.revenue)}</Td>
      <Td>{pct(row.cashRevRatio)}</Td>
      <Td>{ratio(row.cashROAS)}</Td>
      <Td>{ratio(row.revenueROAS)}</Td>
      <Td>{row.cpa > 0 ? $$(row.cpa) : "—"}</Td>
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
      {children}
    </td>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid var(--border)` }}>
      <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-xl font-bold" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: "#475569" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
