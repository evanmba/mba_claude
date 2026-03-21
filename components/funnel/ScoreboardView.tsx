"use client";

import { useState, useRef, useCallback } from "react";
import { type ScoreboardRow, type MonthlyRow, type YTDRow } from "@/lib/funnel";

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
  prvData,
  monthIdx,
  year,
  color,
  formatter,
}: {
  curData: number[];
  prvData?: number[];
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

  function calcPoints(data: number[], len: number): [number, number][] {
    const vals = data.map((v) => (isNaN(v) ? 0 : v));
    const allVals = [...cur, ...(prvData ?? [])].filter((v) => !isNaN(v) && v > 0);
    const max = allVals.length > 0 ? Math.max(...allVals) : 1;
    const min = 0;
    const range = max - min || 1;
    return vals.map((v, i) => {
      const x = padL + (i / Math.max(len - 1, 1)) * (W - padL - padR);
      const y = padT + (1 - (v - min) / range) * (H - padT - padB);
      return [x, y];
    });
  }

  const curPts = n >= 2 ? calcPoints(cur, n) : [];
  const prvPts = prvData && prvData.length >= 2 ? calcPoints(prvData.slice(0, n), Math.max(prvData.slice(0, n).length, 2)) : [];

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
  const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : 11;
  const prevYear = monthIdx === 0 ? year - 1 : year;
  const prvStart = `${MONTH_SHORT[prevMonthIdx]} 1, ${prevYear}`;
  const prvEnd = n > 0 ? `${MONTH_SHORT[prevMonthIdx]} ${n}, ${prevYear}` : prvStart;

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

            {/* Previous period — dim dashed */}
            {prvPts.length >= 2 && (
              <polyline
                points={polyStr(prvPts)}
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

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
              {prvData && prvData[hoverIdx] != null && (
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, margin: 0 }}>
                  prev: {formatter(prvData[hoverIdx])}
                </p>
              )}
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
        {prvData && prvData.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "rgba(255,255,255,0.3)", display: "inline-block",
            }} />
            <span style={{ color: "#64748b", fontSize: 11 }}>{prvStart} – {prvEnd}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: color, display: "inline-block",
          }} />
          <span style={{ color: "#94a3b8", fontSize: 11 }}>{curStart} – {curEnd}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card (top row) ──────────────────────────────────────────────────────
const CARD_BG = "#0b1628";

function StatCard({
  label, value, sub, bg,
}: {
  label: string; value: string; sub?: string; bg?: string;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col p-6"
      style={{ background: bg ?? CARD_BG, minHeight: 160 }}
    >
      <p style={{ color: bg ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)", fontSize: 18, fontWeight: 600, textAlign: "center" }}>
        {label}
      </p>
      <p style={{ color: bg ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", marginTop: 2 }}>
        {sub ?? "Month to date"}
      </p>
      <p style={{
        color: bg ? "rgba(0,0,0,0.9)" : "#ffffff",
        fontSize: 44, fontWeight: 800, lineHeight: 1,
        textAlign: "center", marginTop: "auto", paddingTop: 16,
      }}>
        {value}
      </p>
    </div>
  );
}

// ─── Medium tile (second row) ─────────────────────────────────────────────────
function MedTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl flex flex-col p-5"
      style={{ background: CARD_BG, minHeight: 140 }}
    >
      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: 600, textAlign: "center" }}>
        {label}
      </p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginTop: 2 }}>
        Month to date
      </p>
      <p style={{ color: "#ffffff", fontSize: 36, fontWeight: 800, lineHeight: 1, textAlign: "center", marginTop: "auto", paddingTop: 12 }}>
        {value}
      </p>
    </div>
  );
}

