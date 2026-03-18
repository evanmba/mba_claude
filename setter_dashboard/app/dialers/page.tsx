"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  SETTERS,
  SETTER_MONTHLY_DATA,
  AVAILABLE_MONTHS,
} from "@/lib/setter-data";
import { User } from "lucide-react";
import Link from "next/link";

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function bookedColor(p: number) {
  if (p >= 50) return "#22c55e";
  if (p >= 25) return "#f59e0b";
  return "#ef4444";
}

function sitPctColor(p: number) {
  if (p >= 50) return "#22c55e";
  if (p > 0) return "#f59e0b";
  return "var(--muted-foreground)";
}

export default function DialersPage() {
  const summaryRows = SETTERS.map((setter) => {
    const months = AVAILABLE_MONTHS.map((m) => {
      const d = SETTER_MONTHLY_DATA[setter.id]?.[m];
      return { month: m, data: d ?? null };
    });
    return { setter, months };
  });

  const teamTotals = AVAILABLE_MONTHS.map((month) => {
    const rows = SETTERS.map((s) => SETTER_MONTHLY_DATA[s.id]?.[month]).filter(Boolean);
    const totalBooked = rows.reduce((acc, r) => acc + (r?.booked ?? 0), 0);
    const totalGoal = rows.reduce((acc, r) => acc + (r?.goal ?? 0), 0);
    const totalTaken = rows.reduce((acc, r) => acc + (r?.taken ?? 0), 0);
    const totalDeals = rows.reduce((acc, r) => acc + (r?.deals ?? 0), 0);
    return {
      month,
      totalBooked,
      totalGoal,
      bookedPct: pct(totalBooked, totalGoal),
      totalTaken,
      sitPct: pct(totalTaken, totalBooked),
      totalDeals,
      closePct: pct(totalDeals, totalTaken),
    };
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

      {/* ── Monthly Summary Cards ──────────────────────────────── */}
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
              <span className="text-lg font-bold" style={{ color: bookedColor(t.bookedPct) }}>
                {t.bookedPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--secondary)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(t.bookedPct, 100)}%`, background: bookedColor(t.bookedPct) }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Sits taken</p>
                <p className="text-sm font-semibold" style={{ color: sitPctColor(t.sitPct) }}>
                  {t.totalTaken} <span className="text-xs font-normal">({t.sitPct}%)</span>
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Deals closed</p>
                <p className="text-sm font-semibold" style={{ color: t.totalDeals > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
                  {t.totalDeals} <span className="text-xs font-normal">({t.closePct}%)</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Setter × Month Table ─────────────────────────────── */}
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
                  style={{ color: "var(--muted-foreground)", minWidth: "180px" }}
                >
                  Setter
                </th>
                {AVAILABLE_MONTHS.map((m) => (
                  <th
                    key={m}
                    colSpan={4}
                    className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider border-l"
                    style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
                  >
                    {m}
                  </th>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid var(--border)`, background: "rgba(30,41,59,0.4)" }}>
                <th className="px-5 py-2" />
                {AVAILABLE_MONTHS.map((m) => [
                  <th key={`${m}-booked`} className="px-3 py-2 text-right text-xs border-l" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>Booked</th>,
                  <th key={`${m}-pct`}    className="px-3 py-2 text-right text-xs"            style={{ color: "var(--muted-foreground)" }}>%</th>,
                  <th key={`${m}-taken`}  className="px-3 py-2 text-right text-xs"            style={{ color: "var(--muted-foreground)" }}>Sits</th>,
                  <th key={`${m}-deals`}  className="px-3 py-2 text-right text-xs"            style={{ color: "var(--muted-foreground)" }}>Deals</th>,
                ])}
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
                        className="text-sm font-medium group-hover:underline"
                        style={{ color: "var(--foreground)" }}
                      >
                        {setter.name}
                      </span>
                    </Link>
                  </td>
                  {months.map(({ month, data }) => {
                    if (!data) {
                      return [
                        <td key={`${month}-b`}  className="px-3 py-3 text-right border-l text-xs" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>—</td>,
                        <td key={`${month}-p`}  className="px-3 py-3 text-right text-xs"           style={{ color: "var(--muted-foreground)" }}>—</td>,
                        <td key={`${month}-tk`} className="px-3 py-3 text-right text-xs"           style={{ color: "var(--muted-foreground)" }}>—</td>,
                        <td key={`${month}-d`}  className="px-3 py-3 text-right text-xs"           style={{ color: "var(--muted-foreground)" }}>—</td>,
                      ];
                    }
                    const bp = pct(data.booked, data.goal);
                    const sp = pct(data.taken ?? 0, data.booked);
                    return [
                      <td key={`${month}-b`} className="px-3 py-3 text-right border-l font-semibold text-sm" style={{ color: "var(--foreground)", borderColor: "var(--border)" }}>
                        {data.booked}/{data.goal}
                      </td>,
                      <td key={`${month}-p`} className="px-3 py-3 text-right font-semibold text-sm" style={{ color: bookedColor(bp) }}>
                        {bp}%
                      </td>,
                      <td key={`${month}-tk`} className="px-3 py-3 text-right text-sm">
                        {data.taken != null && data.taken > 0 ? (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
                          >
                            {data.taken} <span style={{ opacity: 0.7 }}>({sp}%)</span>
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>0</span>
                        )}
                      </td>,
                      <td key={`${month}-d`} className="px-3 py-3 text-right text-sm">
                        {data.deals != null && data.deals > 0 ? (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                          >
                            {data.deals}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>0</span>
                        )}
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
