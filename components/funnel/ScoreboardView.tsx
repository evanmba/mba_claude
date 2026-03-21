"use client";

import { type ScoreboardRow } from "@/lib/funnel";

// ─── Formatters ─────────────────────────────────────────────────────────────

const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const $dec = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const ratio = (n: number) => (n === 0 ? "—" : `${n.toFixed(2)}x`);

// ─── Metric definitions ─────────────────────────────────────────────────────

type MetricKey = keyof Omit<ScoreboardRow, "month">;

interface MetricDef {
  key: MetricKey;
  label: string;
  format: (n: number) => string;
  /** true = higher is better, false = lower is better */
  higherIsBetter: boolean;
  group: "spend" | "top-funnel" | "calls" | "revenue";
}

const METRICS: MetricDef[] = [
  // Spend
  { key: "amountSpent",   label: "Amount Spent",   format: $$,    higherIsBetter: false, group: "spend" },
  // Top funnel
  { key: "leads",         label: "Leads",          format: num,   higherIsBetter: true,  group: "top-funnel" },
  { key: "apps",          label: "Apps",            format: num,   higherIsBetter: true,  group: "top-funnel" },
  // Calls
  { key: "bookedCalls",   label: "Booked Calls",   format: num,   higherIsBetter: true,  group: "calls" },
  { key: "takenCalls",    label: "Taken Calls",    format: num,   higherIsBetter: true,  group: "calls" },
  { key: "cashPerCall",   label: "$ Per Call",     format: $dec,  higherIsBetter: true,  group: "calls" },
  { key: "showUpRate",    label: "Show-Up Rate",   format: pct,   higherIsBetter: true,  group: "calls" },
  { key: "closeRate",     label: "Close Rate",     format: pct,   higherIsBetter: true,  group: "calls" },
  { key: "dealsClosed",   label: "Deals Closed",   format: num,   higherIsBetter: true,  group: "calls" },
  // Revenue
  { key: "cashCollected", label: "Cash Collected", format: $$,    higherIsBetter: true,  group: "revenue" },
  { key: "cashROAS",      label: "Cash ROAS",      format: ratio, higherIsBetter: true,  group: "revenue" },
  { key: "revROAS",       label: "Rev ROAS",       format: ratio, higherIsBetter: true,  group: "revenue" },
];

const GROUP_LABELS: Record<MetricDef["group"], string> = {
  spend:       "Ad Spend",
  "top-funnel": "Top of Funnel",
  calls:       "Calls & Conversions",
  revenue:     "Revenue",
};

// ─── Delta helpers ──────────────────────────────────────────────────────────

function delta(current: number, prev: number): number | null {
  if (prev === 0 || current === 0) return null;
  return ((current - prev) / prev) * 100;
}

function DeltaBadge({
  pctChange,
  higherIsBetter,
}: {
  pctChange: number | null;
  higherIsBetter: boolean;
}) {
  if (pctChange === null) return <span style={{ color: "var(--muted-foreground)" }}>—</span>;

  const positive = pctChange >= 0;
  const good = positive === higherIsBetter;
  const color = good ? "#22c55e" : "#ef4444";
  const bg = good ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
  const sign = positive ? "▲" : "▼";

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums"
      style={{ color, background: bg }}
    >
      {sign} {Math.abs(pctChange).toFixed(1)}%
    </span>
  );
}

// ─── Hero cards (current & previous month) ──────────────────────────────────

