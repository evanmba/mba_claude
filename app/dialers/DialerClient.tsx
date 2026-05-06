"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, Users, TrendingUp, TrendingDown, Minus,
  Target, ChevronRight, BarChart3, Zap, RefreshCw,
} from "lucide-react";
import { refreshDialerData } from "./actions";
import type {
  GoalsData, SpeedToLeadData, TeamMonthRow, DialerMonthMetrics,
  DialerInfo,
} from "@/lib/dialer-data";
import { momPct, momDir } from "@/lib/dialer-data";

// ─── Colour helpers ────────────────────────────────────────────────────────────

function pctColor(p: number, good = 50): string {
  if (p >= good) return "#22c55e";
  if (p >= good * 0.5) return "#f59e0b";
  return "#ef4444";
}

function timeColor(mins: number): string {
  if (mins === 0) return "var(--muted-foreground)";
  if (mins <= 15) return "#22c55e";
  if (mins <= 60) return "#f59e0b";
  return "#ef4444";
}

function pctUnder15Color(p: number): string {
  if (p >= 85) return "#22c55e";
  if (p >= 60) return "#f59e0b";
  return p === 0 ? "var(--muted-foreground)" : "#ef4444";
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  value, max, color, height = 8,
}: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: "var(--secondary)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ─── MoM Badge ────────────────────────────────────────────────────────────────

