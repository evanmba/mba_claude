"use client";

import { useState } from "react";
import { SetterInfo, MonthData } from "@/lib/setter-data";
import { Phone, Target, Calendar, TrendingUp, ChevronLeft, User } from "lucide-react";
import Link from "next/link";

interface Props {
  setter: SetterInfo;
  monthlyData: Record<string, MonthData>;
  availableMonths: string[];
}

function pct(booked: number, goal: number) {
  return goal > 0 ? Math.round((booked / goal) * 100) : 0;
}

function progressColor(p: number) {
  if (p >= 85) return "#22c55e";
  if (p >= 50) return "#f59e0b";
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
  return "rgba(239,68,68,0.15)";
}

function pctColor(p: number) {
  if (p >= 85) return "#22c55e";
  return "#ef4444";
}

export default function SetterClientPage({ setter, monthlyData, availableMonths }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[availableMonths.length - 1]);

  const data = monthlyData[selectedMonth];

  const bookedPct = data ? pct(data.booked, data.goal) : 0;

  const avgDialMins = data && data.dialingDays.length > 0
    ? data.dialingDays.reduce((s, d) => s + d.timeMins, 0) / data.dialingDays.length
    : 0;

  const avgPctUnder15 = data && data.dialingDays.length > 0
    ? data.dialingDays.reduce((s, d) => s + d.pctUnder15m, 0) / data.dialingDays.length
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dialers"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
        >
          <ChevronLeft size={13} /> Back
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: setter.color + "22" }}
          >
            <User size={20} style={{ color: setter.color }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              {setter.name}
            </h1>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Individual Setter Tracker
            </p>
          </div>
        </div>
      </div>

      {/* Month Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider mr-2" style={{ color: "var(--muted-foreground)" }}>
          Month:
        </span>
        {availableMonths.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              selectedMonth === m
                ? { background: setter.color, color: "#fff" }
                : { background: "var(--secondary)", color: "var(--muted-foreground)" }
            }
          >
            {m}
          </button>
        ))}
      </div>

      {!data ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p style={{ color: "var(--muted-foreground)" }}>No data available for {selectedMonth}</p>
        </div>
      ) : (
        <>
          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Booked Calls",
                value: `${data.booked} / ${data.goal}`,
                sub: `${bookedPct}% of goal`,
                icon: Target,
                color: progressColor(bookedPct),
              },
              {
                label: "Goal Hit Rate",
                value: `${bookedPct}%`,
                sub: selectedMonth,
                icon: TrendingUp,
                color: progressColor(bookedPct),
              },
              {
                label: "Avg Time to Dial",
                value: `${Math.floor(avgDialMins / 60)}h:${String(Math.round(avgDialMins % 60)).padStart(2, "0")}m`,
                sub: "Target < 15m",
                icon: Phone,
                color: avgDialMins <= 15 ? "#22c55e" : "#ef4444",
              },
              {
                label: "Avg % Under 15m",
                value: `${avgPctUnder15.toFixed(1)}%`,
                sub: "Target 85%+",
                icon: Calendar,
                color: avgPctUnder15 >= 85 ? "#22c55e" : "#ef4444",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl border p-5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: s.color + "22" }}
                    >
                      <Icon size={14} style={{ color: s.color }} />
                    </div>
                  </div>
                  <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: s.color }}>{s.sub}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ── Weekly Breakdown ── */}
            <div
              className="rounded-xl border p-5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} style={{ color: setter.color }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Weekly Breakdown — {selectedMonth}
                </h2>
              </div>

              {/* Booked calls progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Monthly Progress</span>
                  <span className="text-xs font-semibold" style={{ color: progressColor(bookedPct) }}>
                    {data.booked} / {data.goal} ({bookedPct}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(bookedPct, 100)}%`, background: setter.color }}
                  />
                </div>
              </div>

              {/* Weekly rows */}
              <div
                className="grid gap-2 px-3 py-2 rounded-lg mb-2 text-xs font-semibold"
                style={{ gridTemplateColumns: "60px 1fr 1fr 1fr 80px", background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                <span>Week</span>
                <span>Start</span>
                <span>End</span>
                <span className="text-right">Booked</span>
                <span className="text-right">Progress</span>
              </div>
              <div className="space-y-1">
                {data.weeklyBreakdown.map((w) => {
                  const wp = pct(w.booked, w.goal);
                  return (
                    <div
                      key={w.week}
                      className="grid gap-2 px-3 py-2.5 rounded-lg items-center text-sm"
                      style={{ gridTemplateColumns: "60px 1fr 1fr 1fr 80px" }}
                    >
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ background: setter.color + "22", color: setter.color }}
                      >
                        {w.week}
                      </span>
                      <span style={{ color: "var(--muted-foreground)" }}>{w.start}</span>
                      <span style={{ color: "var(--muted-foreground)" }}>{w.end}</span>
                      <span className="text-right font-semibold" style={{ color: "var(--foreground)" }}>
                        {w.booked}/{w.goal}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(wp, 100)}%`, background: progressColor(wp) }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Dialing Performance ── */}
            <div
              className="rounded-xl border p-5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Phone size={15} style={{ color: "#3b82f6" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Dialing Performance — {selectedMonth}
                </h2>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
                11am–6pm EST · Target: dial &lt;15m · 85%+ under 15m
              </p>

              {/* Table header */}
              <div
                className="grid gap-2 px-3 py-2 rounded-lg mb-2 text-xs font-semibold"
                style={{ gridTemplateColumns: "1fr 1fr 1fr", background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                <span>Day</span>
                <span className="text-right">Time to Dial</span>
                <span className="text-right">% under 15m</span>
              </div>

              <div className="space-y-1 mb-4">
                {data.dialingDays.map((row) => (
                  <div
                    key={row.date}
                    className="grid gap-2 px-2 py-1.5 rounded items-center text-sm"
                    style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                  >
                    <span style={{ color: "var(--muted-foreground)" }}>{row.date}</span>
                    <div className="flex justify-end">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: dialTimeBg(row.timeMins), color: dialTimeColor(row.timeMins) }}
                      >
                        {row.timeToDial}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: pctBg(row.pctUnder15m), color: pctColor(row.pctUnder15m) }}
                      >
                        {row.pctUnder15m.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rolling Avg */}
              {data.rollingAvg.length > 0 && (
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
                  {data.rollingAvg.map((row) => (
                    <div
                      key={row.label}
                      className="grid gap-2 px-3 py-2 border-t items-center text-sm"
                      style={{ gridTemplateColumns: "1fr 1fr 1fr", borderColor: "var(--border)" }}
                    >
                      <span className="font-semibold" style={{ color: "var(--foreground)" }}>{row.label}</span>
                      <div className="flex justify-end">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: dialTimeBg(row.timeMins), color: dialTimeColor(row.timeMins) }}
                        >
                          {row.timeToDial}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: pctBg(row.pctUnder15m), color: pctColor(row.pctUnder15m) }}
                        >
                          {row.pctUnder15m.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