function HeroCard({
  label,
  current,
  prev,
  format,
  higherIsBetter,
  color,
}: {
  label: string;
  current: number;
  prev: number | undefined;
  format: (n: number) => string;
  higherIsBetter: boolean;
  color: string;
}) {
  const d = prev !== undefined ? delta(current, prev) : null;
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums" style={{ color }}>
        {format(current)}
      </p>
      <DeltaBadge pctChange={d} higherIsBetter={higherIsBetter} />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface Props {
  scoreboard: ScoreboardRow[];
}

const GROUP_COLORS: Record<MetricDef["group"], string> = {
  spend:       "#ef4444",
  "top-funnel": "#d946ef",
  calls:       "#f59e0b",
  revenue:     "#22c55e",
};

const HERO_METRICS: MetricKey[] = [
  "cashCollected", "dealsClosed", "leads", "cashPerCall",
  "showUpRate", "closeRate", "cashROAS",
];

export function ScoreboardView({ scoreboard }: Props) {
  if (scoreboard.length === 0) {
    return (
      <div
        className="rounded-xl p-10 text-center text-sm"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
      >
        No scoreboard data — ensure the <strong>2026</strong> tab is accessible and has month rows.
      </div>
    );
  }

  const months = scoreboard;
  const current = months[months.length - 1];
  const prev = months.length >= 2 ? months[months.length - 2] : undefined;

  const heroMetrics = METRICS.filter((m) => HERO_METRICS.includes(m.key));

  // Group the full metric list
  const groups = (["spend", "top-funnel", "calls", "revenue"] as MetricDef["group"][]).map(
    (g) => ({ group: g, metrics: METRICS.filter((m) => m.group === g) })
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Section title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Funnel Scoreboard
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {current.month} vs {prev?.month ?? "prior month"} · month-over-month
          </p>
        </div>
        <div
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}
        >
          {months.length} month{months.length !== 1 ? "s" : ""} of data
        </div>
      </div>

      {/* Hero metrics — current month snapshot */}
      <div className="grid grid-cols-4 gap-3 xl:grid-cols-7">
        {heroMetrics.map((m) => (
          <HeroCard
            key={m.key}
            label={m.label}
            current={current[m.key]}
            prev={prev?.[m.key]}
            format={m.format}
            higherIsBetter={m.higherIsBetter}
            color={GROUP_COLORS[m.group]}
          />
        ))}
      </div>

      {/* MoM table — all months as columns, metrics as rows */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Month-over-Month Breakdown
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Δ = change vs prior month
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                <th
                  className="px-4 py-2.5 text-left font-semibold sticky left-0 z-10"
                  style={{ color: "var(--muted-foreground)", background: "var(--secondary)", minWidth: 140 }}
                >
                  Metric
                </th>
                {months.map((m, i) => (
                  <th
                    key={m.month}
                    className="px-3 py-2.5 text-right font-semibold whitespace-nowrap"
                    style={{
                      color: i === months.length - 1 ? "#3b82f6" : "var(--muted-foreground)",
                    }}
                  >
                    {m.month}
                  </th>
                ))}
                {months.length >= 2 && (
                  <th
                    className="px-3 py-2.5 text-right font-semibold whitespace-nowrap"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    MoM Δ
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {groups.map(({ group, metrics }) => (
                <>
                  {/* Group header row */}
                  <tr
                    key={`group-${group}`}
                    style={{ background: `${GROUP_COLORS[group]}18`, borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      colSpan={months.length + 2}
                      className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider"
                      style={{ color: GROUP_COLORS[group] }}
                    >
                      {GROUP_LABELS[group]}
                    </td>
                  </tr>

                  {/* Metric rows */}
                  {metrics.map((metric, mi) => {
                    const lastTwo = months.slice(-2);
                    const d =
                      lastTwo.length === 2
                        ? delta(lastTwo[1][metric.key], lastTwo[0][metric.key])
                        : null;

                    return (
                      <tr
                        key={metric.key}
                        style={{
                          background:
                            mi % 2 === 0 ? "var(--card)" : "rgba(255,255,255,0.02)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {/* Metric label */}
                        <td
                          className="px-4 py-2 font-medium sticky left-0 z-10"
                          style={{
                            color: "var(--foreground)",
                            background: mi % 2 === 0 ? "var(--card)" : "rgba(255,255,255,0.02)",
                            minWidth: 140,
                          }}
                        >
                          {metric.label}
                        </td>

                        {/* Monthly values */}
                        {months.map((m, i) => (
                          <td
                            key={m.month}
                            className="px-3 py-2 text-right tabular-nums whitespace-nowrap"
                            style={{
                              color:
                                i === months.length - 1
                                  ? "var(--foreground)"
                                  : "var(--muted-foreground)",
                              fontWeight: i === months.length - 1 ? 600 : 400,
                            }}
                          >
                            {metric.format(m[metric.key])}
                          </td>
                        ))}

                        {/* MoM delta */}
                        {months.length >= 2 && (
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <DeltaBadge
                              pctChange={d}
                              higherIsBetter={metric.higherIsBetter}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
