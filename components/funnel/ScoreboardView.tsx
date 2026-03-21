"use client";

import { type ScoreboardRow } from "@/lib/funnel";

// ─── Formatters ──────────────────────────────────────────────────────────────

const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const $dec = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const ratio = (n: number) => (n === 0 ? "—" : `${n.toFixed(2)}x`);

type MetricKey = keyof Omit<ScoreboardRow, "month">;

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  data,
  color,
  height = 72,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const valid = data.map((v) => (isNaN(v) ? 0 : v));
  const max = Math.max(...valid, 0.001);
  const min = Math.min(...valid.filter((v) => v > 0), 0);
  const range = max - min || 1;
  const W = 260;
  const H = height;
  const padX = 6;
  const padY = 6;

  if (valid.length < 2) return null;

  const pts = valid.map((v, i) => {
    const x = padX + (i / (valid.length - 1)) * (W - padX * 2);
    const y = H - padY - ((v - min) / range) * (H - padY * 2);
    return [x, y] as [number, number];
  });

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = [
    `${pts[0][0]},${H - padY}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${H - padY}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height, display: "block" }}
      preserveAspectRatio="none"
    >
      {/* Horizontal guide lines */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={W - padX}
          y1={padY + (1 - t) * (H - padY * 2)}
          y2={padY + (1 - t) * (H - padY * 2)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}
      {/* Area fill */}
      <polygon points={area} fill={`${color}20`} />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={color} />
      ))}
    </svg>
  );
}

// ─── Delta chip ───────────────────────────────────────────────────────────────

function delta(cur: number, prv: number): number | null {
  if (!prv || !cur) return null;
  return ((cur - prv) / prv) * 100;
}

function DeltaChip({
  d,
  higherIsBetter,
  dark = false,
}: {
  d: number | null;
  higherIsBetter: boolean;
  dark?: boolean;
}) {
  if (d === null)
    return (
      <span style={{ color: dark ? "rgba(255,255,255,0.4)" : "var(--muted-foreground)", fontSize: 12 }}>
        no prior data
      </span>
    );
  const up = d >= 0;
  const good = up === higherIsBetter;
  const color = good ? "#4ade80" : "#f87171";
  return (
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        color,
        letterSpacing: "0.01em",
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(d).toFixed(1)}% vs prior month
    </span>
  );
}

// ─── Hero card (large, solid background color) ────────────────────────────────

function HeroCard({
  label,
  subtitle,
  value,
  delta: d,
  higherIsBetter,
  bg,
  textColor = "#ffffff",
}: {
  label: string;
  subtitle: string;
  value: string;
  delta: number | null;
  higherIsBetter: boolean;
  bg: string;
  textColor?: string;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center gap-2 p-6"
      style={{ background: bg, minHeight: 160 }}
    >
      <p
        className="text-center font-semibold"
        style={{ color: textColor, fontSize: 18, opacity: 0.9 }}
      >
        {label}
      </p>
      <p
        className="text-center text-sm"
        style={{ color: textColor, opacity: 0.65, marginTop: -4 }}
      >
        {subtitle}
      </p>
      <p
        className="text-center font-bold tabular-nums"
        style={{ color: textColor, fontSize: 38, lineHeight: 1.1, marginTop: 4 }}
      >
        {value}
      </p>
      <DeltaChip d={d} higherIsBetter={higherIsBetter} dark />
    </div>
  );
}

// ─── Small metric tile ────────────────────────────────────────────────────────

const CARD_BG = "#0d1b35";

function MetricTile({
  label,
  subtitle,
  value,
  d,
  higherIsBetter,
}: {
  label: string;
  subtitle: string;
  value: string;
  d: number | null;
  higherIsBetter: boolean;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center gap-1.5 p-5"
      style={{ background: CARD_BG, minHeight: 110 }}
    >
      <p className="text-center font-semibold text-sm" style={{ color: "#e2e8f0" }}>
        {label}
      </p>
      <p className="text-center text-xs" style={{ color: "#64748b" }}>
        {subtitle}
      </p>
      <p className="text-center font-bold tabular-nums" style={{ color: "#ffffff", fontSize: 26, lineHeight: 1.1 }}>
        {value}
      </p>
      <DeltaChip d={d} higherIsBetter={higherIsBetter} />
    </div>
  );
}

// ─── Trend card (sparkline + legend) ─────────────────────────────────────────

function TrendCard({
  label,
  subtitle,
  months,
  values,
  color,
}: {
  label: string;
  subtitle: string;
  months: string[];
  values: number[];
  color: string;
}) {
  const prevValues = values.slice(0, -1);
  const curValue = values[values.length - 1];
  const prevValue = values[values.length - 2];
  const prevMonth = months[months.length - 2] ?? "";
  const curMonth = months[months.length - 1] ?? "";

  return (
    <div
      className="rounded-2xl flex flex-col p-5 gap-3"
      style={{ background: CARD_BG, minHeight: 200 }}
    >
      <div>
        <p className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: "#64748b" }}>
          {subtitle}
        </p>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1 }}>
        {values.length >= 2 ? (
          <div className="relative">
            {/* Previous months in muted */}
            {prevValues.length >= 2 && (
              <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
                <Sparkline data={prevValues} color={color} height={72} />
              </div>
            )}
            {/* Full line (current) in full color */}
            <Sparkline data={values} color={color} height={72} />
          </div>
        ) : (
          <div
            style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span style={{ color: "#334155", fontSize: 12 }}>not enough data</span>
          </div>
        )}
      </div>

      {/* Month axis labels */}
      {months.length > 1 && (
        <div className="flex justify-between px-1">
          {months.map((m) => (
            <span key={m} style={{ color: "#475569", fontSize: 10 }}>
              {m.slice(0, 3)}
            </span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-col gap-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {prevMonth && (
          <div className="flex items-center gap-2">
            <span
              className="rounded-full"
              style={{ width: 8, height: 8, background: color, opacity: 0.4, flexShrink: 0 }}
            />
            <span style={{ color: "#64748b", fontSize: 11 }}>
              {prevMonth} — {prevValue > 0 ? prevValue.toLocaleString() : "—"}
            </span>
          </div>
        )}
        {curMonth && (
          <div className="flex items-center gap-2">
            <span
              className="rounded-full"
              style={{ width: 8, height: 8, background: color, flexShrink: 0 }}
            />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>
              {curMonth} — {curValue > 0 ? curValue.toLocaleString() : "—"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  scoreboard: ScoreboardRow[];
}

export function ScoreboardView({ scoreboard }: Props) {
  if (scoreboard.length === 0) return null;

  const months = scoreboard;
  const cur = months[months.length - 1];
  const prv = months.length >= 2 ? months[months.length - 2] : undefined;

  const d = (key: MetricKey) => (prv ? delta(cur[key], prv[key]) : null);
  const vals = (key: MetricKey) => months.map((m) => m[key]);
  const monthNames = months.map((m) => m.month);

  return (
    <div className="flex flex-col gap-4" style={{ padding: "4px 0" }}>

      {/* ── Row 1: 4 large hero cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <HeroCard
          label="Taken Calls"
          subtitle="Month to date"
          value={num(cur.takenCalls)}
          delta={d("takenCalls")}
          higherIsBetter
          bg="#0f2044"
        />
        <HeroCard
          label="$ Per Call"
          subtitle="Current month"
          value={$dec(cur.cashPerCall)}
          delta={d("cashPerCall")}
          higherIsBetter
          bg="#d97706"
        />
        <HeroCard
          label="Show-Up Rate"
          subtitle="Month to date"
          value={pct(cur.showUpRate)}
          delta={d("showUpRate")}
          higherIsBetter
          bg="#b91c1c"
        />
        <HeroCard
          label="Cash Collected"
          subtitle="Month to date"
          value={$$(cur.cashCollected)}
          delta={d("cashCollected")}
          higherIsBetter
          bg="#15803d"
        />
      </div>

      {/* ── Row 2: 8 small metric tiles ── */}
      <div className="grid grid-cols-8 gap-3">
        {(
          [
            { key: "leads" as MetricKey,       label: "New Leads",     fmt: num,   hib: true  },
            { key: "apps" as MetricKey,         label: "Apps",          fmt: num,   hib: true  },
            { key: "bookedCalls" as MetricKey,  label: "Booked Calls",  fmt: num,   hib: true  },
            { key: "dealsClosed" as MetricKey,  label: "Deals Closed",  fmt: num,   hib: true  },
            { key: "amountSpent" as MetricKey,  label: "Amount Spent",  fmt: $$,    hib: false },
            { key: "closeRate" as MetricKey,    label: "Close Rate",    fmt: pct,   hib: true  },
            { key: "cashROAS" as MetricKey,     label: "Cash ROAS",     fmt: ratio, hib: true  },
            { key: "revROAS" as MetricKey,      label: "Rev ROAS",      fmt: ratio, hib: true  },
          ] as { key: MetricKey; label: string; fmt: (n: number) => string; hib: boolean }[]
        ).map(({ key, label, fmt, hib }) => (
          <MetricTile
            key={key}
            label={label}
            subtitle="Month to date"
            value={fmt(cur[key])}
            d={d(key)}
            higherIsBetter={hib}
          />
        ))}
      </div>

      {/* ── Rows 3 & 4: trend / sparkline cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <TrendCard label="New Leads"      subtitle="Month to date" months={monthNames} values={vals("leads")}         color="#d946ef" />
        <TrendCard label="Deals Closed"   subtitle="Month to date" months={monthNames} values={vals("dealsClosed")}   color="#22c55e" />
        <TrendCard label="Taken Calls"    subtitle="Month to date" months={monthNames} values={vals("takenCalls")}    color="#3b82f6" />
        <TrendCard label="Cash Collected" subtitle="Month to date" months={monthNames} values={vals("cashCollected")} color="#4ade80" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <TrendCard label="Booked Calls" subtitle="Month to date" months={monthNames} values={vals("bookedCalls")} color="#a78bfa" />
        <TrendCard label="$ Per Call"   subtitle="Current month"  months={monthNames} values={vals("cashPerCall")} color="#fbbf24" />
        <TrendCard label="Close Rate"   subtitle="Month to date" months={monthNames} values={vals("closeRate")}   color="#f87171" />
        <TrendCard label="Cash ROAS"    subtitle="Month to date" months={monthNames} values={vals("cashROAS")}    color="#38bdf8" />
      </div>

    </div>
  );
}
