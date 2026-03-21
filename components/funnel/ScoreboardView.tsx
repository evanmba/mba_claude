"use client";

import { useState, useRef, useCallback } from "react";
import { type ScoreboardRow, type MonthlyRow, type YTDRow } from "@/lib/funnel";

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];
const ABBRS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function parseMonthLabel(label: string): { monthIdx: number; year: number } {
  const [abbr, yearStr] = label.split(" ");
  const monthIdx = ABBRS.indexOf((abbr ?? "").toUpperCase());
  const year = parseInt(yearStr ?? "2026", 10);
  return { monthIdx: monthIdx >= 0 ? monthIdx : 2, year };
}

// ─── MoM line ─────────────────────────────────────────────────────────────────
function MomLine({ cur, prv, hib = true }: { cur: number; prv: number; hib?: boolean }) {
  if (!prv || !cur) return <span style={{ color: "#475569", fontSize: 14 }}>— no prev month data</span>;
  const d = ((cur - prv) / prv) * 100;
  const good = hib ? d >= 0 : d <= 0;
  const color = good ? "#4ade80" : "#f87171";
  const arrow = d >= 0 ? "↗" : "↘";
  const sign = d >= 0 ? "+" : "";
  return (
    <span style={{ color, fontSize: 14, fontWeight: 600 }}>
      {arrow} {sign}{d.toFixed(1)}% vs last month
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
const CARD_BG = "#0b1628";

function Card({
  label, monthName, value, cur, prv, hib = true, bg,
}: {
  label: string; monthName: string; value: string;
  cur: number; prv: number; hib?: boolean; bg?: string;
}) {
  const dark = !!bg;
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-2" style={{ background: bg ?? CARD_BG }}>
      <p style={{ color: dark ? "rgba(0,0,0,0.55)" : "#94a3b8", fontSize: 14, fontWeight: 500, margin: 0 }}>
        {label} · {monthName}
      </p>
      <p style={{ color: dark ? "rgba(0,0,0,0.9)" : "#ffffff", fontSize: 42, fontWeight: 800, lineHeight: 1, margin: 0 }}>
        {value}
      </p>
      <MomLine cur={cur} prv={prv} hib={hib} />
    </div>
  );
}

// ─── Interactive Sparkline ────────────────────────────────────────────────────
function InteractiveSparkline({
  curData, monthIdx, year, color, formatter,
}: {
  curData: number[]; monthIdx: number; year: number; color: string;
  formatter: (v: number) => string;
}) {
  const W = 800;
  const H = 120;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 32;

  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const cur = [...curData];
  while (cur.length > 0 && cur[cur.length - 1] === 0) cur.pop();
  const n = cur.length;

  function calcPoints(data: number[]): [number, number][] {
    const vals = data.map((v) => (isNaN(v) ? 0 : v));
    const max = Math.max(...vals.filter((v) => v > 0), 1);
    return vals.map((v, i) => [
      padL + (i / Math.max(vals.length - 1, 1)) * (W - padL - padR),
      padT + (1 - v / max) * (H - padT - padB),
    ]);
  }

  const curPts = n >= 2 ? calcPoints(cur) : [];
  const polyStr = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(" ");

  const labelStep = n > 20 ? 2 : 1;
  const xLabels = cur
    .map((_, i) => ({ i, label: `${i + 1} ${MONTH_SHORT[monthIdx]}`, x: padL + (i / Math.max(n - 1, 1)) * (W - padL - padR) }))
    .filter((_, i) => i % labelStep === 0);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || n < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let minDist = Infinity;
    curPts.forEach(([px], i) => {
      const d = Math.abs(rawX - px);
      if (d < minDist) { minDist = d; closest = i; }
    });
    setHoverIdx(closest);
    const [px, py] = curPts[closest];
    setTooltipPos({ x: (px / W) * 100, y: (py / H) * 100 });
  }, [curPts, n]);

  const handleMouseLeave = useCallback(() => { setHoverIdx(null); setTooltipPos(null); }, []);

  const curStart = `${MONTH_SHORT[monthIdx]} 1, ${year}`;
  const curEnd = n > 0 ? `${MONTH_SHORT[monthIdx]} ${n}, ${year}` : curStart;

  return (
    <div style={{ position: "relative" }}>
      {n >= 2 ? (
        <div style={{ position: "relative" }}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: 160, display: "block", cursor: "crosshair" }}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
          >
            {[0.25, 0.5, 0.75].map((t) => (
              <line key={t} x1={padL} x2={W - padR}
                y1={padT + (1 - t) * (H - padT - padB)} y2={padT + (1 - t) * (H - padT - padB)}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            {curPts.length >= 2 && (
              <polygon
                points={[`${curPts[0][0]},${H - padB}`, ...curPts.map(([x, y]) => `${x},${y}`), `${curPts[curPts.length - 1][0]},${H - padB}`].join(" ")}
                fill={`${color}1a`} />
            )}
            {curPts.length >= 2 && (
              <polyline points={polyStr(curPts)} fill="none" stroke={color} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
            )}
            {curPts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={hoverIdx === i ? 5 : 2.5}
                fill={hoverIdx === i ? "#fff" : color}
                stroke={hoverIdx === i ? color : "none"} strokeWidth="2" />
            ))}
            {hoverIdx !== null && curPts[hoverIdx] && (
              <line x1={curPts[hoverIdx][0]} x2={curPts[hoverIdx][0]}
                y1={padT} y2={H - padB}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 2" />
            )}
            {xLabels.map(({ i, label, x }) => (
              <text key={i} x={x} y={H - padB + 10} textAnchor="end"
                transform={`rotate(-45, ${x}, ${H - padB + 10})`}
                fill={hoverIdx === i ? "#e2e8f0" : "#475569"} fontSize="9"
                style={{ userSelect: "none" }}>
                {label}
              </text>
            ))}
          </svg>

          {hoverIdx !== null && tooltipPos && curPts[hoverIdx] && (
            <div style={{
              position: "absolute",
              left: `clamp(0px, calc(${tooltipPos.x}% - 48px), calc(100% - 96px))`,
              top: `${tooltipPos.y}%`, transform: "translateY(-120%)",
              background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8, padding: "6px 10px", pointerEvents: "none", zIndex: 10, whiteSpace: "nowrap",
            }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
        <span style={{ color: "#64748b", fontSize: 11 }}>{curStart} – {curEnd}</span>
      </div>
    </div>
  );
}

// ─── Sparkline card ───────────────────────────────────────────────────────────
function SparkCard({
  label, monthName, curData, monthIdx, year, color, formatter, curTotal, prv, hib = true,
}: {
  label: string; monthName: string; curData: number[];
  monthIdx: number; year: number; color: string;
  formatter: (v: number) => string;
  curTotal: number; prv: number; hib?: boolean;
}) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-2" style={{ background: CARD_BG }}>
      <p style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500, margin: 0 }}>
        {label} · {monthName}
      </p>
      <p style={{ color: "#ffffff", fontSize: 32, fontWeight: 800, lineHeight: 1, margin: 0 }}>
        {formatter(curTotal)}
      </p>
      <MomLine cur={curTotal} prv={prv} hib={hib} />
      <div style={{ marginTop: 8 }}>
        <InteractiveSparkline curData={curData} monthIdx={monthIdx} year={year} color={color} formatter={formatter} />
      </div>
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
  const monthName = MONTH_NAMES[monthIdx];

  const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : 11;
  const prevMonthName = MONTH_NAMES[prevMonthIdx];

  // Prefer scoreboard rows (parsed from fixed columns, always available)
  // Fall back to ytd rows (parsed from header-based format)
  const prevSb = scoreboard.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;
  const prevYtd = ytd.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;

  const prev = {
    leads:       prevSb?.leads       ?? prevYtd?.leads       ?? 0,
    bookedCalls: prevSb?.bookedCalls ?? prevYtd?.bookedCalls ?? 0,
    takenCalls:  prevSb?.takenCalls  ?? prevYtd?.takenCalls  ?? 0,
    dealsClosed: prevSb?.dealsClosed ?? prevYtd?.dealsClosed ?? 0,
    cash:        prevSb?.cashCollected ?? prevYtd?.cash      ?? 0,
    cashPerCall: prevSb && prevSb.takenCalls > 0 ? prevSb.cashCollected / prevSb.takenCalls : 0,
  };

  const cashPerCall = kpi && kpi.takenCalls > 0 ? kpi.cash / kpi.takenCalls : 0;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Row 1: 2 large cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card label="Taken Calls" monthName={monthName}
          value={kpi ? num(kpi.takenCalls) : "—"}
          cur={kpi?.takenCalls ?? 0} prv={prev.takenCalls} />
        <Card label="$ Per Call" monthName={monthName}
          value={kpi ? $$(cashPerCall) : "—"}
          cur={cashPerCall} prv={prev.cashPerCall} bg="#f59e0b" />
      </div>

      {/* ── Row 2: 4 tiles ── */}
      <div className="grid grid-cols-4 gap-3">
        <Card label="New Leads"          monthName={monthName} value={kpi ? num(kpi.leads) : "—"}        cur={kpi?.leads ?? 0}        prv={prev.leads} />
        <Card label="Booked Calls"       monthName={monthName} value={kpi ? num(kpi.bookedCalls) : "—"}  cur={kpi?.bookedCalls ?? 0}  prv={prev.bookedCalls} />
        <Card label="Deals Closed"       monthName={monthName} value={kpi ? num(kpi.dealsClosed) : "—"}  cur={kpi?.dealsClosed ?? 0}  prv={prev.dealsClosed} />
        <Card label="New Cash Collected" monthName={monthName} value={kpi ? $$(kpi.cash) : "—"}          cur={kpi?.cash ?? 0}         prv={prev.cash} />
      </div>

      {/* ── Row 3: 2 sparkline cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <SparkCard label="New Leads"    monthName={monthName} curData={dailyRows.map((r) => r.leads)}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={num}
          curTotal={kpi?.leads ?? 0} prv={prev.leads} />
        <SparkCard label="Deals Closed" monthName={monthName} curData={dailyRows.map((r) => r.dealsClosed)}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={num}
          curTotal={kpi?.dealsClosed ?? 0} prv={prev.dealsClosed} />
      </div>

      {/* ── Row 4: 2 sparkline cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <SparkCard label="Taken Calls"        monthName={monthName} curData={dailyRows.map((r) => r.takenCalls)}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={num}
          curTotal={kpi?.takenCalls ?? 0} prv={prev.takenCalls} />
        <SparkCard label="New Cash Collected" monthName={monthName} curData={dailyRows.map((r) => r.cash)}
          monthIdx={monthIdx} year={year} color="#3b82f6" formatter={$$}
          curTotal={kpi?.cash ?? 0} prv={prev.cash} />
      </div>

    </div>
  );
}
