"use client";

import { useState, useRef, useCallback } from "react";
import { type ScoreboardRow, type MonthlyRow, type YTDRow } from "@/lib/funnel";

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const ABBRS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function parseMonthLabel(label: string): { monthIdx: number; year: number } {
  const [abbr, yearStr] = label.split(" ");
  const monthIdx = ABBRS.indexOf((abbr ?? "").toUpperCase());
  const year = parseInt(yearStr ?? "2026", 10);
  return { monthIdx: monthIdx >= 0 ? monthIdx : 2, year };
}

// ─── MoM badge ────────────────────────────────────────────────────────────────
function MomBadge({ cur, prv, hib = true }: { cur: number; prv: number; hib?: boolean }) {
  if (!prv || !cur) {
    return <span style={{ color: "#334155", fontSize: 12 }}>No prev month</span>;
  }
  const d = ((cur - prv) / prv) * 100;
  const good = hib ? d >= 0 : d <= 0;
  const color = good ? "#4ade80" : "#f87171";
  const arrow = d >= 0 ? "↑" : "↓";
  const sign = d >= 0 ? "+" : "";
  return (
    <span style={{ color, fontSize: 12, fontWeight: 600 }}>
      {arrow} {sign}{d.toFixed(1)}% MoM
    </span>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
const CARD_BG = "#0b1628";

function MetricCard({
  label, value, cur, prv, hib = true,
}: {
  label: string; value: string;
  cur: number; prv: number; hib?: boolean;
}) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-2" style={{ background: CARD_BG }}>
      <p style={{ color: "#64748b", fontSize: 12, fontWeight: 500, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ color: "#ffffff", fontSize: 36, fontWeight: 800, lineHeight: 1, margin: 0 }}>
        {value}
      </p>
      <MomBadge cur={cur} prv={prv} hib={hib} />
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
      <span style={{ width: 3, height: 16, borderRadius: 2, background: color, display: "inline-block" }} />
      <span style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Interactive Sparkline ────────────────────────────────────────────────────
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function InteractiveSparkline({
  curData, monthIdx, year, color, formatter,
}: {
  curData: number[]; monthIdx: number; year: number; color: string;
  formatter: (v: number) => string;
}) {
  const W = 800;
  const H = 120;
  const padL = 8; const padR = 8; const padT = 16; const padB = 32;
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
    let closest = 0; let minDist = Infinity;
    curPts.forEach(([px], i) => { const d = Math.abs(rawX - px); if (d < minDist) { minDist = d; closest = i; } });
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
            style={{ width: "100%", height: 140, display: "block", cursor: "crosshair" }}
            preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
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
              <polyline points={polyStr(curPts)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            )}
            {curPts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={hoverIdx === i ? 5 : 2.5}
                fill={hoverIdx === i ? "#fff" : color} stroke={hoverIdx === i ? color : "none"} strokeWidth="2" />
            ))}
            {hoverIdx !== null && curPts[hoverIdx] && (
              <line x1={curPts[hoverIdx][0]} x2={curPts[hoverIdx][0]}
                y1={padT} y2={H - padB} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 2" />
            )}
            {xLabels.map(({ i, label, x }) => (
              <text key={i} x={x} y={H - padB + 10} textAnchor="end"
                transform={`rotate(-45, ${x}, ${H - padB + 10})`}
                fill={hoverIdx === i ? "#e2e8f0" : "#475569"} fontSize="9" style={{ userSelect: "none" }}>
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
              <p style={{ color: "#94a3b8", fontSize: 10, margin: 0 }}>{MONTH_SHORT[monthIdx]} {hoverIdx + 1}, {year}</p>
              <p style={{ color: "#ffffff", fontSize: 13, fontWeight: 700, margin: 0 }}>{formatter(cur[hoverIdx])}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#334155", fontSize: 12 }}>No data yet</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
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
    <div className="rounded-xl p-5 flex flex-col gap-2" style={{ background: CARD_BG }}>
      <p style={{ color: "#64748b", fontSize: 12, fontWeight: 500, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label} · {monthName}
      </p>
      <p style={{ color: "#ffffff", fontSize: 32, fontWeight: 800, lineHeight: 1, margin: 0 }}>
        {formatter(curTotal)}
      </p>
      <MomBadge cur={curTotal} prv={prv} hib={hib} />
      <div style={{ marginTop: 6 }}>
        <InteractiveSparkline curData={curData} monthIdx={monthIdx} year={year} color={color} formatter={formatter} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  scoreboard: ScoreboardRow[];
  monthly: MonthlyRow[];
  prevMonthly: MonthlyRow[];
  ytd: YTDRow[];
  ytd2025: YTDRow[];
  monthLabel: string;
  prevMonthLabel: string;
}

export function ScoreboardView({ scoreboard, monthly, prevMonthly, ytd, monthLabel, prevMonthLabel }: Props) {
  const kpi = monthly.find((r) => r.period === "30 Days") ?? monthly.find((r) => r.isRollup) ?? null;
  const dailyRows = monthly.filter((r) => !r.isRollup);

  const { monthIdx, year } = parseMonthLabel(monthLabel);
  const monthName = MONTH_NAMES[monthIdx];

  // Previous month KPI: prefer the actual prev month sheet (full data), fall back to YTD/scoreboard rows
  const prevKpi = prevMonthly.find((r) => r.period === "30 Days") ?? prevMonthly.find((r) => r.isRollup) ?? null;

  const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : 11;
  const prevMonthName = MONTH_NAMES[prevMonthIdx];
  const prevSb  = scoreboard.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;
  const prevYtd = ytd.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;

  const prev = {
    uniqueClicks:  prevKpi?.uniqueClicks  ?? prevYtd?.uniqueClicks  ?? 0,
    ctr:           prevKpi?.ctr           ?? prevYtd?.ctr           ?? 0,
    costPerClick:  prevKpi?.costPerClick  ?? prevYtd?.costPerClick  ?? 0,
    leads:         prevKpi?.leads         ?? prevSb?.leads          ?? prevYtd?.leads          ?? 0,
    optInConv:     prevKpi?.leadConv      ?? prevYtd?.optInConv     ?? 0,
    costPerLead:   prevKpi?.costPerLead   ?? prevYtd?.costPerLead   ?? 0,
    apps:          prevKpi?.apps          ?? prevSb?.apps           ?? 0,
    appConv:       prevKpi?.appConv       ?? 0,
    costPerApp:    prevKpi?.costPerApp    ?? 0,
    bookedCalls:   prevKpi?.bookedCalls   ?? prevSb?.bookedCalls    ?? prevYtd?.bookedCalls    ?? 0,
    leadToBooked:  prevKpi?.bookedConv    ?? prevYtd?.leadToBookedRate ?? 0,
    costPerBooked: prevKpi?.costPerBooked ?? prevYtd?.costPerBooked ?? 0,
    takenCalls:    prevKpi?.takenCalls    ?? prevSb?.takenCalls     ?? prevYtd?.takenCalls     ?? 0,
    showUpRate:    prevKpi?.showUpRate    ?? prevSb?.showUpRate     ?? prevYtd?.showUpRate     ?? 0,
    costPerTaken:  prevKpi?.costPerTaken  ?? prevYtd?.costPerTaken  ?? 0,
    dealsClosed:   prevKpi?.dealsClosed   ?? prevSb?.dealsClosed    ?? prevYtd?.dealsClosed    ?? 0,
    closeRate:     prevKpi?.closeRate     ?? prevSb?.closeRate      ?? prevYtd?.closeRate      ?? 0,
    cpa:           prevKpi?.cpa           ?? prevYtd?.cpa           ?? 0,
  };

  void prevMonthLabel; // available for display if needed

  return (
    <div className="flex flex-col gap-4">

      {/* ── Row 1: Ad Clicks ── */}
      <SectionLabel label="Ad Performance" color="#3b82f6" />
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Unique Clicks"  value={kpi ? num(kpi.uniqueClicks)  : "—"} cur={kpi?.uniqueClicks  ?? 0} prv={prev.uniqueClicks}  hib={true}  />
        <MetricCard label="Unique CTR"     value={kpi ? pct(kpi.ctr)           : "—"} cur={kpi?.ctr           ?? 0} prv={prev.ctr}           hib={true}  />
        <MetricCard label="$ Per Click"    value={kpi ? $$(kpi.costPerClick)   : "—"} cur={kpi?.costPerClick  ?? 0} prv={prev.costPerClick}  hib={false} />
      </div>

      {/* ── Row 2: Leads ── */}
      <SectionLabel label="Lead Generation" color="#8b5cf6" />
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Leads"           value={kpi ? num(kpi.leads)         : "—"} cur={kpi?.leads         ?? 0} prv={prev.leads}         hib={true}  />
        <MetricCard label="Opt-In Conv %"   value={kpi ? pct(kpi.leadConv)      : "—"} cur={kpi?.leadConv      ?? 0} prv={prev.optInConv}     hib={true}  />
        <MetricCard label="Cost Per Lead"   value={kpi ? $$(kpi.costPerLead)   : "—"} cur={kpi?.costPerLead   ?? 0} prv={prev.costPerLead}   hib={false} />
      </div>

      {/* ── Row 3: Apps ── */}
      <SectionLabel label="Applications" color="#06b6d4" />
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total Apps"      value={kpi ? num(kpi.apps)          : "—"} cur={kpi?.apps          ?? 0} prv={prev.apps}          hib={true}  />
        <MetricCard label="App Conv %"      value={kpi ? pct(kpi.appConv)       : "—"} cur={kpi?.appConv       ?? 0} prv={prev.appConv}       hib={true}  />
        <MetricCard label="Cost Per App"    value={kpi ? $$(kpi.costPerApp)    : "—"} cur={kpi?.costPerApp    ?? 0} prv={prev.costPerApp}    hib={false} />
      </div>

      {/* ── Row 4: Booked Calls ── */}
      <SectionLabel label="Booked Calls" color="#22c55e" />
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Booked Calls"           value={kpi ? num(kpi.bookedCalls)    : "—"} cur={kpi?.bookedCalls    ?? 0} prv={prev.bookedCalls}   hib={true}  />
        <MetricCard label="Lead-to-Booked Rate"    value={kpi ? pct(kpi.bookedConv)     : "—"} cur={kpi?.bookedConv     ?? 0} prv={prev.leadToBooked}  hib={true}  />
        <MetricCard label="Cost Per Booked Call"   value={kpi ? $$(kpi.costPerBooked)  : "—"} cur={kpi?.costPerBooked  ?? 0} prv={prev.costPerBooked} hib={false} />
      </div>

      {/* ── Row 5: Taken Calls ── */}
      <SectionLabel label="Taken Calls" color="#f59e0b" />
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Taken Calls"        value={kpi ? num(kpi.takenCalls)    : "—"} cur={kpi?.takenCalls    ?? 0} prv={prev.takenCalls}   hib={true}  />
        <MetricCard label="Show-Up Rate"        value={kpi ? pct(kpi.showUpRate)    : "—"} cur={kpi?.showUpRate    ?? 0} prv={prev.showUpRate}   hib={true}  />
        <MetricCard label="Cost Per Taken Call" value={kpi ? $$(kpi.costPerTaken)  : "—"} cur={kpi?.costPerTaken  ?? 0} prv={prev.costPerTaken} hib={false} />
      </div>

      {/* ── Row 6: Deals ── */}
      <SectionLabel label="Deals" color="#ef4444" />
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Deals Closed"       value={kpi ? num(kpi.dealsClosed)  : "—"} cur={kpi?.dealsClosed  ?? 0} prv={prev.dealsClosed} hib={true}  />
        <MetricCard label="Close Rate"          value={kpi ? pct(kpi.closeRate)    : "—"} cur={kpi?.closeRate    ?? 0} prv={prev.closeRate}   hib={true}  />
        <MetricCard label="Cost Per Acquisition" value={kpi ? $$(kpi.cpa)         : "—"} cur={kpi?.cpa          ?? 0} prv={prev.cpa}         hib={false} />
      </div>

      {/* ── Sparklines ── */}
      <div style={{ marginTop: 8 }}>
        <SectionLabel label="Daily Trends" color="#3b82f6" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SparkCard label="Leads" monthName={monthName} curData={dailyRows.map((r) => r.leads)}
          monthIdx={monthIdx} year={year} color="#8b5cf6" formatter={num}
          curTotal={kpi?.leads ?? 0} prv={prev.leads} />
        <SparkCard label="Booked Calls" monthName={monthName} curData={dailyRows.map((r) => r.bookedCalls)}
          monthIdx={monthIdx} year={year} color="#22c55e" formatter={num}
          curTotal={kpi?.bookedCalls ?? 0} prv={prev.bookedCalls} />
        <SparkCard label="Taken Calls" monthName={monthName} curData={dailyRows.map((r) => r.takenCalls)}
          monthIdx={monthIdx} year={year} color="#f59e0b" formatter={num}
          curTotal={kpi?.takenCalls ?? 0} prv={prev.takenCalls} />
        <SparkCard label="Deals Closed" monthName={monthName} curData={dailyRows.map((r) => r.dealsClosed)}
          monthIdx={monthIdx} year={year} color="#ef4444" formatter={num}
          curTotal={kpi?.dealsClosed ?? 0} prv={prev.dealsClosed} />
      </div>

    </div>
  );
}
