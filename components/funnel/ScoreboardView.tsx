"use client";

import { useState, useRef, useCallback } from "react";
import { type ScoreboardRow, type MonthlyRow, type YTDRow } from "@/lib/funnel";

// ─── Projection helpers ────────────────────────────────────────────────────────
function project(current: number, daysElapsed: number, totalDays: number): number {
  if (!daysElapsed || !current) return 0;
  return Math.round((current / daysElapsed) * totalDays);
}

function daysInMonth(monthIdx: number, year: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];
const ABBRS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// ─── Parse monthLabel (e.g. "MAR 2026") ──────────────────────────────────────
function parseMonthLabel(label: string): { monthIdx: number; year: number } {
  const [abbr, yearStr] = label.split(" ");
  const monthIdx = ABBRS.indexOf((abbr ?? "").toUpperCase());
  const year = parseInt(yearStr ?? "2026", 10);
  return { monthIdx: monthIdx >= 0 ? monthIdx : 2, year };
}

// ─── Interactive Sparkline ────────────────────────────────────────────────────
function InteractiveSparkline({
  curData,
  monthIdx,
  year,
  color,
  formatter,
}: {
  curData: number[];
  monthIdx: number;
  year: number;
  color: string;
  formatter: (v: number) => string;
}) {
  const W = 800;
  const H = 120;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 32; // room for x-axis labels

  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Trim trailing zeros from current data
  const cur = [...curData];
  while (cur.length > 0 && cur[cur.length - 1] === 0) cur.pop();
  const n = cur.length;

  function calcPoints(data: number[]): [number, number][] {
    const vals = data.map((v) => (isNaN(v) ? 0 : v));
    const max = Math.max(...vals.filter((v) => v > 0), 1);
    const range = max || 1;
    return vals.map((v, i) => {
      const x = padL + (i / Math.max(vals.length - 1, 1)) * (W - padL - padR);
      const y = padT + (1 - v / range) * (H - padT - padB);
      return [x, y];
    });
  }

  const curPts = n >= 2 ? calcPoints(cur) : [];

  const polyStr = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(" ");

  // X-axis date labels — show every day, abbreviated "1 Mar" style
  const xLabels = cur.map((_, i) => ({
    i,
    label: `${i + 1} ${MONTH_SHORT[monthIdx]}`,
    x: padL + (i / Math.max(n - 1, 1)) * (W - padL - padR),
  }));

  // Show labels: skip some if too many days
  const labelStep = n > 20 ? 2 : 1;
  const visibleLabels = xLabels.filter((_, i) => i % labelStep === 0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || n < 2) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * W;
      // Find closest point
      let closest = 0;
      let minDist = Infinity;
      curPts.forEach(([px], i) => {
        const d = Math.abs(rawX - px);
        if (d < minDist) { minDist = d; closest = i; }
      });
      setHoverIdx(closest);
      const [px, py] = curPts[closest];
      setTooltipPos({ x: (px / W) * 100, y: (py / H) * 100 });
    },
    [curPts, n]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null);
    setTooltipPos(null);
  }, []);

  // Legend date ranges
  const curStart = `${MONTH_SHORT[monthIdx]} 1, ${year}`;
  const curEnd = n > 0 ? `${MONTH_SHORT[monthIdx]} ${n}, ${year}` : curStart;

  return (
    <div style={{ position: "relative" }}>
      {n >= 2 ? (
        <div style={{ position: "relative" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: 160, display: "block", cursor: "crosshair" }}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1={padL} x2={W - padR}
                y1={padT + (1 - t) * (H - padT - padB)}
                y2={padT + (1 - t) * (H - padT - padB)}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1"
              />
            ))}

            {/* Current period fill */}
            {curPts.length >= 2 && (
              <polygon
                points={[
                  `${curPts[0][0]},${H - padB}`,
                  ...curPts.map(([x, y]) => `${x},${y}`),
                  `${curPts[curPts.length - 1][0]},${H - padB}`,
                ].join(" ")}
                fill={`${color}1a`}
              />
            )}

            {/* Current period line */}
            {curPts.length >= 2 && (
              <polyline
                points={polyStr(curPts)}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Dots */}
            {curPts.map(([x, y], i) => (
              <circle
                key={i}
                cx={x} cy={y}
                r={hoverIdx === i ? 5 : 2.5}
                fill={hoverIdx === i ? "#fff" : color}
                stroke={hoverIdx === i ? color : "none"}
                strokeWidth="2"
                style={{ transition: "r 0.1s" }}
              />
            ))}

            {/* Hover vertical line */}
            {hoverIdx !== null && curPts[hoverIdx] && (
              <line
                x1={curPts[hoverIdx][0]} x2={curPts[hoverIdx][0]}
                y1={padT} y2={H - padB}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 2"
              />
            )}

            {/* X-axis rotated labels */}
            {visibleLabels.map(({ i, label, x }) => (
              <text
                key={i}
                x={x}
                y={H - padB + 10}
                textAnchor="end"
                transform={`rotate(-45, ${x}, ${H - padB + 10})`}
                fill={hoverIdx === i ? "#e2e8f0" : "#475569"}
                fontSize="9"
                style={{ userSelect: "none" }}
              >
                {label}
              </text>
            ))}
          </svg>

          {/* Tooltip */}
          {hoverIdx !== null && tooltipPos && curPts[hoverIdx] && (
            <div
              style={{
                position: "absolute",
                left: `clamp(0px, calc(${tooltipPos.x}% - 48px), calc(100% - 96px))`,
                top: `${tooltipPos.y}%`,
                transform: "translateY(-120%)",
                background: "#1e293b",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "6px 10px",
                pointerEvents: "none",
                zIndex: 10,
                whiteSpace: "nowrap",
              }}
            >
              <p style={{ color: "#94a3b8", fontSize: 10, margin: 0 }}>
                {MONTH_SHORT[monthIdx]} {hoverIdx + 1}, {year}
              </p>
              <p style={{ color: "#ffffff", fontSize: 13, fontWeight: 700, margin: 0 }}>
                {formatter(cur[hoverIdx])}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#334155", fontSize: 12 }}>No data yet</span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
          <span style={{ color: "#94a3b8", fontSize: 11 }}>{curStart} – {curEnd}</span>
        </div>
      </div>
    </div>
  );
}

// ─── MoM footer row (prev mo value · % change · projected) ──────────────────
const CARD_BG = "#0b1628";

function MomRow({
  cur, prv, projected, prevLabel, formatter, hib = true, dark = false,
}: {
  cur: number; prv: number; projected: number;
  prevLabel: string; formatter: (v: number) => string;
  hib?: boolean; dark?: boolean;
}) {
  const dim    = dark ? "rgba(0,0,0,0.5)"  : "rgba(255,255,255,0.35)";
  const bright = dark ? "rgba(0,0,0,0.8)"  : "rgba(255,255,255,0.8)";
  const divider = dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.08)";

  const pctChange = prv > 0 && cur > 0 ? ((cur - prv) / prv) * 100 : null;
  const good = pctChange == null ? null : hib ? pctChange >= 0 : pctChange <= 0;
  const changeColor = pctChange == null ? dim : dark
    ? (good ? "rgba(0,100,0,0.9)" : "rgba(150,0,0,0.9)")
    : (good ? "#4ade80" : "#f87171");

  const items = [
    { label: prevLabel, value: prv > 0 ? formatter(prv) : "—" },
    {
      label: "vs prev mo",
      value: pctChange != null
        ? `${pctChange > 0 ? "▲" : "▼"} ${Math.abs(pctChange).toFixed(1)}%`
        : "—",
      color: changeColor,
    },
    { label: "Projected", value: projected > 0 ? formatter(projected) : "—" },
  ];

  return (
    <div style={{
      display: "flex", marginTop: 12,
      borderTop: `1px solid ${divider}`, paddingTop: 10,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          flex: 1, textAlign: "center",
          borderRight: i < 2 ? `1px solid ${divider}` : undefined,
        }}>
          <p style={{ color: dim, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            {item.label}
          </p>
          <p style={{ color: item.color ?? bright, fontSize: 13, fontWeight: 700, margin: "2px 0 0" }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card (top row) ──────────────────────────────────────────────────────
function StatCard({
  label, value, sub, bg, cur, prv, projected, prevLabel, formatter, hib = true,
}: {
  label: string; value: string; sub?: string; bg?: string;
  cur?: number; prv?: number; projected?: number;
  prevLabel?: string; formatter?: (v: number) => string; hib?: boolean;
}) {
  const dark = !!bg;
  return (
    <div className="rounded-2xl flex flex-col p-6" style={{ background: bg ?? CARD_BG, minHeight: 160 }}>
      <p style={{ color: dark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)", fontSize: 18, fontWeight: 600, textAlign: "center" }}>
        {label}
      </p>
      <p style={{ color: dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", marginTop: 2 }}>
        {sub ?? "Month to date"}
      </p>
      <p style={{ color: dark ? "rgba(0,0,0,0.9)" : "#ffffff", fontSize: 44, fontWeight: 800, lineHeight: 1, textAlign: "center", marginTop: "auto", paddingTop: 16 }}>
        {value}
      </p>
      {formatter && cur != null && prv != null && projected != null && prevLabel && (
        <MomRow cur={cur} prv={prv} projected={projected} prevLabel={prevLabel} formatter={formatter} hib={hib} dark={dark} />
      )}
    </div>
  );
}

// ─── Medium tile (second row) ─────────────────────────────────────────────────
function MedTile({
  label, value, cur, prv, projected, prevLabel, formatter, hib = true,
}: {
  label: string; value: string;
  cur?: number; prv?: number; projected?: number;
  prevLabel?: string; formatter?: (v: number) => string; hib?: boolean;
}) {
  return (
    <div className="rounded-2xl flex flex-col p-5" style={{ background: CARD_BG, minHeight: 140 }}>
      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: 600, textAlign: "center" }}>
        {label}
      </p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginTop: 2 }}>
        Month to date
      </p>
      <p style={{ color: "#ffffff", fontSize: 36, fontWeight: 800, lineHeight: 1, textAlign: "center", marginTop: "auto", paddingTop: 12 }}>
        {value}
      </p>
      {formatter && cur != null && prv != null && projected != null && prevLabel && (
        <MomRow cur={cur} prv={prv} projected={projected} prevLabel={prevLabel} formatter={formatter} hib={hib} />
      )}
    </div>
  );
}

// ─── Sparkline card ───────────────────────────────────────────────────────────
function SparkCard({
  label, curData, monthIdx, year, color, formatter,
  curTotal, prvTotal, projected, prevLabel, hib = true,
}: {
  label: string;
  curData: number[];
  monthIdx: number;
  year: number;
  color: string;
  formatter: (v: number) => string;
  curTotal?: number;
  prvTotal?: number;
  projected?: number;
  prevLabel?: string;
  hib?: boolean;
}) {
  return (
    <div className="rounded-2xl p-6 flex flex-col" style={{ background: CARD_BG }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, fontWeight: 600 }}>{label}</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>Month to date</p>
        </div>
        {curTotal != null && (
          <p style={{ color: "#ffffff", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
            {formatter(curTotal)}
          </p>
        )}
      </div>
      <InteractiveSparkline
        curData={curData}
        monthIdx={monthIdx}
        year={year}
        color={color}
        formatter={formatter}
      />
      {curTotal != null && prvTotal != null && projected != null && prevLabel && (
        <MomRow cur={curTotal} prv={prvTotal} projected={projected} prevLabel={prevLabel} formatter={formatter} hib={hib} />
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  scoreboard: ScoreboardRow[];
  monthly: MonthlyRow[];
  ytd: YTDRow[];
  ytd2025: YTDRow[];
  monthLabel: string;
}

export function ScoreboardView({ scoreboard, monthly, ytd, monthLabel }: Props) {
  const kpi = monthly.find((r) => r.period === "30 Days") ?? monthly.find((r) => r.isRollup) ?? null;
  const dailyRows = monthly.filter((r) => !r.isRollup);

  const { monthIdx, year } = parseMonthLabel(monthLabel);
  const curMonthName = MONTH_NAMES[monthIdx];

  // Previous month
  const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : 11;
  const prevMonthName = MONTH_NAMES[prevMonthIdx];
  const prevYTD = ytd.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;

  const cashPerCall = kpi && kpi.takenCalls > 0 ? kpi.cash / kpi.takenCalls : 0;
  const prevCashPerCall = prevYTD && prevYTD.takenCalls > 0 ? prevYTD.cash / prevYTD.takenCalls : 0;

  // Days elapsed (non-zero daily rows) and days in month
  const trimmedDaily = [...dailyRows];
  while (trimmedDaily.length > 0 && trimmedDaily[trimmedDaily.length - 1].takenCalls === 0
    && trimmedDaily[trimmedDaily.length - 1].leads === 0
    && trimmedDaily[trimmedDaily.length - 1].cash === 0) {
    trimmedDaily.pop();
  }
  const daysElapsed = Math.max(trimmedDaily.length, 1);
  const totalDays = daysInMonth(monthIdx, year);

  // Projected end-of-month values
  const proj = {
    leads:       project(kpi?.leads ?? 0,       daysElapsed, totalDays),
    booked:      project(kpi?.bookedCalls ?? 0,  daysElapsed, totalDays),
    taken:       project(kpi?.takenCalls ?? 0,   daysElapsed, totalDays),
    cash:        project(kpi?.cash ?? 0,         daysElapsed, totalDays),
    closed:      project(kpi?.dealsClosed ?? 0,  daysElapsed, totalDays),
    cashPerCall: cashPerCall, // rate doesn't project the same way
  };

  // Daily sparkline arrays
  const dailyLeads   = dailyRows.map((r) => r.leads);
  const dailyBooked  = dailyRows.map((r) => r.bookedCalls);
  const dailyTaken   = dailyRows.map((r) => r.takenCalls);
  const dailyCash    = dailyRows.map((r) => r.cash);
  const dailyClosed  = dailyRows.map((r) => r.dealsClosed);

  const prevLabel = MONTH_SHORT[prevMonthIdx];

  return (
    <div className="flex flex-col gap-3">

      {/* ── Row 1: 2 large stat cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Taken Calls" value={kpi ? num(kpi.takenCalls) : "—"} sub="Month to date"
          cur={kpi?.takenCalls} prv={prevYTD?.takenCalls ?? 0}
          projected={proj.taken} prevLabel={prevLabel} formatter={num}
        />
        <StatCard
          label="$ Per Call" value={kpi ? $$(cashPerCall) : "—"} sub="Current month"
          bg="#f59e0b"
          cur={cashPerCall || undefined} prv={prevCashPerCall || undefined}
          projected={proj.cashPerCall} prevLabel={prevLabel} formatter={$$}
        />
      </div>

      {/* ── Row 2: 4 medium tiles ── */}
      <div className="grid grid-cols-4 gap-3">
        <MedTile label="New Leads"          value={kpi ? num(kpi.leads) : "—"}
          cur={kpi?.leads} prv={prevYTD?.leads ?? 0}
          projected={proj.leads} prevLabel={prevLabel} formatter={num} />
        <MedTile label="Booked Calls"       value={kpi ? num(kpi.bookedCalls) : "—"}
          cur={kpi?.bookedCalls} prv={prevYTD?.bookedCalls ?? 0}
          projected={proj.booked} prevLabel={prevLabel} formatter={num} />
        <MedTile label="Deals Closed"       value={kpi ? num(kpi.dealsClosed) : "—"}
          cur={kpi?.dealsClosed} prv={prevYTD?.dealsClosed ?? 0}
          projected={proj.closed} prevLabel={prevLabel} formatter={num} />
        <MedTile label="New Cash Collected" value={kpi ? $$(kpi.cash) : "—"}
          cur={kpi?.cash} prv={prevYTD?.cash ?? 0}
          projected={proj.cash} prevLabel={prevLabel} formatter={$$} />
      </div>

      {/* ── Row 3: 2 sparkline cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <SparkCard label="New Leads" curData={dailyLeads}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={num}
          curTotal={kpi?.leads} prvTotal={prevYTD?.leads ?? 0}
          projected={proj.leads} prevLabel={prevLabel} />
        <SparkCard label="Deals Closed" curData={dailyClosed}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={num}
          curTotal={kpi?.dealsClosed} prvTotal={prevYTD?.dealsClosed ?? 0}
          projected={proj.closed} prevLabel={prevLabel} />
      </div>

      {/* ── Row 4: 2 sparkline cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <SparkCard label="Taken Calls" curData={dailyTaken}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={num}
          curTotal={kpi?.takenCalls} prvTotal={prevYTD?.takenCalls ?? 0}
          projected={proj.taken} prevLabel={prevLabel} />
        <SparkCard label="New Cash Collected" curData={dailyCash}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={$$}
          curTotal={kpi?.cash} prvTotal={prevYTD?.cash ?? 0}
          projected={proj.cash} prevLabel={prevLabel} />
      </div>

    </div>
  );
}