function MomBadge({ curr, prev }: { curr: number; prev: number }) {
  const label = momPct(curr, prev);
  const dir = momDir(curr, prev);
  if (!label) return <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>—</span>;
  const color = dir === "up" ? "#22c55e" : dir === "down" ? "#ef4444" : "var(--muted-foreground)";
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium" style={{ color }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, prev, color,
}: {
  label: string; value: string | number; sub?: string; prev?: number; color?: string;
}) {
  const numVal = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs font-medium leading-snug" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
      <div className="flex items-center gap-2">
        {sub && <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{sub}</span>}
        {prev !== undefined && <MomBadge curr={numVal} prev={prev} />}
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({
  goals, speedToLead, teamMonthly, dialers,
}: {
  goals: GoalsData;
  speedToLead: SpeedToLeadData;
  teamMonthly: TeamMonthRow[];
  dialers: DialerInfo[];
}) {
  const { monthly, weekly, daily, currentWeek } = goals;

  const progBars = [
    { label: "Monthly", ...monthly, color: "#22c55e" },
    { label: "Weekly",  ...weekly,  color: "#22c55e" },
    { label: "Daily",   ...daily,   color: "#22c55e" },
  ];

  // Monthly pace projection — based on workdays elapsed vs total workdays this month
  const monthlyProjected = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let elapsed = 0, total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow !== 0 && dow !== 6) {
        total++;
        if (d <= today.getDate()) elapsed++;
      }
    }
    return elapsed > 0 ? Math.round((monthly.booked / elapsed) * total) : monthly.booked;
  })();

  // Projection for current week
  const totalBooked = currentWeek.setters.reduce((sum, s) => sum + s.booked, 0);
  const projected = currentWeek.daysElapsed > 0
    ? Math.round(totalBooked * currentWeek.totalWorkdays / currentWeek.daysElapsed)
    : totalBooked;

  const activeMonths = teamMonthly.filter((m) => m.booked > 0);

  return (
    <div className="space-y-6">

      {/* ── Goals Progress Bars ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} style={{ color: "#22c55e" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Booked Call Goals
          </h2>
          {/* Column headers */}
          <div className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            <span style={{ width: 44, textAlign: "right" }}>Goal</span>
            <span style={{ width: 36, textAlign: "right" }}>%</span>
          </div>
        </div>
        <div className="space-y-3">
          {progBars.map((bar) => {
            const pct = bar.goal > 0 ? Math.round((bar.booked / bar.goal) * 100) : 0;
            const isMonthly = bar.label === "Monthly";
            const projPct = isMonthly && bar.goal > 0
              ? Math.min((monthlyProjected / bar.goal) * 100, 100)
              : null;
            return (
              <div key={bar.label} className="flex items-center gap-3">
                {/* Label */}
                <span className="text-sm font-medium flex-shrink-0" style={{ width: 56, color: "var(--foreground)" }}>
                  {bar.label}
                </span>
                {/* Current value */}
                <span className="text-sm font-bold flex-shrink-0" style={{ width: 28, textAlign: "right", color: "var(--foreground)" }}>
                  {bar.booked}
                </span>
                {/* Bar track — overflow-visible so tooltip above isn't clipped */}
                <div className="flex-1 relative rounded-full" style={{ height: 20, background: "var(--secondary)", overflow: "visible" }}>
                  {/* Actual fill — clipped to rounded corners via its own border-radius */}
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, background: bar.color, opacity: 0.85, overflow: "hidden" }}
                  />
                  {/* Projected dashed line — monthly only */}
                  {projPct !== null && projPct > pct && (
                    <div
                      className="group"
                      style={{
                        position: "absolute",
                        top: -3,
                        bottom: -3,
                        left: `${projPct}%`,
                        width: 14,
                        transform: "translateX(-50%)",
                        cursor: "default",
                        zIndex: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {/* Dashed line */}
                      <div style={{
                        width: 2,
                        height: "100%",
                        background: "repeating-linear-gradient(to bottom, #94a3b8 0px, #94a3b8 4px, transparent 4px, transparent 8px)",
                        borderRadius: 1,
                      }} />
                      {/* Tooltip */}
                      <div
                        className="pointer-events-none absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{
                          bottom: "calc(100% + 6px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: 6,
                          padding: "4px 8px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Projected </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{monthlyProjected}</span>
                        {/* Arrow */}
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          borderLeft: "5px solid transparent",
                          borderRight: "5px solid transparent",
                          borderTop: "5px solid #334155",
                        }} />
                      </div>
                    </div>
                  )}
                </div>
                {/* Goal */}
                <span className="text-sm flex-shrink-0" style={{ width: 44, textAlign: "right", color: "var(--muted-foreground)" }}>
                  {bar.goal}
                </span>
                {/* % */}
                <span className="text-sm font-semibold flex-shrink-0" style={{ width: 36, textAlign: "right", color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "var(--muted-foreground)" }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Current Week — Projection ────────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2"
          style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={16} style={{ color: "#22c55e" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Week #{currentWeek.weekNum} · {currentWeek.start} – {currentWeek.end}
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}
            >
              {totalBooked} booked so far
            </span>
            <span
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
            >
              ~{projected} projected by EOW
            </span>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {currentWeek.setters.map((s) => {
            const dialer = dialers.find((d) => d.id === s.id);
            const color = dialer?.color ?? "#3b82f6";
            const fillPct = Math.min((s.booked / WEEKLY_BAR_MAX) * 100, 100);
            const hitGoal = s.booked >= WEEKLY_GOAL;
            return (
              <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                  style={{ background: color }}
                >
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {s.name}
                    </span>
                    <span className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: hitGoal ? "#22c55e" : s.booked > 0 ? color : "var(--muted-foreground)" }}>
                      {s.booked} booked{hitGoal ? " ✓" : ""}
                    </span>
                  </div>
                  {/* Bar with dotted goal line at 75% */}
                  <div className="relative rounded-full" style={{ height: 8, background: "var(--secondary)", overflow: "visible" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${fillPct}%`, background: color, opacity: 0.85 }} />
                    {/* Goal line */}
                    <div className="group" style={{
                      position: "absolute", top: -3, bottom: -3,
                      left: `${WEEKLY_GOAL_PCT}%`, width: 14,
                      transform: "translateX(-50%)", cursor: "default", zIndex: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{
                        width: 2, height: "100%",
                        background: `repeating-linear-gradient(to bottom, ${color} 0px, ${color} 3px, transparent 3px, transparent 6px)`,
                        borderRadius: 1, opacity: 0.7,
                      }} />
                      <div className="pointer-events-none absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{
                          bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                          background: "#1e293b", border: "1px solid #334155",
                          borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                        }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>Goal </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{WEEKLY_GOAL}</span>
                        <div style={{
                          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                          borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
                          borderTop: "4px solid #334155",
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t" style={{ borderColor: "var(--border)", background: "rgba(30,41,59,0.3)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Day {currentWeek.daysElapsed} of {currentWeek.totalWorkdays} work days · projection based on current pace
          </p>
        </div>
      </div>

      {/* ── Team Monthly Overview ────────────────────────────────────────── */}
      {activeMonths.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <TrendingUp size={16} style={{ color: "#3b82f6" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Team Monthly Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(30,41,59,0.4)" }}>
                  {["Month", "Booked", "Taken", "Sit %", "Deals", "Close %"].map((h, hi) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{
                        color: "var(--muted-foreground)",
                        ...(hi === 0 ? { position: "sticky", left: 0, background: "rgba(30,41,59,0.95)", zIndex: 2, boxShadow: "2px 0 6px rgba(0,0,0,0.25)" } : {}),
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeMonths.map((row, i) => {
                  const prev = activeMonths[i - 1];
                  return (
                    <tr key={row.month} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)", position: "sticky", left: 0, background: "var(--card)", zIndex: 1, boxShadow: "2px 0 6px rgba(0,0,0,0.25)" }}>
                        {row.month}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: "#3b82f6" }}>{row.booked}</span>
                          {prev && <MomBadge curr={row.booked} prev={prev.booked} />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: "var(--foreground)" }}>{row.taken}</span>
                          {prev && <MomBadge curr={row.taken} prev={prev.taken} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: pctColor(row.sitPct) }}>
                        {row.sitPct}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: row.deals > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
                            {row.deals || "—"}
                          </span>
                          {prev && row.deals > 0 && <MomBadge curr={row.deals} prev={prev.deals} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold"
                        style={{ color: row.closePct > 0 ? pctColor(row.closePct) : "var(--muted-foreground)" }}>
                        {row.closePct > 0 ? `${row.closePct}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Speed to Lead ────────────────────────────────────────────────── */}
      <SpeedToLeadSection data={speedToLead} />
    </div>
  );
}

// ─── Speed to Lead Section ────────────────────────────────────────────────────

function SpeedToLeadSection({ data }: { data: SpeedToLeadData }) {
  // Show the last 7 days (rolling from today)
  const recentDays = data.days.slice(-7);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="px-5 py-4 border-b flex items-center gap-2 flex-wrap"
        style={{ borderColor: "var(--border)", background: "rgba(251,191,36,0.06)" }}>
        <Zap size={16} style={{ color: "#f59e0b" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Speed to Lead
          <span className="font-normal text-xs ml-1.5" style={{ color: "var(--muted-foreground)" }}>
            [11am–6pm EST]
          </span>
        </h2>
        <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>Target: <strong style={{ color: "#22c55e" }}>&lt;15 mins</strong></span>
          <span>/ <strong style={{ color: "#22c55e" }}>85%+</strong></span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x"
        style={{ borderColor: "var(--border)" }}>

        {/* Daily — last 5 days */}
        <div>
          <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Daily (last 7 days)
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(30,41,59,0.3)" }}>
                <th className="px-4 py-2 text-left text-xs" style={{ color: "var(--muted-foreground)" }}>Day</th>
                <th className="px-4 py-2 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>Time to Dial</th>
                <th className="px-4 py-2 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>% Under 15m</th>
              </tr>
            </thead>
            <tbody>
              {recentDays.map((d) => (
                <tr key={d.date} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{d.date}</td>
                  <td
                    className="px-4 py-2.5 text-right text-xs font-semibold"
                    style={{ color: timeColor(d.timeMins) }}
                  >
                    {d.timeToDial}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right text-xs font-semibold"
                    style={{ color: pctUnder15Color(d.pctUnder15m) }}
                  >
                    {d.pctUnder15m.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rolling averages */}
        <div>
          <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Rolling Average
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(30,41,59,0.3)" }}>
                <th className="px-4 py-2 text-left text-xs" style={{ color: "var(--muted-foreground)" }}>Period</th>
                <th className="px-4 py-2 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>Time to Dial</th>
                <th className="px-4 py-2 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>% Under 15m</th>
              </tr>
            </thead>
            <tbody>
              {data.rolling.map((r) => {
                const isBold = r.label === "7d-AVG";
                return (
                  <tr key={r.label} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td
                      className="px-4 py-2.5 text-xs"
                      style={{ color: isBold ? "#3b82f6" : "var(--muted-foreground)", fontWeight: isBold ? 700 : 400 }}
                    >
                      {r.label}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right text-xs font-semibold"
                      style={{ color: timeColor(r.timeMins) }}
                    >
                      {r.timeToDial}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right text-xs font-semibold"
                      style={{ color: pctUnder15Color(r.pctUnder15m) }}
                    >
                      {r.pctUnder15m.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Individual Dialer Tab ─────────────────────────────────────────────────────

const MONTH_LABELS = ["JAN 2026", "FEB 2026", "MAR 2026", "APR 2026", "MAY 2026"];
// Current month — always default to this if it exists in the data
const CURRENT_MONTH = "MAY 2026";

const WEEKLY_GOAL = 6;
// Goal sits at 75% of the bar; max scale = WEEKLY_GOAL / 0.75
const WEEKLY_BAR_MAX = WEEKLY_GOAL / 0.75;
const WEEKLY_GOAL_PCT = (WEEKLY_GOAL / WEEKLY_BAR_MAX) * 100; // 75

function IndividualTab({
  dialer, metrics, currentWeek,
}: {
  dialer: DialerInfo;
  metrics: DialerMonthMetrics[];
  currentWeek: GoalsData["currentWeek"];
}) {
  const defaultMonth = metrics.some(m => m.month === CURRENT_MONTH)
    ? CURRENT_MONTH
    : (metrics.length ? metrics[metrics.length - 1].month : MONTH_LABELS[0]);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const current = metrics.find((m) => m.month === selectedMonth);
  const currentIdx = metrics.findIndex((m) => m.month === selectedMonth);
  const prev = currentIdx > 0 ? metrics[currentIdx - 1] : null;

  // Show cards for the current month regardless of zeros (data is still coming in),
  // or for any past month that has at least one non-zero metric.
  const isCurrentMonth = selectedMonth === CURRENT_MONTH;
  const hasAnyData = current && (
    current.totalDials > 0 || current.bookedCalls > 0 ||
    current.takenCalls > 0 || current.linksSent > 0 || current.deals > 0
  );
  const hasDialData = !!current && (isCurrentMonth || !!hasAnyData);

  // Goals from current month's sheet row 5 (fallback to APR if current has none)
  const goals = current?.goals
    ?? metrics.find(m => m.goals)?.goals;

  // This setter's weekly booked from currentWeek
  const weeklyBooked = currentWeek.setters.find(s => s.id === dialer.id)?.booked ?? 0;
  const weeklyFillPct = Math.min((weeklyBooked / WEEKLY_BAR_MAX) * 100, 100);

  return (
    <div className="space-y-5">
      {/* Month selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider mr-1" style={{ color: "var(--muted-foreground)" }}>
          Month
        </span>
        {MONTH_LABELS.map((m) => {
          const hasData = (metrics.find((x) => x.month === m)?.totalDials ?? 0) > 0;
          const isActive = m === selectedMonth;
          return (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isActive ? dialer.color + "22" : "var(--secondary)",
                color: isActive ? dialer.color : "var(--muted-foreground)",
                border: `1px solid ${isActive ? dialer.color + "55" : "transparent"}`,
                opacity: !hasData && !isActive ? 0.5 : 1,
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* ── Weekly Tracker ─────────────────────────────────────────────── */}
      <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} style={{ color: dialer.color }} />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Week #{currentWeek.weekNum} · Booked Calls
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {currentWeek.start} – {currentWeek.end}
          </span>
        </div>
        {/* Bar with goal dotted line */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold flex-shrink-0" style={{ width: 28, color: weeklyBooked >= WEEKLY_GOAL ? "#22c55e" : dialer.color }}>
            {weeklyBooked}
          </span>
          <div className="flex-1 relative rounded-full" style={{ height: 22, background: "var(--secondary)", overflow: "visible" }}>
            {/* Actual fill */}
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${weeklyFillPct}%`, background: dialer.color, opacity: 0.85 }} />
            {/* Goal dotted line at 75% */}
            <div
              className="group"
              style={{
                position: "absolute", top: -4, bottom: -4,
                left: `${WEEKLY_GOAL_PCT}%`,
                width: 16, transform: "translateX(-50%)",
                cursor: "default", zIndex: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{
                width: 2, height: "100%",
                background: `repeating-linear-gradient(to bottom, ${dialer.color} 0px, ${dialer.color} 4px, transparent 4px, transparent 8px)`,
                borderRadius: 1, opacity: 0.8,
              }} />
              {/* Tooltip */}
              <div className="pointer-events-none absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{
                  bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                  background: "#1e293b", border: "1px solid #334155",
                  borderRadius: 6, padding: "4px 8px", whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Goal </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{WEEKLY_GOAL}</span>
                <div style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                  borderTop: "5px solid #334155",
                }} />
              </div>
            </div>
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--muted-foreground)", width: 52 }}>
            Goal: {WEEKLY_GOAL}
          </span>
        </div>
        {weeklyBooked >= WEEKLY_GOAL && (
          <p className="text-xs mt-2 font-semibold" style={{ color: "#22c55e" }}>
            Goal hit! {weeklyBooked > WEEKLY_GOAL ? `+${weeklyBooked - WEEKLY_GOAL} above goal` : ""}
          </p>
        )}
      </div>

      {/* ── Monthly Goals ──────────────────────────────────────────────── */}
      {goals && (
        <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} style={{ color: dialer.color }} />
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Monthly Goals — {selectedMonth}</span>
            <div className="ml-auto flex gap-1 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              <span style={{ width: 44, textAlign: "right" }}>Goal</span>
              <span style={{ width: 36, textAlign: "right" }}>%</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Dials",  actual: current?.totalDials ?? 0, goal: goals.dials },
              { label: "Links",  actual: current?.linksSent  ?? 0, goal: goals.links },
              { label: "Booked", actual: current?.bookedCalls ?? 0, goal: goals.booked },
              { label: "Taken",  actual: current?.takenCalls  ?? 0, goal: goals.taken },
            ].map(({ label, actual, goal }) => {
              const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-medium flex-shrink-0" style={{ width: 44, color: "var(--foreground)" }}>{label}</span>
                  <span className="text-xs font-bold flex-shrink-0" style={{ width: 32, textAlign: "right", color: "var(--foreground)" }}>{actual.toLocaleString()}</span>
                  <div className="flex-1 relative rounded-full" style={{ height: 16, background: "var(--secondary)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%`, background: dialer.color, opacity: 0.8 }} />
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ width: 44, textAlign: "right", color: "var(--muted-foreground)" }}>{goal.toLocaleString()}</span>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ width: 36, textAlign: "right", color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "var(--muted-foreground)" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      {hasDialData ? (
        <>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone size={15} style={{ color: dialer.color }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Dialing Performance — {selectedMonth}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Total Manual Outbound Dials"
                value={current.totalDials.toLocaleString()}
                prev={prev?.totalDials}
                color={dialer.color}
              />
              <MetricCard
                label="# of Links Sent"
                value={current.linksSent}
                prev={prev?.linksSent}
              />
              <MetricCard
                label="Dial : Link %"
                value={current.dialLinkPct > 0 ? `${current.dialLinkPct}%` : "—"}
                sub="links / dials"
              />
              <MetricCard
                label="# Qualified Set Booked Calls"
                value={current.bookedCalls}
                prev={prev?.bookedCalls}
                color={pctColor(current.setPct, 10)}
              />
              <MetricCard
                label="Set %"
                value={current.setPct > 0 ? `${current.setPct}%` : "—"}
                sub="booked / links sent"
                prev={prev?.setPct}
                color={pctColor(current.setPct, 10)}
              />
              <MetricCard
                label="Taken Set Calls"
                value={current.takenCalls}
                prev={prev?.takenCalls}
              />
              <MetricCard
                label="Show-Up Rate"
                value={current.showUpRate > 0 ? `${current.showUpRate}%` : "—"}
                sub="taken / booked"
                prev={prev?.showUpRate}
                color={pctColor(current.showUpRate, 40)}
              />
              <MetricCard
                label="Deals"
                value={current.deals > 0 ? current.deals : "—"}
                prev={prev?.deals}
                color={current.deals > 0 ? "#22c55e" : undefined}
              />
            </div>
          </div>

        </>
      ) : (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Phone size={28} className="mx-auto mb-3 opacity-30" style={{ color: dialer.color }} />
          <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            No dialing data for {selectedMonth}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Connect Google Sheets or update mock data in lib/dialer-data.ts
          </p>
        </div>
      )}

      {/* MoM Table */}
      {metrics.filter((m) => m.bookedCalls > 0 || m.totalDials > 0).length > 1 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
            <TrendingUp size={15} style={{ color: dialer.color }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Month-over-Month Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(30,41,59,0.4)" }}>
                  {["Month", "Dials", "Links Sent", "Dial:Link %", "Booked", "Set %", "Taken", "Show-Up %", "Deals"].map((h, hi) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{
                        color: "var(--muted-foreground)",
                        ...(hi === 0 ? { position: "sticky", left: 0, background: "rgba(30,41,59,0.95)", zIndex: 2, boxShadow: "2px 0 6px rgba(0,0,0,0.25)" } : {}),
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => {
                  const p = i > 0 ? metrics[i - 1] : null;
                  const isSelected = m.month === selectedMonth;
                  return (
                    <tr
                      key={m.month}
                      onClick={() => setSelectedMonth(m.month)}
                      className="cursor-pointer"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: isSelected ? dialer.color + "11" : undefined,
                      }}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap"
                        style={{ color: isSelected ? dialer.color : "var(--foreground)", position: "sticky", left: 0, background: isSelected ? `color-mix(in srgb, var(--card) 85%, ${dialer.color})` : "var(--card)", zIndex: 1, boxShadow: "2px 0 6px rgba(0,0,0,0.25)" }}>
                        {m.month}
                        {isSelected && <ChevronRight size={12} className="inline ml-1" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "var(--foreground)" }}>{m.totalDials ? m.totalDials.toLocaleString() : "—"}</span>
                          {p && m.totalDials > 0 && <MomBadge curr={m.totalDials} prev={p.totalDials} />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "var(--foreground)" }}>{m.linksSent || "—"}</span>
                          {p && m.linksSent > 0 && <MomBadge curr={m.linksSent} prev={p.linksSent} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                        {m.dialLinkPct > 0 ? `${m.dialLinkPct}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold" style={{ color: "#3b82f6" }}>{m.bookedCalls || "—"}</span>
                          {p && m.bookedCalls > 0 && <MomBadge curr={m.bookedCalls} prev={p.bookedCalls} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap"
                        style={{ color: m.setPct > 0 ? pctColor(m.setPct, 10) : "var(--muted-foreground)" }}>
                        {m.setPct > 0 ? `${m.setPct}%` : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                        {m.takenCalls || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap"
                        style={{ color: m.showUpRate > 0 ? pctColor(m.showUpRate, 40) : "var(--muted-foreground)" }}>
                        {m.showUpRate > 0 ? `${m.showUpRate}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: m.deals > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
                            {m.deals > 0 ? m.deals : "—"}
                          </span>
                          {p && m.deals > 0 && <MomBadge curr={m.deals} prev={p.deals} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

interface DialerDashboardData {
  source: string;
  goals: GoalsData;
  speedToLead: SpeedToLeadData;
  teamMonthly: TeamMonthRow[];
  dialerMetrics: Record<string, DialerMonthMetrics[]>;
  dialers: DialerInfo[];
}

export default function DialerClient({ data }: { data: DialerDashboardData }) {
  const [activeTab, setActiveTab] = useState<string>("team");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRefresh() {
    startTransition(async () => {
      await refreshDialerData();
      router.refresh();
    });
  }

  const tabs = [
    { id: "team", label: "Team", icon: Users, color: "#3b82f6" },
    ...data.dialers.map((d) => ({ id: d.id, label: d.name, icon: Phone, color: d.color })),
  ];

  return (
    <div>
      {/* Source banner */}
      {data.source === "mock" && (
        <div
          className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs flex-wrap"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
        >
          <Zap size={13} className="flex-shrink-0" />
          <span>
            Showing mock data. Set{" "}
            <code className="font-mono bg-black/20 px-1 py-0.5 rounded">SETTER_DASHBOARD_SHEET_ID</code>
            {" "}+{" "}
            <code className="font-mono bg-black/20 px-1 py-0.5 rounded">GOOGLE_SHEETS_API_KEY</code>
            {" "}in <code className="font-mono bg-black/20 px-1 py-0.5 rounded">.env.local</code> to connect live data.
          </span>
        </div>
      )}

      {/* Tab Bar */}
      <div
        className="flex items-center gap-1 mb-6 overflow-x-auto pb-1"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                color: isActive ? tab.color : "var(--muted-foreground)",
                background: isActive ? tab.color + "18" : "transparent",
                borderBottom: isActive ? `2px solid ${tab.color}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}

        {/* Refresh button — pushes to the right */}
        <div className="flex-1" />
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all"
          style={{
            color: isPending ? "#3b82f6" : "var(--muted-foreground)",
            background: isPending ? "rgba(59,130,246,0.1)" : "var(--secondary)",
            marginBottom: 4,
          }}
          title="Refresh live data"
        >
          <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "team" ? (
        <TeamTab
          goals={data.goals}
          speedToLead={data.speedToLead}
          teamMonthly={data.teamMonthly}
          dialers={data.dialers}
        />
      ) : (
        (() => {
          const dialer = data.dialers.find((d) => d.id === activeTab);
          if (!dialer) return null;
          return <IndividualTab dialer={dialer} metrics={data.dialerMetrics[dialer.id] ?? []} currentWeek={data.goals.currentWeek} />;
        })()
      )}
    </div>
  );
}
