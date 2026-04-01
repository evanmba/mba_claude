"use client";

import { useState } from "react";
import { DollarSign, AlertCircle, Calendar, CreditCard, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import type { FinancialsData } from "@/lib/stripe-financials";

function fmt(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(unix: number) {
  return Math.max(0, Math.ceil((unix * 1000 - Date.now()) / 86400000));
}

/** All months from Jan 2026 through current month, oldest first. */
function getMonthTabs() {
  const now = new Date();
  const tabs = [];
  for (let m = 0; m <= now.getMonth(); m++) {
    const d = new Date(2026, m, 1);
    tabs.push({
      label:     d.toLocaleDateString("en-US", { month: "short" }),
      fullLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      year:      2026,
      month:     m, // 0-based, matches monthly2026 index directly
    });
  }
  return tabs;
}

function inMonth(unix: number, year: number, month: number) {
  const d = new Date(unix * 1000);
  return d.getFullYear() === year && d.getMonth() === month;
}

function StatCard({ label, value, sub, icon: Icon, accent, momPct, avg }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string;
  momPct?: number | null; avg?: string;
}) {
  const momColor = momPct == null ? "#94a3b8" : momPct >= 0 ? "#86efac" : "#fca5a5";
  const momBg    = momPct == null ? "#94a3b815" : momPct >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + "1a" }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{sub}</p>}
      </div>
      {(momPct !== undefined || avg) && (
        <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          {momPct !== undefined && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: momBg, color: momColor }}>
              {momPct == null ? <Minus size={10} /> : momPct > 0.5 ? <TrendingUp size={10} /> : momPct < -0.5 ? <TrendingDown size={10} /> : <Minus size={10} />}
              {momPct == null ? "No prior data" : `${momPct >= 0 ? "+" : ""}${momPct.toFixed(1)}% MoM`}
            </span>
          )}
          {avg && (
            <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
              2026 avg <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{avg}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentRow({ payment, index }: { payment: FinancialsData["upcomingPayments"][number]; index: number }) {
  const days = daysUntil(payment.nextPaymentDate);
  const badgeColor = days <= 7 ? "#ef4444" : days <= 14 ? "#f59e0b" : "#22c55e";
  const badgeBg   = days <= 7 ? "#ef444415" : days <= 14 ? "#f59e0b15" : "#22c55e15";

  return (
    <div className="flex items-center gap-3 py-3" style={{ borderTop: index === 0 ? "none" : "1px solid var(--border)" }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
        style={{ background: "#3b82f615", color: "#3b82f6" }}>
        {payment.customerName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{payment.customerName}</p>
        <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
          {payment.planLabel}
          <span className="sm:hidden"> · {fmtDate(payment.nextPaymentDate)}</span>
        </p>
      </div>
      <div className="hidden sm:block text-right flex-shrink-0">
        <p className="text-sm" style={{ color: "var(--foreground)" }}>{fmtDate(payment.nextPaymentDate)}</p>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: badgeBg, color: badgeColor }}>
          {days === 0 ? "Today" : `${days}d`}
        </span>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{fmt(payment.amount)}</p>
        <span className="sm:hidden text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: badgeBg, color: badgeColor }}>
          {days === 0 ? "Today" : `${days}d`}
        </span>
      </div>
    </div>
  );
}

export function FinancialsDashboard({ data }: { data: FinancialsData }) {
  const tabs = getMonthTabs();
  // Default to current month (last tab)
  const [selectedIdx, setSelectedIdx] = useState(tabs.length - 1);
  const selected = tabs[selectedIdx];

  if (data.stripeError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <AlertCircle size={32} style={{ color: "#ef4444" }} />
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Stripe error</p>
        <p className="text-xs max-w-sm text-center font-mono" style={{ color: "var(--muted-foreground)" }}>
          {data.stripeError}
        </p>
      </div>
    );
  }

  // Cash collected for selected month — comes directly from monthly2026 index
  const collectedSelected = data.monthly2026[selected.month] ?? 0;

  // MoM % — selected vs previous month
  const prevCollected = selected.month > 0 ? (data.monthly2026[selected.month - 1] ?? 0) : 0;
  const momPct = prevCollected > 0 ? ((collectedSelected - prevCollected) / prevCollected) * 100 : null;

  // 2026 running average — only months up to and including selected that have data
  const activeMonths = data.monthly2026.slice(0, selected.month + 1).filter((v) => v > 0);
  const avg2026 = activeMonths.length > 0
    ? activeMonths.reduce((a, b) => a + b, 0) / activeMonths.length
    : 0;

  // Upcoming installments for selected month
  const filtered = data.upcomingPayments.filter((p) => inMonth(p.nextPaymentDate, selected.year, selected.month));
  const dueSelected = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>Financials</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Live from Stripe · installment revenue &amp; upcoming charges
          </p>
        </div>

        {/* Month navigator — prev/next arrows + label */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
            disabled={selectedIdx === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              color: selectedIdx === 0 ? "#334155" : "var(--foreground)",
              cursor: selectedIdx === 0 ? "not-allowed" : "pointer",
            }}>
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-1 px-1 py-1 rounded-xl overflow-x-auto"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", maxWidth: 260 }}>
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setSelectedIdx(i)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: selectedIdx === i ? "#3b82f6" : "transparent",
                  color: selectedIdx === i ? "#fff" : "var(--muted-foreground)",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedIdx((i) => Math.min(tabs.length - 1, i + 1))}
            disabled={selectedIdx === tabs.length - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              color: selectedIdx === tabs.length - 1 ? "#334155" : "var(--foreground)",
              cursor: selectedIdx === tabs.length - 1 ? "not-allowed" : "pointer",
            }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Monthly cash breakdown bar */}
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
          2026 Cash Collected — Month by Month
        </p>
        <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: 80 }}>
          {tabs.map((tab, i) => {
            const val = data.monthly2026[tab.month] ?? 0;
            const maxVal = Math.max(...tabs.map((t) => data.monthly2026[t.month] ?? 0), 1);
            const heightPct = val > 0 ? Math.max(8, (val / maxVal) * 100) : 4;
            const isSelected = i === selectedIdx;
            return (
              <button
                key={tab.month}
                onClick={() => setSelectedIdx(i)}
                className="flex flex-col items-center gap-1 flex-1"
                style={{ cursor: "pointer" }}>
                <span style={{ fontSize: 9, color: isSelected ? "#3b82f6" : "#475569", fontWeight: isSelected ? 700 : 400 }}>
                  {val > 0 ? fmt(val).replace("$", "$") : "—"}
                </span>
                <div style={{
                  width: "100%", height: `${heightPct}%`,
                  background: isSelected ? "#3b82f6" : val > 0 ? "#1e3a5f" : "#1e293b",
                  borderRadius: 4,
                  border: isSelected ? "1px solid #60a5fa" : "1px solid transparent",
                  transition: "background 0.15s",
                }} />
                <span style={{ fontSize: 9, color: isSelected ? "#e2e8f0" : "#475569", fontWeight: isSelected ? 600 : 400 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label={`Cash Collected — ${selected.fullLabel}`}
          value={fmt(collectedSelected)}
          sub="successful Stripe transactions"
          icon={DollarSign}
          accent="#22c55e"
          momPct={momPct}
          avg={avg2026 > 0 ? fmt(avg2026) : undefined}
        />
        <StatCard
          label={`Expected — ${selected.fullLabel}`}
          value={fmt(dueSelected)}
          sub={`${filtered.length} installment${filtered.length !== 1 ? "s" : ""} scheduled`}
          icon={CreditCard}
          accent="#3b82f6"
        />
      </div>

      {/* Upcoming installments */}
      <div className="rounded-2xl p-4 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <Calendar size={16} style={{ color: "#3b82f6" }} />
          <h2 className="text-sm sm:text-base font-semibold" style={{ color: "var(--foreground)" }}>
            {selected.fullLabel} — Installments
          </h2>
          {dueSelected > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#3b82f615", color: "#3b82f6" }}>
              {fmt(dueSelected)} scheduled
            </span>
          )}
        </div>

        <div className="hidden sm:grid text-xs font-medium uppercase tracking-wider pb-2 mb-1"
          style={{ color: "var(--muted-foreground)", gridTemplateColumns: "32px 1fr 110px 80px", gap: "1rem", borderBottom: "1px solid var(--border)" }}>
          <span /><span>Customer</span><span className="text-right">Charge Date</span><span className="text-right">Amount</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
            No installments scheduled for {selected.fullLabel}.
          </p>
        ) : (
          filtered.map((p, i) => <PaymentRow key={p.id} payment={p} index={i} />)
        )}
      </div>
    </div>
  );
}
