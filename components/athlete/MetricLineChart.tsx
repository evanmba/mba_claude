"use client";

import { useState } from "react";

export interface ChartPoint {
  week: number;
  value: number;
  date: string; // ISO
}

interface Props {
  points: ChartPoint[];
  color: string;
  unit: string;
  label: string;
}

// viewBox coordinate space — the SVG scales to 100% width responsively.
const VB_W = 340;
const VB_H = 210;
const PAD = { top: 40, right: 18, bottom: 34, left: 18 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmt(n: number): string {
  // Trim trailing zeros: 78.0 → "78", 6.90 → "6.9"
  return Number(n.toFixed(2)).toString();
}

export function MetricLineChart({ points, color, unit, label }: Props) {
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl text-sm"
        style={{ height: 180, background: "var(--secondary)", color: "var(--muted-foreground)" }}
      >
        No data yet
      </div>
    );
  }

  const values = points.map((p) => p.value);
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  if (minV === maxV) {
    // Single value or flat line — pad so the point sits mid-chart.
    const bump = Math.max(Math.abs(minV) * 0.1, 1);
    minV -= bump;
    maxV += bump;
  } else {
    const pad = (maxV - minV) * 0.2;
    minV -= pad;
    maxV += pad;
  }

  const x = (i: number) =>
    points.length === 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (i / (points.length - 1)) * PLOT_W;
  const y = (v: number) =>
    PAD.top + PLOT_H - ((v - minV) / (maxV - minV)) * PLOT_H;

  const coords = points.map((p, i) => ({ cx: x(i), cy: y(p.value), ...p }));
  const linePath = coords.map((c) => `${c.cx},${c.cy}`).join(" ");
  const areaPath =
    `${PAD.left + (points.length === 1 ? PLOT_W / 2 : 0)},${PAD.top + PLOT_H} ` +
    coords.map((c) => `${c.cx},${c.cy}`).join(" ") +
    ` ${coords[coords.length - 1].cx},${PAD.top + PLOT_H}`;

  // 3 recessive horizontal gridlines
  const gridYs = [0, 0.5, 1].map((t) => PAD.top + t * PLOT_H);
  const gradId = `grad-${label.replace(/\W/g, "")}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        style={{ height: "auto", display: "block", touchAction: "pan-y" }}
        role="img"
        aria-label={`${label} progress chart in ${unit}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridYs.map((gy, i) => (
          <line
            key={i}
            x1={PAD.left}
            x2={VB_W - PAD.right}
            y1={gy}
            y2={gy}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}

        {/* Area fill under the line */}
        {points.length > 1 && <polygon points={areaPath} fill={`url(#${gradId})`} />}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Points + labels */}
        {coords.map((c, i) => {
          const isActive = active === i;
          return (
            <g key={i}>
              {/* Value label above the point */}
              <text
                x={c.cx}
                y={c.cy - 12}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                style={{ fill: "var(--foreground)" }}
              >
                {fmt(c.value)}
              </text>
              {/* Surface ring + point */}
              <circle cx={c.cx} cy={c.cy} r={isActive ? 7 : 5.5} fill="var(--card)" />
              <circle
                cx={c.cx}
                cy={c.cy}
                r={isActive ? 5.5 : 4}
                fill={color}
                stroke="var(--card)"
                strokeWidth={2}
              />
              {/* Week label on x-axis */}
              <text
                x={c.cx}
                y={VB_H - 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                style={{ fill: isActive ? color : "var(--muted-foreground)" }}
              >
                Wk {c.week}
              </text>
              {/* Larger invisible hit target for tap/hover */}
              <circle
                cx={c.cx}
                cy={c.cy}
                r={16}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
                onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
              />
            </g>
          );
        })}
      </svg>

      {/* Active point detail (date) */}
      <div className="text-center mt-1 h-4">
        {active !== null && (
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Week {coords[active].week} · {shortDate(coords[active].date)} ·{" "}
            <span style={{ color }}>
              {fmt(coords[active].value)} {unit}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