// ─── Sparkline card ───────────────────────────────────────────────────────────
function SparkCard({
  label, curData, prvData, monthIdx, year, color, formatter,
}: {
  label: string;
  curData: number[];
  prvData?: number[];
  monthIdx: number;
  year: number;
  color: string;
  formatter: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl p-6 flex flex-col" style={{ background: CARD_BG }}>
      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, fontWeight: 600, textAlign: "center" }}>
        {label}
      </p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginTop: 2, marginBottom: 16 }}>
        Month to date
      </p>
      <InteractiveSparkline
        curData={curData}
        prvData={prvData}
        monthIdx={monthIdx}
        year={year}
        color={color}
        formatter={formatter}
      />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  scoreboard: ScoreboardRow[];
  monthly: MonthlyRow[];
  ytd: YTDRow[];
  monthLabel: string;
}

export function ScoreboardView({ scoreboard, monthly, ytd, monthLabel }: Props) {
  const kpi = monthly.find((r) => r.period === "30 Days") ?? monthly.find((r) => r.isRollup) ?? null;
  const dailyRows = monthly.filter((r) => !r.isRollup);

  const { monthIdx, year } = parseMonthLabel(monthLabel);

  // Previous month for comparison
  const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : 11;
  const prevYear = monthIdx === 0 ? year - 1 : year;
  const prevMonthName = MONTH_NAMES[prevMonthIdx];
  const prevYTD = ytd.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;

  const cashPerCall = kpi && kpi.takenCalls > 0 ? kpi.cash / kpi.takenCalls : 0;

  // Daily sparkline arrays
  const dailyLeads   = dailyRows.map((r) => r.leads);
  const dailyBooked  = dailyRows.map((r) => r.bookedCalls);
  const dailyTaken   = dailyRows.map((r) => r.takenCalls);
  const dailyCash    = dailyRows.map((r) => r.cash);
  const dailyClosed  = dailyRows.map((r) => r.dealsClosed);

  return (
    <div className="flex flex-col gap-3">

      {/* ── Row 1: 2 large stat cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Taken Calls"
          value={kpi ? num(kpi.takenCalls) : "—"}
          sub="Month to date"
        />
        <StatCard
          label="$ Per Call"
          value={kpi ? $$(cashPerCall) : "—"}
          sub="Current month"
          bg="#f59e0b"
        />
      </div>

      {/* ── Row 2: 4 medium tiles ── */}
      <div className="grid grid-cols-4 gap-3">
        <MedTile label="New Leads"         value={kpi ? num(kpi.leads) : "—"} />
        <MedTile label="Booked Calls"      value={kpi ? num(kpi.bookedCalls) : "—"} />
        <MedTile label="Deals Closed"      value={kpi ? num(kpi.dealsClosed) : "—"} />
        <MedTile label="New Cash Collected" value={kpi ? $$(kpi.cash) : "—"} />
      </div>

      {/* ── Row 3: 2 sparkline cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <SparkCard
          label="New Leads"
          curData={dailyLeads}
          prvData={prevYTD ? Array(dailyLeads.length).fill(prevYTD.leads / Math.max(dailyLeads.length, 1)) : undefined}
          monthIdx={monthIdx} year={year}
          color="#3b82f6"
          formatter={num}
        />
        <SparkCard
          label="Deals Closed"
          curData={dailyClosed}
          prvData={prevYTD ? Array(dailyClosed.length).fill(prevYTD.dealsClosed / Math.max(dailyClosed.length, 1)) : undefined}
          monthIdx={monthIdx} year={year}
          color="#3b82f6"
          formatter={num}
        />
      </div>

      {/* ── Row 4: 2 sparkline cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <SparkCard
          label="Taken Calls"
          curData={dailyTaken}
          prvData={prevYTD ? Array(dailyTaken.length).fill(prevYTD.takenCalls / Math.max(dailyTaken.length, 1)) : undefined}
          monthIdx={monthIdx} year={year}
          color="#3b82f6"
          formatter={num}
        />
        <SparkCard
          label="New Cash Collected"
          curData={dailyCash}
          prvData={prevYTD ? Array(dailyCash.length).fill(prevYTD.cash / Math.max(dailyCash.length, 1)) : undefined}
          monthIdx={monthIdx} year={year}
          color="#3b82f6"
          formatter={$$}
        />
      </div>

    </div>
  );
}
