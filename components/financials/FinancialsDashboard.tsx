"use client";

import { useState } from "react";
import { DollarSign, AlertCircle, Calendar, CreditCard, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
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

function getMonthTabs() {
  const now = new Date();
  return [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      fullLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  });
}

function inMonth(unix: number, year: number, month: number) {
  const d = new Date(unix * 1000);
  return d.getFullYear() === year && d.getMonth() === month;
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string;
}) {
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
    </div>
  );
}

function PaymentRow({ payment, index }: { payment: FinancialsData["upcomingPayments"][number]; index: number }) {
  const days = daysUntil(payment.nextPaymentDate);
  const badgeColor = days <= 7 ? "#ef4444" : days <= 14 ? "#f59e0b" : "#22c55e";
  const badgeBg   = days <= 7 ? "#ef444415" : days <= 14 ? "#f59e0b15" : "#22c55e15";

  return (
    <div className="flex items-center gap-4 py-3.5" style={{ borderTop: index === 0 ? "none" : "1px solid var(--border)" }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
        style={{ background: "#3b82f615", color: "#3b82f6" }}>
        {payment.customerName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{payment.customerName}</p>
        <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{payment.planLabel}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{fmtDate(payment.nextPaymentDate)}</p>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: badgeBg, color: badgeColor }}>
          {days === 0 ? "Today" : `${days}d`}
        </span>
      </div>
      <div className="text-right flex-shrink-0 w-20">
        <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{fmt(payment.amount)}</p>
      </div>
    </div>
  );
}

export function FinancialsDashboard({ data }: { data: FinancialsData }) {
  const tabs = getMonthTabs();
  const [selectedIdx, setSelectedIdx] = useState(0);
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

  const filtered = data.upcomingPayments.filter((p) => inMonth(p.nextPaymentDate, selected.year, selected.month));
  const dueSelected = filtered.reduce((sum, p) => sum + p.amount, 0);
  const collectedSelected = data.collectedByMonth[selectedIdx] ?? 0;

  // 2026 average — only months that have data (non-zero) up to and including selected
  const currentMonthIdx = new Date().getMonth();
  const upToSelected = data.monthly2026.slice(0, currentMonthIdx + selectedIdx + 1);
  const activeMonths = upToSelected.filter((v) => v > 0);
  const avg2026 = activeMonths.length > 0
    ? activeMonths.reduce((a, b) => a + b, 0) / activeMonths.length
    : 0;

  // MoM % change — selected vs previous month
  const prevIdx = currentMonthIdx + selectedIdx - 1;
  const prevAmount = prevIdx >= 0 ? (data.monthly2026[prevIdx] ?? 0) : 0;
  const momPct = prevAmount > 0 ? ((collectedSelected - prevAmount) / prevAmount) * 100 : null;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Financials</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Live from Stripe · installment revenue &amp; upcoming charges
        </p>
      </div>

      {/* Stat cards — 2x2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={`Cash Collected — ${selected.fullLabel}`}
          value={fmt(collectedSelected)}
          sub="successful transactions"
          icon={DollarSign}
          accent="#22c55e"
        />
        <StatCard
          label={`Expected — ${selected.fullLabel}`}
          value={fmt(dueSelected)}
          sub={`${filtered.length} installment${filtered.length !== 1 ? "s" : ""} scheduled`}
          icon={CreditCard}
          accent="#3b82f6"
        />
        <StatCard
          label="2026 Monthly Avg"
          value={fmt(avg2026)}
          sub={`across ${activeMonths.length} month${activeMonths.length !== 1 ? "s" : ""} with data`}
          icon={TrendingUp}
          accent="#d946ef"
        />
        <StatCard
          label="MoM Change"
          value={momPct !== null ? `${momPct >= 0 ? "+" : ""}${momPct.toFixed(1)}%` : "—"}
          sub={prevAmount > 0 ? `vs ${fmt(prevAmount)} prior month` : "no prior month data"}
          icon={momPct !== null && momPct >= 0 ? ArrowUp : ArrowDown}
          accent={momPct === null ? "#94a3b8" : momPct >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      {/* Upcoming installments with toggle inside */}
      <div className="rounded-2xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {/* Card header with toggle */}
        <div className="flex items-center gap-3 mb-5">
          <Calendar size={18} style={{ color: "#3b82f6" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Upcoming Installments
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#3b82f615", color: "#3b82f6" }}>
            {fmt(dueSelected)} expected
          </span>

          {/* Month toggle — top right of card */}
          <div className="flex items-center gap-1 p-1 rounded-xl ml-auto" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setSelectedIdx(i)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: selectedIdx === i ? "#3b82f6" : "transparent",
                  color: selectedIdx === i ? "#fff" : "var(--muted-foreground)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid text-xs font-medium uppercase tracking-wider pb-2 mb-1"
          style={{ color: "var(--muted-foreground)", gridTemplateColumns: "36px 1fr 110px 80px", gap: "1rem", borderBottom: "1px solid var(--border)" }}>
          <span />
          <span>Customer</span>
          <span className="text-right">Charge Date</span>
          <span className="text-right">Amount</span>
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
