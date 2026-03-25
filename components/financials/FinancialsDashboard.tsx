"use client";

import { DollarSign, TrendingUp, Users, AlertCircle, Calendar } from "lucide-react";
import type { FinancialsData } from "@/lib/stripe-financials";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(unix: number) {
  const diff = unix * 1000 - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: accent + "1a" }}
        >
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

// ---------------------------------------------------------------------------
// Upcoming payments row
// ---------------------------------------------------------------------------
function PaymentRow({ payment, index }: { payment: FinancialsData["upcomingPayments"][number]; index: number }) {
  const days = daysUntil(payment.nextPaymentDate);
  const urgent = days <= 7;
  const soon = days <= 14;

  const badgeColor = urgent ? "#ef4444" : soon ? "#f59e0b" : "#22c55e";
  const badgeBg = urgent ? "#ef444415" : soon ? "#f59e0b15" : "#22c55e15";

  return (
    <div
      className="flex items-center gap-4 py-3.5"
      style={{
        borderTop: index === 0 ? "none" : "1px solid var(--border)",
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
        style={{ background: "#3b82f615", color: "#3b82f6" }}
      >
        {payment.customerName.charAt(0).toUpperCase()}
      </div>

      {/* Name + plan */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
          {payment.customerName}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
          {payment.planLabel}
        </p>
      </div>

      {/* Date */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {fmtDate(payment.nextPaymentDate)}
        </p>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: badgeBg, color: badgeColor }}
        >
          {days === 0 ? "Today" : `${days}d`}
        </span>
      </div>

      {/* Amount */}
      <div
        className="text-right flex-shrink-0 w-24"
        style={{ color: "var(--foreground)" }}
      >
        <p className="text-sm font-bold">{fmt(payment.amount)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export function FinancialsDashboard({ data }: { data: FinancialsData }) {
  if (data.stripeError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <AlertCircle size={32} style={{ color: "#ef4444" }} />
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Stripe connection error</p>
        <p className="text-xs max-w-sm text-center" style={{ color: "var(--muted-foreground)" }}>
          {data.stripeError}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Financials</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Live data from Stripe · installment &amp; subscription revenue
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={fmt(data.totalRevenue)}
          sub="all succeeded charges"
          icon={DollarSign}
          accent="#22c55e"
        />
        <StatCard
          label="Installments Collected"
          value={fmt(data.totalInstallmentCollected)}
          sub="via subscriptions & plans"
          icon={TrendingUp}
          accent="#3b82f6"
        />
        <StatCard
          label="Pay-in-Full"
          value={fmt(data.totalPayInFull)}
          sub="one-time payments"
          icon={DollarSign}
          accent="#d946ef"
        />
        <StatCard
          label="Active Subscriptions"
          value={String(data.activeSubscriptions)}
          sub="currently billing"
          icon={Users}
          accent="#f59e0b"
        />
      </div>

      {/* Upcoming payments */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} style={{ color: "#3b82f6" }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Upcoming Payments
          </h2>
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#3b82f615", color: "#3b82f6" }}
          >
            {data.upcomingPayments.length} scheduled
          </span>
        </div>

        {/* Column headers */}
        <div
          className="grid text-xs font-medium uppercase tracking-wider pb-2"
          style={{
            color: "var(--muted-foreground)",
            gridTemplateColumns: "36px 1fr 100px 96px",
            gap: "1rem",
          }}
        >
          <span />
          <span>Customer</span>
          <span className="text-right">Due Date</span>
          <span className="text-right">Amount</span>
        </div>

        {data.upcomingPayments.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: "var(--muted-foreground)" }}>
            No upcoming scheduled payments found.
          </p>
        ) : (
          <div>
            {data.upcomingPayments.map((p, i) => (
              <PaymentRow key={p.id} payment={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
