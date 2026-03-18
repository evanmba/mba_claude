"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  SETTERS,
  SETTER_MONTHLY_DATA,
  AVAILABLE_MONTHS,
} from "@/lib/setter-data";
import { Phone, User, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

function pct(booked: number, goal: number) {
  return goal > 0 ? Math.round((booked / goal) * 100) : 0;
}

function progressColor(p: number) {
  if (p >= 85) return "#22c55e";
  if (p >= 50) return "#f59e0b";
  return "#ef4444";
}

function avgDialColor(timeMins: number) {
  if (timeMins <= 15) return "#22c55e";
  return "#ef4444";
}

function dialTimeBg(timeMins: number) {
  if (timeMins <= 15) return "rgba(34,197,94,0.15)";
  return "rgba(239,68,68,0.15)";
}

function getSetterMonthSummary(setterId: string, month: string) {
  const data = SETTER_MONTHLY_DATA[setterId]?.[month];
  if (!data) return null;
  const avgDialMins =
    data.dialingDays.length > 0
      ? data.dialingDays.reduce((s, d) => s + d.timeMins, 0) / data.dialingDays.length
      : 0;
  const avgPct =
    data.dialingDays.length > 0
      ? data.dialingDays.reduce((s, d) => s + d.pctUnder15m, 0) / data.dialingDays.length
      : 0;
  return { ...data, avgDialMins, avgPct };
}

export default function DialersPage() {
  // Build a summary table: setter x month
  const summaryRows = SETTERS.map((setter) => {
    const months = AVAILABLE_MONTHS.map((m) => {
      const summary = getSetterMonthSummary(setter.id, m);
      return { month: m, summary };
    });
    return { setter, months };
  });

  // Team totals per month
  const teamTotals = AVAILABLE_MONTHS.map((month) => {
    const rows = SETTERS.map((s) => getSetterMonthSummary(s.id, month)).filter(Boolean);
    const totalBooked = rows.reduce((acc, r) => acc + (r?.booked ?? 0), 0);
    const totalGoal = rows.reduce((acc, r) => acc + (r?.goal ?? 0), 0);
    const avgDialMins = rows.length > 0 ? rows.reduce((acc, r) => acc + (r?.avgDialMins ?? 0), 0) / rows.length : 0;
    const avgPct = rows.length > 0 ? rows.reduce((acc, r) => acc + (r?.avgPct ?? 0), 0) / rows.length : 0;
    return { month, totalBooked, totalGoal, pct: pct(totalBooked, totalGoal), avgDialMins, avgPct };
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          2026 Dialers
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Team dialing performance and booked calls by month
        </p>
      </div>

      {/* ── Team Monthly Totals ──────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {teamTotals.map((t) => (
          <div
            key={t.month}
            className="rounded-xl border p-5"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#3b82f6" }}>
              {t.month}
            </p>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                  {t.totalBooked}
                  <span className="text-sm font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
                    / {t.totalGoal}
                  </span>
                </p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Booked Calls</p>
              </div>
              <span
                className="text-lg font-bold"
                style={{ color: progressColor(t.pct) }}
              >
                {t.pct}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(t.pct, 100)}%`, background: progressColor(t.pct) }}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                <Phone size={12} style={{ color: avgDialColor(t.avgDialMins) }} />
                <span className="text-xs" style={{ color: avgDialColor(t.avgDialMins) }}>
                  Avg dial: {Math.floor(t.avgDialMins / 60)}h:{String(Math.round(t.avgDialMins % 60)).padStart(2, "0")}m
                </span>
              </div>
              <span className="text-xs" style={{ color: t.avgPct >= 85 ? "#22c55e" : "#ef4444" }}>
                {t.avgPct.toFixed(1)}% &lt;15m
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Setter × Month Matrix ────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Setter Performance by Month
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--border)` }}>
                <th
                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)", width: "200px" }}
                >
                  Setter
                </th>
                {AVAILABLE_MONTHS.map((m) => (
                  <th
                    key={m}
                    colSpan={3}
                    className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider border-l"
                    style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
                  >
                    {m}
                  </th>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid var(--border)`, background: "rgba(30,41,59,0.5)" }}>
                <th className="px-5 py-2" />
                {AVAILABLE_MONTHS.map((m) => (
                  [
                    <th key={`${m}-booked`} className="px-3 py-2 text-right text-xs border-l" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>Booked</th>,
                    <th key={`${m}-pct`} className="px-3 py-2 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>%</th>,
                    <th key={`${m}-dial`} className="px-3 py-2 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>Avg Dial</th>,
                  ]
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(({ setter, months }, i) => (
                <tr
                  key={setter.id}
                  style={{ borderBottom: i < summaryRows.length - 1 ? `1px solid var(--border)` : "none" }}
                >
                  <td className="px-5 py-3">
                    <Link href={`/setters/${setter.id}`} className="flex items-center gap-2 group">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: setter.color + "22" }}
                      >
                        <User size={13} style={{ color: setter.color }} />
                      </div>
                      <span
                        className="font-medium group-hover:underline"
                        style={{ color: "var(--foreground)" }}
                      >
                        {setter.name}
                      </span>
                    </Link>
                  </td>
                  {months.map(({ month, summary }) => {
                    if (!summary) {
                      return [
                        <td key={`${month}-b`} className="px-3 py-3 text-right border-l text-xs" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>—</td>,
                        <td key={`${month}-p`} className="px-3 py-3 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>—</td>,
                        <td key={`${month}-d`} className="px-3 py-3 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>—</td>,
                      ];
                    }
                    const p = pct(summary.booked, summary.goal);
                    return [
                      <td key={`${month}-b`} className="px-3 py-3 text-right border-l font-semibold" style={{ color: "var(--foreground)", borderColor: "var(--border)" }}>
                        {summary.booked}/{summary.goal}
                      </td>,
                      <td key={`${month}-p`} className="px-3 py-3 text-right font-semibold" style={{ color: progressColor(p) }}>
                        {p}%
                      </td>,
                      <td key={`${month}-d`} className="px-3 py-3 text-right">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            background: dialTimeBg(summary.avgDialMins),
                            color: avgDialColor(summary.avgDialMins),
                          }}
                        >
                          {Math.floor(summary.avgDialMins / 60)}h:{String(Math.round(summary.avgDialMins % 60)).padStart(2, "0")}m
                        </span>
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Individual Setter Quick Links ────────────────────── */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          Jump to Individual Tracker
        </h2>
        <div className="flex flex-wrap gap-3">
          {SETTERS.map((setter) => (
            <Link key={setter.id} href={`/setters/${setter.id}`}>
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = setter.color;
                  (e.currentTarget as HTMLElement).style.background = setter.color + "11";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.background = "var(--card)";
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: setter.color + "22" }}
                >
                  <User size={12} style={{ color: setter.color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {setter.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
