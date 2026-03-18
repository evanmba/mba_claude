"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  GOALS,
  CURRENT_WEEK,
  WEEKLY_SETTER_DATA,
  TEAM_DIALING_MAR,
  TEAM_ROLLING_AVG_MAR,
  SETTERS,
} from "@/lib/setter-data";
import { Target, Phone, TrendingUp, Users, Calendar } from "lucide-react";
import Link from "next/link";

function pct(booked: number, goal: number) {
  return goal > 0 ? Math.round((booked / goal) * 100) : 0;
}

function progressColor(p: number) {
  if (p >= 85) return "#22c55e";
  if (p >= 60) return "#f59e0b";
  return "#ef4444";
}

function dialTimeBg(timeMins: number) {
  if (timeMins <= 15) return "rgba(34,197,94,0.15)";
  return "rgba(239,68,68,0.15)";
}

function dialTimeColor(timeMins: number) {
  if (timeMins <= 15) return "#22c55e";
  return "#ef4444";
}

function pctBg(p: number) {
  if (p >= 85) return "rgba(34,197,94,0.15)";
  if (p === 0) return "rgba(239,68,68,0.15)";
  return "rgba(239,68,68,0.15)";
}

function pctColor(p: number) {
  if (p >= 85) return "#22c55e";
  return "#ef4444";
}

