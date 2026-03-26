"use client";

import { useState } from "react";
import {
  Phone, Users, TrendingUp, TrendingDown, Minus,
  Target, ChevronRight, BarChart3, Zap,
} from "lucide-react";
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

function pctUnder15Bg(p: number): string {
  if (p >= 85) return "rgba(34,197,94,0.12)";
  if (p >= 60) return "rgba(245,158,11,0.12)";
  return p === 0 ? "rgba(148,163,184,0.08)" : "rgba(239,68,68,0.12)";
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
    { label: "Monthly", ...monthly, color: "#3b82f6" },
    { label: "Weekly",  ...weekly,  color: "#22c55e" },
    { label: "Daily",   ...daily,   color: "#d946ef" },
  ];

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
        <div className="flex items-center gap-2 mb-5">
          <Target size={16} style={{ color: "#3b82f6" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Booked Call Goals
          </h2>
        </div>
        <div className="space-y-4">
          {progBars.map((bar) => {
            const pct = bar.goal > 0 ? Math.round((bar.booked / bar.goal) * 100) : 0;
            return (
              <div key={bar.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {bar.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: bar.color }}>
                      {bar.booked}
                      <span className="font-normal text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {" "}/ {bar.goal}
                      </span>
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ background: bar.color + "22", color: bar.color, minWidth: 42, textAlign: "center" }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={bar.booked} max={bar.goal} color={bar.color} height={10} />
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
            // Progress bar shows each setter relative to projected total
            const barPct = projected > 0 ? (s.booked / projected) * 100 : 0;
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
                    <span className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: s.booked > 0 ? color : "var(--muted-foreground)" }}>
                      {s.booked} booked
                    </span>
                  </div>
                  <ProgressBar value={barPct} max={100} color={color} height={5} />
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
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(30,41,59,0.4)" }}>
                  {["Month", "Booked", "Taken", "Sit %", "Deals", "Close %"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted-foreground)" }}>
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
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
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
  // Show only the last 5 days
  const recentDays = data.days.slice(-5);

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
              Daily (last 5 days)
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
                    style={{
                      color: timeColor(d.timeMins),
                      background: d.timeMins > 60 ? "rgba(239,68,68,0.06)" : undefined,
                    }}
                  >
                    {d.timeToDial}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right text-xs font-semibold"
                    style={{ color: pctUnder15Color(d.pctUnder15m), background: pctUnder15Bg(d.pctUnder15m) }}
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
                  <tr key={r.label} style={{
                    borderBottom: "1px solid var(--border)",
                    background: isBold ? "rgba(59,130,246,0.06)" : undefined,
                  }}>
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
                      style={{ color: pctUnder15Color(r.pctUnder15m), background: pctUnder15Bg(r.pctUnder15m) }}
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

const MONTH_LABELS = ["JAN 2026", "FEB 2026", "MAR 2026"];

function IndividualTab({ dialer, metrics }: { dialer: DialerInfo; metrics: DialerMonthMetrics[] }) {
  const [selectedMonth, setSelectedMonth] = useState(
    metrics.length ? metrics[metrics.length - 1].month : MONTH_LABELS[0]
  );

  const current = metrics.find((m) => m.month === selectedMonth);
  const currentIdx = metrics.findIndex((m) => m.month === selectedMonth);
  const prev = currentIdx > 0 ? metrics[currentIdx - 1] : null;

  const hasDialData = current && current.totalDials > 0;

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
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(30,41,59,0.4)" }}>
                  {["Month", "Dials", "Links Sent", "Dial:Link %", "Booked", "Set %", "Taken", "Show-Up %", "Deals"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "var(--muted-foreground)" }}>
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
                        style={{ color: isSelected ? dialer.color : "var(--foreground)" }}>
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
            <code className="font-mono bg-black/20 px-1 py-0.5 rounded">SHEETS_API_KEY</code>
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
          return <IndividualTab dialer={dialer} metrics={data.dialerMetrics[dialer.id] ?? []} />;
        })()
      )}
    </div>
  );
}
