"use client";

import { type YTDRow } from "@/lib/funnel";

const $$ = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const ratio = (n: number) => (n === 0 ? "—" : n.toFixed(2) + "x");

interface Props {
  ytd: YTDRow[];
}

export function YTDView({ ytd }: Props) {
  const months    = ytd.filter((r) => !r.isSummary);
  const summaries = ytd.filter((r) => r.isSummary);

  // YTD totals from the data rows (sum up non-summary rows)
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

  const allRows = [...months, ...summaries];

  return (
    <div>
      {/* YTD summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Ad Spend"  value={$$(totals.amountSpent)} color="#ef4444" />
        <SummaryCard label="Total Cash"      value={$$(totals.cash)}        color="#22c55e" />
        <SummaryCard label="Total Revenue"   value={$$(totals.revenue)}     color="#3b82f6" />
        <SummaryCard label="Deals Closed"    value={String(totals.dealsClosed)} color="#f59e0b" />
      </div>

      {/* Monthly table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div
          className="px-5 py-3"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            2026 Year-to-Date
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
              {allRows.map((row, i) => (
                <tr
                  key={row.month + i}
                  style={{
                    background: row.isSummary
                      ? "rgba(59,130,246,0.08)"
                      : i % 2 === 0
                      ? "var(--card)"
                      : "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid var(--border)",
                    fontWeight: row.isSummary ? 600 : 400,
                  }}
                >
                  <td
                    className="px-3 py-2 whitespace-nowrap"
                    style={{ color: row.isSummary ? "#3b82f6" : "var(--foreground)" }}
                  >
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
              ))}
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

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--card)", border: `1px solid var(--border)` }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