export default function SetterGoalsPage() {
  const monthlyPct = pct(GOALS.monthly.booked, GOALS.monthly.goal);
  const weeklyPct = pct(GOALS.weekly.booked, GOALS.weekly.goal);
  const dailyPct = pct(GOALS.daily.booked, GOALS.daily.goal);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Goals Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Week #{CURRENT_WEEK.weekNum} &nbsp;·&nbsp; {CURRENT_WEEK.start} – {CURRENT_WEEK.end} &nbsp;·&nbsp; MAR 2026
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Left Column ─────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Goals Summary */}
          <div
            className="rounded-xl border p-5"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} style={{ color: "#22c55e" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Goals Overview
              </h2>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-4 gap-2 mb-2 px-1">
              <div />
              <p className="text-xs font-semibold text-right" style={{ color: "var(--muted-foreground)" }}>Booked</p>
              <p className="text-xs font-semibold text-right" style={{ color: "var(--muted-foreground)" }}>Goal</p>
              <p className="text-xs font-semibold text-right" style={{ color: "var(--muted-foreground)" }}>%</p>
            </div>

            {[
              { label: "Monthly", booked: GOALS.monthly.booked, goal: GOALS.monthly.goal, p: monthlyPct },
              { label: "Weekly", booked: GOALS.weekly.booked, goal: GOALS.weekly.goal, p: weeklyPct },
              { label: "Daily", booked: GOALS.daily.booked, goal: GOALS.daily.goal, p: dailyPct },
            ].map((row) => (
              <div key={row.label} className="mb-3">
                <div className="grid grid-cols-4 gap-2 items-center px-1 mb-1">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{row.label}</p>
                  <p className="text-sm font-bold text-right" style={{ color: "var(--foreground)" }}>{row.booked}</p>
                  <p className="text-sm text-right" style={{ color: "var(--muted-foreground)" }}>{row.goal}</p>
                  <p className="text-sm font-semibold text-right" style={{ color: progressColor(row.p) }}>{row.p}%</p>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(row.p, 100)}%`,
                      background: progressColor(row.p),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Weekly Setter Table */}
          <div
            className="rounded-xl border p-5"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} style={{ color: "#f59e0b" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Week #{CURRENT_WEEK.weekNum} — Setter Performance
                </h2>
              </div>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                {CURRENT_WEEK.start} – {CURRENT_WEEK.end}
              </span>
            </div>

            {/* Table header */}
            <div
              className="grid gap-2 px-3 py-2 rounded-lg mb-2 text-xs font-semibold"
              style={{ gridTemplateColumns: "1fr 80px 60px 1fr", background: "var(--secondary)", color: "var(--muted-foreground)" }}
            >
              <span>Setter</span>
              <span className="text-right">Booked</span>
              <span className="text-right">Goal</span>
              <span className="text-center">Progress</span>
            </div>

            <div className="space-y-1">
              {WEEKLY_SETTER_DATA.map((row) => {
                const p = pct(row.booked, row.goal);
                const setter = SETTERS.find((s) => s.id === row.setterId);
                const color = setter?.color ?? "var(--primary)";
                return (
                  <Link key={row.setterId} href={`/setters/${row.setterId}`}>
                    <div
                      className="grid gap-2 px-3 py-2.5 rounded-lg items-center cursor-pointer transition-all"
                      style={{ gridTemplateColumns: "1fr 80px 60px 1fr" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {row.setter}
                      </span>
                      <span className="text-sm font-bold text-right" style={{ color: "var(--foreground)" }}>
                        {row.booked}
                      </span>
                      <span className="text-sm text-right" style={{ color: "var(--muted-foreground)" }}>
                        {row.goal}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(p, 100)}%`, background: color }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right" style={{ color }}>
                          {p}%
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Booked (MTD)", value: GOALS.monthly.booked.toString(), icon: TrendingUp, color: "#22c55e" },
              { label: "Active Setters", value: SETTERS.length.toString(), icon: Users, color: "#3b82f6" },
              { label: "Team Goal Hit Rate", value: `${monthlyPct}%`, icon: Target, color: "#f59e0b" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl border p-4"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: s.color + "1a" }}
                  >
                    <Icon size={15} style={{ color: s.color }} />
                  </div>
                  <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Column ─────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Dialing Performance */}
          <div
            className="rounded-xl border p-5"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Phone size={16} style={{ color: "#3b82f6" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Dialing Performance
              </h2>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
              11am–6pm EST window
            </p>

            {/* Table */}
            <div
              className="grid gap-2 px-3 py-2 rounded-lg mb-2 text-xs font-semibold"
              style={{ gridTemplateColumns: "1fr 1fr 1fr", background: "var(--secondary)", color: "var(--muted-foreground)" }}
            >
              <span>Day</span>
              <span className="text-right">Time to Dial<br /><span className="font-normal">(target &lt;15m)</span></span>
              <span className="text-right">% under 15m<br /><span className="font-normal">(target 85%+)</span></span>
            </div>

            <div className="space-y-1 mb-4">
              {TEAM_DIALING_MAR.map((row) => (
                <div
                  key={row.date}
                  className="grid gap-2 px-2 py-1.5 rounded items-center text-sm"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                >
                  <span style={{ color: "var(--muted-foreground)" }}>{row.date}</span>
                  <div className="flex justify-end">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: dialTimeBg(row.timeMins),
                        color: dialTimeColor(row.timeMins),
                      }}
                    >
                      {row.timeToDial}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: pctBg(row.pctUnder15m),
                        color: pctColor(row.pctUnder15m),
                      }}
                    >
                      {row.pctUnder15m.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Rolling Averages */}
            <div
              className="rounded-lg overflow-hidden border"
              style={{ borderColor: "#06b6d4" }}
            >
              <div
                className="px-3 py-2 text-xs font-bold tracking-wider text-center"
                style={{ background: "#06b6d4", color: "#0a0f1e" }}
              >
                Rolling AVG
              </div>
              {TEAM_ROLLING_AVG_MAR.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-2 px-3 py-2 border-t items-center text-sm"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr", borderColor: "var(--border)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>{row.label}</span>
                  <div className="flex justify-end">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: dialTimeBg(row.timeMins),
                        color: dialTimeColor(row.timeMins),
                      }}
                    >
                      {row.timeToDial}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: pctBg(row.pctUnder15m),
                        color: pctColor(row.pctUnder15m),
                      }}
                    >
                      {row.pctUnder15m.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
