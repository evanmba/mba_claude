"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  CheckCircle2,
  Users,
  CalendarCheck,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from "lucide-react";
import {
  METRICS,
  METRIC_MAP,
  hasReading,
  type MetricKey,
  type AthleteHistory,
} from "@/lib/athletes";
import { MetricLineChart } from "./MetricLineChart";

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function isThisWeek(iso: string): boolean {
  const now = Date.now();
  return now - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function delta(a: AthleteHistory, key: MetricKey) {
  const valued = a.entries.filter((e) => hasReading(e[key]));
  if (valued.length < 2) return null;
  const diff = valued[valued.length - 1][key] - valued[0][key];
  if (diff === 0 || METRIC_MAP[key].neutral) return { diff, improved: null as boolean | null };
  return { diff, improved: METRIC_MAP[key].higherIsBetter ? diff > 0 : diff < 0 };
}

/** Most recent entry that has a reading for this metric (or null). */
function latestReading(a: AthleteHistory, key: MetricKey): number | null {
  for (let i = a.entries.length - 1; i >= 0; i--) {
    if (hasReading(a.entries[i][key])) return a.entries[i][key];
  }
  return null;
}

// ─── Detail panel ───────────────────────────────────────────────────────────

function AthleteDetail({ athlete }: { athlete: AthleteHistory }) {
  const defaultSel =
    METRICS.find((m) => athlete.entries.some((e) => hasReading(e[m.key])))?.key ?? "bodyWeight";
  const [selected, setSelected] = useState<MetricKey>(defaultSel);
  const metric = METRIC_MAP[selected];
  const points = athlete.entries
    .filter((e) => hasReading(e[selected]))
    .map((e) => ({ week: e.week, value: e[selected], date: e.submittedAt }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => {
          const isSel = selected === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setSelected(m.key)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: isSel ? m.color : "var(--secondary)",
                color: isSel ? "#fff" : "var(--muted-foreground)",
              }}
            >
              {m.shortLabel}
            </button>
          );
        })}
      </div>

      <MetricLineChart
        points={points}
        color={metric.color}
        unit={metric.unit}
        label={metric.label}
      />

      {/* Full history table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Week", "Date", ...METRICS.map((m) => m.shortLabel)].map((h) => (
                <th
                  key={h}
                  className="text-left py-2 pr-4 font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athlete.entries.map((e, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-2 pr-4 font-medium" style={{ color: "var(--foreground)" }}>
                  Wk {e.week}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(e.submittedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                {METRICS.map((m) => (
                  <td
                    key={m.key}
                    className="py-2 pr-4"
                    style={{ color: hasReading(e[m.key]) ? m.color : "var(--muted-foreground)" }}
                  >
                    {hasReading(e[m.key]) ? fmt(e[m.key]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Roster ─────────────────────────────────────────────────────────────────

type RefreshState = "idle" | "loading" | "success";

export function AthletesRoster({
  initialAthletes,
  serverFetchedAt,
}: {
  initialAthletes: AthleteHistory[];
  serverFetchedAt: string;
}) {
  const [athletes, setAthletes] = useState(initialAthletes);
  const [fetchedAt, setFetchedAt] = useState(serverFetchedAt);
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const [openPhone, setOpenPhone] = useState<string | null>(
    initialAthletes[0]?.phone ?? null,
  );

  const refresh = useCallback(async () => {
    setRefreshState("loading");
    try {
      const res = await fetch("/api/athlete/all");
      const json = await res.json();
      if (json.ok) {
        setAthletes(json.athletes);
        setFetchedAt(json.fetchedAt);
        setRefreshState("success");
        setTimeout(() => setRefreshState("idle"), 2000);
      } else {
        setRefreshState("idle");
      }
    } catch {
      setRefreshState("idle");
    }
  }, []);

  const checkedInThisWeek = athletes.filter((a) =>
    a.entries.some((e) => isThisWeek(e.submittedAt)),
  ).length;
  const totalCheckIns = athletes.reduce((s, a) => s + a.entries.length, 0);

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {refreshState === "success" ? (
            <>
              <CheckCircle2 size={13} style={{ color: "#22c55e" }} />
              <span style={{ color: "#22c55e" }}>Updated just now</span>
            </>
          ) : (
            <span>
              Last synced:{" "}
              {new Date(fetchedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/check-in"
            target="_blank"
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg hover:opacity-80"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            <ExternalLink size={12} /> Open check-in form
          </Link>
          <button
            onClick={refresh}
            disabled={refreshState === "loading"}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg hover:opacity-80 active:scale-95 disabled:opacity-50"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={12} style={{ animation: refreshState === "loading" ? "spin 0.6s linear infinite" : undefined }} />
            {refreshState === "loading" ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Athletes", value: String(athletes.length), icon: Users, color: "#3b82f6" },
          { label: "Checked in this week", value: String(checkedInThisWeek), icon: CalendarCheck, color: "#22c55e" },
          { label: "Total check-ins", value: String(totalCheckIns), icon: TrendingUp, color: "#f59e0b" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border p-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
              <s.icon size={15} style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {athletes.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Users size={28} className="mx-auto mb-3" style={{ color: "var(--muted-foreground)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
            No athlete check-ins yet
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            Share the check-in form with your athletes to start collecting data.
          </p>
          <Link
            href="/check-in"
            target="_blank"
            className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-lg"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            <ExternalLink size={13} /> Open the check-in form
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {athletes.map((a) => {
            const latest = a.entries[a.entries.length - 1];
            const isOpen = openPhone === a.phone;
            return (
              <div
                key={a.phone}
                className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                {/* Row header */}
                <button
                  onClick={() => setOpenPhone(isOpen ? null : a.phone)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                      {a.name || "Unnamed athlete"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Week {latest.week} · {a.entries.length} check-in{a.entries.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {/* Latest values + deltas */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    {METRICS.map((m) => {
                      const d = delta(a, m.key);
                      return (
                        <div key={m.key} className="text-right">
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{m.shortLabel}</p>
                          <p className="text-sm font-bold flex items-center gap-1 justify-end" style={{ color: "var(--foreground)" }}>
                            {(() => { const v = latestReading(a, m.key); return v === null ? "—" : fmt(v); })()}
                            {d &&
                              (d.improved === null ? (
                                <Minus size={11} style={{ color: "var(--muted-foreground)" }} />
                              ) : d.improved ? (
                                <TrendingUp size={11} style={{ color: "#22c55e" }} />
                              ) : (
                                <TrendingDown size={11} style={{ color: "#ef4444" }} />
                              ))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <ChevronRight
                    size={18}
                    style={{
                      color: "var(--muted-foreground)",
                      transform: isOpen ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s ease",
                      flexShrink: 0,
                    }}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                    <AthleteDetail athlete={a} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
