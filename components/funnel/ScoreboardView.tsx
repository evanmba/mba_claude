"use client";

import { useState, useRef, useCallback } from "react";
import { type ScoreboardRow, type MonthlyRow, type YTDRow } from "@/lib/funnel";
import { YTDView } from "./YTDView";

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);

// Compact formatters for mobile (e.g. 1,543,244 → 1.54M, 16,657 → 16.7K)
const cnum = (n: number): string => {
  if (n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
};
const c$$ = (n: number): string => {
  if (n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
};

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

function daysInMonthFn(monthIdx: number, year: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

// Returns projected end-of-month count, or null if month complete / no data yet.
function projectCount(actual: number, daysWithData: number, totalDays: number): number | null {
  if (actual <= 0 || daysWithData <= 0 || daysWithData >= totalDays) return null;
  return Math.round((actual / daysWithData) * totalDays);
}

// ─── MoM badge ────────────────────────────────────────────────────────────────
function MomBadge({ cur, prv, hib = true }: { cur: number | undefined; prv: number | undefined; hib?: boolean }) {
  if (prv == null || cur == null) {
    return <span style={{ color: "#334155", fontSize: 11 }}>No prev data</span>;
  }
  if (prv === 0 && cur === 0) {
    return <span style={{ color: "#334155", fontSize: 12 }}>—</span>;
  }
  if (prv === 0) {
    return <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>↑ New</span>;
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
  label, value, cur, prv, hib = true, actual, mv, ma, dod, avgDaily,
}: {
  label: string; value: string;
  cur: number | undefined; prv: number | undefined; hib?: boolean;
  actual?: string; mv?: string; ma?: string;
  /** Day-over-Day % change — shown only when provided (Today tab) */
  dod?: number;
  /** Typical daily average from YTD — shown only when provided (Today tab) */
  avgDaily?: string;
}) {
  const isProjected = actual != null;
  return (
    <div className="rounded-xl p-3 sm:p-5 flex flex-col gap-1.5 sm:gap-2" style={{ background: CARD_BG }}>
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <p className="text-[10px] sm:text-xs" style={{ color: "#64748b", fontWeight: 500, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </p>
        {isProjected && (
          <span style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 4, padding: "1px 5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Proj
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl sm:text-4xl" style={{ color: "#ffffff", fontWeight: 800, lineHeight: 1, margin: 0 }}>
        {mv ? <><span className="sm:hidden">{mv}</span><span className="hidden sm:inline">{value}</span></> : value}
      </p>

      {isProjected && (
        <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>
          <span style={{ color: "#64748b" }}>actual </span>
          {ma ? <><span className="sm:hidden">{ma}</span><span className="hidden sm:inline">{actual}</span></> : actual}
        </p>
      )}

      <MomBadge cur={cur} prv={prv} hib={hib} />

      {/* DoD + avg daily — Today tab only */}
      {(dod !== undefined || avgDaily) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 2 }}>
          {dod !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 600, color: dod >= 0 ? "#4ade80" : "#f87171" }}>
              {dod >= 0 ? "↑" : "↓"} {Math.abs(dod).toFixed(1)}% DoD
            </span>
          )}
          {avgDaily && (
            <span style={{ fontSize: 11, color: "#475569" }}>
              avg <span style={{ color: "#64748b", fontWeight: 500 }}>{avgDaily}</span>/day
            </span>
          )}
        </div>
      )}
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
  curTotal: number; prv: number | undefined; hib?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 sm:p-5 flex flex-col gap-2" style={{ background: CARD_BG }}>
      <p className="text-[10px] sm:text-xs" style={{ color: "#64748b", fontWeight: 500, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label} · {monthName}
      </p>
      <p className="text-2xl sm:text-3xl" style={{ color: "#ffffff", fontWeight: 800, lineHeight: 1, margin: 0 }}>
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

export function ScoreboardView({ scoreboard, monthly, prevMonthly, ytd, ytd2025, monthLabel, prevMonthLabel }: Props) {
  const [period, setPeriod] = useState<"today" | "4d" | "14d" | "month" | "ytd">("month");

  const dailyRows = monthly.filter((r) => !r.isRollup);

  // Today's row: match against M/D/YY or M/D/YYYY date strings
  const todayDate = new Date();
  const todayStr  = `${todayDate.getMonth() + 1}/${todayDate.getDate()}/${String(todayDate.getFullYear()).slice(-2)}`;
  const todayRow  = dailyRows.find((r) => r.period === todayStr)
    ?? dailyRows.find((r) => r.period === `${todayDate.getMonth() + 1}/${todayDate.getDate()}/${todayDate.getFullYear()}`)
    ?? (dailyRows.length > 0 ? dailyRows[dailyRows.length - 1] : null);  // most recent if today not found

  const kpi =
    period === "today" ? todayRow :
    period === "4d"    ? (monthly.find((r) => r.period === "4 Days")  ?? null) :
    period === "14d"   ? (monthly.find((r) => r.period === "14 Days") ?? null) :
    (monthly.find((r) => r.period === "30 Days") ?? monthly.find((r) => r.isRollup) ?? null);

  // ── Today: DoD and YTD daily average ────────────────────────────────────────
  const todayIdx    = todayRow ? dailyRows.indexOf(todayRow) : -1;
  const yesterdayRow = todayIdx > 0 ? dailyRows[todayIdx - 1] : null;

  // DoD % helper — undefined when no comparison available
  const dodPct = (cur: number, prv: number | undefined): number | undefined =>
    (!prv || prv === 0 || cur === 0) ? undefined : ((cur - prv) / prv) * 100;

  // YTD daily avg: for each completed month in YTD, daily = total / days_in_month; then avg
  const MONTH_NAME_IDX: Record<string, number> = {
    "january":0,"february":1,"march":2,"april":3,"may":4,"june":5,
    "july":6,"august":7,"september":8,"october":9,"november":10,"december":11,
  };
  const completedYtd = ytd.filter((r) => {
    if (r.isSummary) return false;
    const idx = MONTH_NAME_IDX[r.month.toLowerCase()];
    return idx !== undefined && idx < monthIdx; // only months before current
  });
  const ytdDailyRates = completedYtd.map((r) => {
    const mIdx = MONTH_NAME_IDX[r.month.toLowerCase()] ?? 0;
    const days = new Date(year, mIdx + 1, 0).getDate();
    return {
      spend:        r.amountSpent   / days,
      impressions:  r.impressions   / days,
      uniqueClicks: r.uniqueClicks  / days,
      leads:        r.leads         / days,
      bookedCalls:  r.bookedCalls   / days,
      takenCalls:   r.takenCalls    / days,
      dealsClosed:  r.dealsClosed   / days,
      cash:         r.cash          / days,
      revenue:      r.revenue       / days,
    };
  });
  const nd = ytdDailyRates.length;
  const ytdAvg = nd > 0 ? {
    spend:        ytdDailyRates.reduce((s, r) => s + r.spend,        0) / nd,
    impressions:  ytdDailyRates.reduce((s, r) => s + r.impressions,  0) / nd,
    uniqueClicks: ytdDailyRates.reduce((s, r) => s + r.uniqueClicks, 0) / nd,
    leads:        ytdDailyRates.reduce((s, r) => s + r.leads,        0) / nd,
    bookedCalls:  ytdDailyRates.reduce((s, r) => s + r.bookedCalls,  0) / nd,
    takenCalls:   ytdDailyRates.reduce((s, r) => s + r.takenCalls,   0) / nd,
    dealsClosed:  ytdDailyRates.reduce((s, r) => s + r.dealsClosed,  0) / nd,
    cash:         ytdDailyRates.reduce((s, r) => s + r.cash,         0) / nd,
    revenue:      ytdDailyRates.reduce((s, r) => s + r.revenue,      0) / nd,
  } : null;

  const isToday = period === "today";
  // Helper: format avg daily value — suppress tiny floats by rounding
  const fAvg = (v: number) => v >= 1000 ? `$${Math.round(v / 1000)}K` : v >= 1 ? v.toFixed(1) : v.toFixed(2);


  const { monthIdx, year } = parseMonthLabel(monthLabel);
  const monthName = MONTH_NAMES[monthIdx];

  // ── Pace-based projections for count metrics ─────────────────────────────
  const totalDays = daysInMonthFn(monthIdx, year);
  // Prefer count of daily rows; fall back to calendar day-of-month so
  // projections still work when the sheet only has rollup rows (4/7/14/30 Days).
  const today = new Date();
  const isCurrentMonth = today.getMonth() === monthIdx && today.getFullYear() === year;
  // For the current month always use the calendar day so pre-filled future
  // rows in the sheet don't make daysWithData equal totalDays prematurely.
  const daysWithData = isCurrentMonth
    ? today.getDate()
    : (dailyRows.length > 0 ? dailyRows.length : totalDays);
  const proj = kpi ? {
    spend:        projectCount(kpi.amountSpent,  daysWithData, totalDays),
    impressions:  projectCount(kpi.impressions,  daysWithData, totalDays),
    uniqueClicks: projectCount(kpi.uniqueClicks, daysWithData, totalDays),
    leads:        projectCount(kpi.leads,        daysWithData, totalDays),
    apps:         projectCount(kpi.apps,         daysWithData, totalDays),
    bookedCalls:  projectCount(kpi.bookedCalls,  daysWithData, totalDays),
    takenCalls:   projectCount(kpi.takenCalls,   daysWithData, totalDays),
    dealsClosed:  projectCount(kpi.dealsClosed,  daysWithData, totalDays),
  } : null;

  // Only show projections on the Month tab — for Today/4d/14d just report actuals
  const effectiveProj = period === "month" ? proj : null;

  const isPacing = period === "month" && isCurrentMonth && daysWithData > 0 && daysWithData < totalDays && kpi != null;
  const showMoM  = period === "month" || period === "today";

  // Previous month KPI: prefer the actual prev month sheet (full data), fall back to YTD/scoreboard rows
  const prevKpi = prevMonthly.find((r) => r.period === "30 Days") ?? prevMonthly.find((r) => r.isRollup) ?? null;

  const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : 11;
  const prevMonthName = MONTH_NAMES[prevMonthIdx];
  const prevSb  = scoreboard.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;
  const prevYtd = ytd.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null;

  // undefined = no data (badge will show "No prev month"); 0 = genuinely zero
  const nz = (n: number | undefined) => (n != null && n !== 0 ? n : undefined);
  const prev = {
    amountSpent:   nz(prevKpi?.amountSpent)   ?? nz(prevYtd?.amountSpent),
    impressions:   nz(prevKpi?.impressions)   ?? nz(prevYtd?.impressions),
    uniqueClicks:  nz(prevKpi?.uniqueClicks)  ?? nz(prevYtd?.uniqueClicks),
    ctr:           nz(prevKpi?.ctr)           ?? nz(prevYtd?.ctr),
    costPerClick:  nz(prevKpi?.costPerClick)  ?? nz(prevYtd?.costPerClick),
    leads:         nz(prevKpi?.leads)         ?? nz(prevSb?.leads)          ?? nz(prevYtd?.leads),
    optInConv:     nz(prevKpi?.leadConv)      ?? nz(prevYtd?.optInConv),
    costPerLead:   nz(prevKpi?.costPerLead)   ?? nz(prevYtd?.costPerLead),
    apps:          nz(prevKpi?.apps)          ?? nz(prevSb?.apps),
    appConv:       nz(prevKpi?.appConv),
    costPerApp:    nz(prevKpi?.costPerApp),
    bookedCalls:   nz(prevKpi?.bookedCalls)   ?? nz(prevSb?.bookedCalls)    ?? nz(prevYtd?.bookedCalls),
    leadToBooked:  nz(prevKpi?.bookedConv)    ?? nz(prevYtd?.leadToBookedRate),
    costPerBooked: nz(prevKpi?.costPerBooked) ?? nz(prevYtd?.costPerBooked),
    takenCalls:    nz(prevKpi?.takenCalls)    ?? nz(prevSb?.takenCalls)     ?? nz(prevYtd?.takenCalls),
    showUpRate:    nz(prevKpi?.showUpRate)    ?? nz(prevSb?.showUpRate)     ?? nz(prevYtd?.showUpRate),
    costPerTaken:  nz(prevKpi?.costPerTaken)  ?? nz(prevYtd?.costPerTaken),
    dealsClosed:   nz(prevKpi?.dealsClosed)   ?? nz(prevSb?.dealsClosed)    ?? nz(prevYtd?.dealsClosed),
    closeRate:     nz(prevKpi?.closeRate)     ?? nz(prevSb?.closeRate)      ?? nz(prevYtd?.closeRate),
    cpa:           nz(prevKpi?.cpa)           ?? nz(prevYtd?.cpa),
    cashROAS:      nz(prevKpi?.cashROAS)      ?? nz(prevYtd?.cashROAS),
    revenueROAS:   nz(prevKpi?.revenueROAS)   ?? nz(prevYtd?.revenueROAS),
    cash:          nz(prevKpi?.cash)          ?? nz(prevYtd?.cash),
    revenue:       nz(prevKpi?.revenue)       ?? nz(prevYtd?.revenue),
  };

  void prevMonthLabel; // available for display if needed

  const TABS = [
    { key: "today", label: "Today" },
    { key: "4d",    label: "4 Days" },
    { key: "14d",   label: "14 Days" },
    { key: "month", label: monthName },
    { key: "ytd",   label: "YTD" },
  ] as const;

  // ── YTD view ──────────────────────────────────────────────────────────────
  if (period === "ytd") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex rounded-lg overflow-hidden self-start" style={{ border: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setPeriod(t.key)}
              className="px-4 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: period === t.key ? "#3b82f6" : "var(--card)",
                color: period === t.key ? "#fff" : "var(--muted-foreground)",
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <YTDView ytd={ytd} ytd2025={ytd2025} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Period tabs ── */}
      <div className="flex rounded-lg overflow-hidden self-start" style={{ border: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setPeriod(t.key)}
            className="px-4 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: period === t.key ? "#3b82f6" : "var(--card)",
              color: period === t.key ? "#fff" : "var(--muted-foreground)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Pace banner ── */}
      {isPacing && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", flexWrap: "wrap" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>
            Projecting month-end pace · day {daysWithData} of {totalDays}
          </span>
        </div>
      )}

      {/* ── Row 1: Ad Spend / Media ── */}
      <SectionLabel label="Ad Performance" color="#3b82f6" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Spend"
          value={effectiveProj?.spend != null ? $$(effectiveProj.spend) : (kpi ? $$(kpi.amountSpent) : "—")}
          mv={effectiveProj?.spend != null ? c$$(effectiveProj.spend) : (kpi ? c$$(kpi.amountSpent) : "—")}
          cur={effectiveProj?.spend ?? kpi?.amountSpent ?? 0} prv={showMoM ? prev.amountSpent : undefined} hib={false}
          actual={effectiveProj?.spend != null && kpi ? $$(kpi.amountSpent) : undefined}
          ma={effectiveProj?.spend != null && kpi ? c$$(kpi.amountSpent) : undefined}
          dod={isToday ? dodPct(kpi?.amountSpent ?? 0, yesterdayRow?.amountSpent) : undefined}
          avgDaily={isToday && ytdAvg ? `$${fAvg(ytdAvg.spend)}` : undefined} />
        <MetricCard label="Impressions"
          value={effectiveProj?.impressions != null ? num(effectiveProj.impressions) : (kpi ? num(kpi.impressions) : "—")}
          mv={effectiveProj?.impressions != null ? cnum(effectiveProj.impressions) : (kpi ? cnum(kpi.impressions) : "—")}
          cur={effectiveProj?.impressions ?? kpi?.impressions ?? 0} prv={showMoM ? prev.impressions : undefined} hib={true}
          actual={effectiveProj?.impressions != null && kpi ? num(kpi.impressions) : undefined}
          ma={effectiveProj?.impressions != null && kpi ? cnum(kpi.impressions) : undefined}
          dod={isToday ? dodPct(kpi?.impressions ?? 0, yesterdayRow?.impressions) : undefined}
          avgDaily={isToday && ytdAvg ? fAvg(ytdAvg.impressions) : undefined} />
        <MetricCard label="CPM" value={kpi ? $$(kpi.cpm) : "—"} mv={kpi ? c$$(kpi.cpm) : "—"} cur={kpi?.cpm ?? 0} prv={undefined} hib={false} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Unique Clicks"
          value={effectiveProj?.uniqueClicks != null ? num(effectiveProj.uniqueClicks) : (kpi ? num(kpi.uniqueClicks) : "—")}
          mv={effectiveProj?.uniqueClicks != null ? cnum(effectiveProj.uniqueClicks) : (kpi ? cnum(kpi.uniqueClicks) : "—")}
          cur={effectiveProj?.uniqueClicks ?? kpi?.uniqueClicks ?? 0} prv={showMoM ? prev.uniqueClicks : undefined} hib={true}
          actual={effectiveProj?.uniqueClicks != null && kpi ? num(kpi.uniqueClicks) : undefined}
          ma={effectiveProj?.uniqueClicks != null && kpi ? cnum(kpi.uniqueClicks) : undefined}
          dod={isToday ? dodPct(kpi?.uniqueClicks ?? 0, yesterdayRow?.uniqueClicks) : undefined}
          avgDaily={isToday && ytdAvg ? fAvg(ytdAvg.uniqueClicks) : undefined} />
        <MetricCard label="Unique CTR"  value={kpi ? pct(kpi.ctr)         : "—"} cur={kpi?.ctr          ?? 0} prv={showMoM ? prev.ctr : undefined}          hib={true}  />
        <MetricCard label="$ Per Click" value={kpi ? $$(kpi.costPerClick) : "—"} mv={kpi ? c$$(kpi.costPerClick) : "—"} cur={kpi?.costPerClick ?? 0} prv={showMoM ? prev.costPerClick : undefined} hib={false} />
      </div>

      {/* ── Row 2: Leads ── */}
      <SectionLabel label="Lead Generation" color="#8b5cf6" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Leads"
          value={effectiveProj?.leads != null ? num(effectiveProj.leads) : (kpi ? num(kpi.leads) : "—")}
          mv={effectiveProj?.leads != null ? cnum(effectiveProj.leads) : (kpi ? cnum(kpi.leads) : "—")}
          cur={effectiveProj?.leads ?? kpi?.leads ?? 0} prv={showMoM ? prev.leads : undefined} hib={true}
          actual={effectiveProj?.leads != null && kpi ? num(kpi.leads) : undefined}
          ma={effectiveProj?.leads != null && kpi ? cnum(kpi.leads) : undefined}
          dod={isToday ? dodPct(kpi?.leads ?? 0, yesterdayRow?.leads) : undefined}
          avgDaily={isToday && ytdAvg ? fAvg(ytdAvg.leads) : undefined} />
        <MetricCard label="Opt-In Conv %"  value={kpi ? pct(kpi.leadConv)    : "—"} cur={kpi?.leadConv    ?? 0} prv={showMoM ? prev.optInConv : undefined}   hib={true}  />
        <MetricCard label="Cost Per Lead"  value={kpi ? $$(kpi.costPerLead)  : "—"} mv={kpi ? c$$(kpi.costPerLead) : "—"} cur={kpi?.costPerLead  ?? 0} prv={showMoM ? prev.costPerLead : undefined}  hib={false} />
      </div>

      {/* ── Row 3: Apps ── */}
      <SectionLabel label="Applications" color="#06b6d4" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Total Apps"
          value={effectiveProj?.apps != null ? num(effectiveProj.apps) : (kpi ? num(kpi.apps) : "—")}
          mv={effectiveProj?.apps != null ? cnum(effectiveProj.apps) : (kpi ? cnum(kpi.apps) : "—")}
          cur={effectiveProj?.apps ?? kpi?.apps ?? 0} prv={showMoM ? prev.apps : undefined} hib={true}
          actual={effectiveProj?.apps != null && kpi ? num(kpi.apps) : undefined}
          ma={effectiveProj?.apps != null && kpi ? cnum(kpi.apps) : undefined} />
        <MetricCard label="App Conv %"   value={kpi ? pct(kpi.appConv)    : "—"} cur={kpi?.appConv    ?? 0} prv={showMoM ? prev.appConv : undefined}    hib={true}  />
        <MetricCard label="Cost Per App" value={kpi ? $$(kpi.costPerApp)  : "—"} mv={kpi ? c$$(kpi.costPerApp) : "—"} cur={kpi?.costPerApp  ?? 0} prv={showMoM ? prev.costPerApp : undefined}  hib={false} />
      </div>

      {/* ── Row 4: Booked Calls ── */}
      <SectionLabel label="Booked Calls" color="#22c55e" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Booked Calls"
          value={effectiveProj?.bookedCalls != null ? num(effectiveProj.bookedCalls) : (kpi ? num(kpi.bookedCalls) : "—")}
          mv={effectiveProj?.bookedCalls != null ? cnum(effectiveProj.bookedCalls) : (kpi ? cnum(kpi.bookedCalls) : "—")}
          cur={effectiveProj?.bookedCalls ?? kpi?.bookedCalls ?? 0} prv={showMoM ? prev.bookedCalls : undefined} hib={true}
          actual={effectiveProj?.bookedCalls != null && kpi ? num(kpi.bookedCalls) : undefined}
          ma={effectiveProj?.bookedCalls != null && kpi ? cnum(kpi.bookedCalls) : undefined}
          dod={isToday ? dodPct(kpi?.bookedCalls ?? 0, yesterdayRow?.bookedCalls) : undefined}
          avgDaily={isToday && ytdAvg ? fAvg(ytdAvg.bookedCalls) : undefined} />
        <MetricCard label="Lead-to-Booked"      value={kpi ? pct(kpi.bookedConv)    : "—"} cur={kpi?.bookedConv    ?? 0} prv={showMoM ? prev.leadToBooked : undefined}  hib={true}  />
        <MetricCard label="Cost Per Booked"     value={kpi ? $$(kpi.costPerBooked)  : "—"} mv={kpi ? c$$(kpi.costPerBooked) : "—"} cur={kpi?.costPerBooked  ?? 0} prv={showMoM ? prev.costPerBooked : undefined} hib={false} />
      </div>

      {/* ── Row 5: Taken Calls ── */}
      <SectionLabel label="Taken Calls" color="#f59e0b" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Taken Calls"
          value={effectiveProj?.takenCalls != null ? num(effectiveProj.takenCalls) : (kpi ? num(kpi.takenCalls) : "—")}
          mv={effectiveProj?.takenCalls != null ? cnum(effectiveProj.takenCalls) : (kpi ? cnum(kpi.takenCalls) : "—")}
          cur={effectiveProj?.takenCalls ?? kpi?.takenCalls ?? 0} prv={showMoM ? prev.takenCalls : undefined} hib={true}
          actual={effectiveProj?.takenCalls != null && kpi ? num(kpi.takenCalls) : undefined}
          ma={effectiveProj?.takenCalls != null && kpi ? cnum(kpi.takenCalls) : undefined}
          dod={isToday ? dodPct(kpi?.takenCalls ?? 0, yesterdayRow?.takenCalls) : undefined}
          avgDaily={isToday && ytdAvg ? fAvg(ytdAvg.takenCalls) : undefined} />
        <MetricCard label="Show-Up Rate"    value={kpi ? pct(kpi.showUpRate)   : "—"} cur={kpi?.showUpRate   ?? 0} prv={showMoM ? prev.showUpRate : undefined}   hib={true}  />
        <MetricCard label="Cost Per Taken"  value={kpi ? $$(kpi.costPerTaken)  : "—"} mv={kpi ? c$$(kpi.costPerTaken) : "—"} cur={kpi?.costPerTaken  ?? 0} prv={showMoM ? prev.costPerTaken : undefined} hib={false} />
      </div>

      {/* ── Row 6: Deals ── */}
      <SectionLabel label="Deals" color="#ef4444" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Deals Closed"
          value={effectiveProj?.dealsClosed != null ? num(effectiveProj.dealsClosed) : (kpi ? num(kpi.dealsClosed) : "—")}
          mv={effectiveProj?.dealsClosed != null ? cnum(effectiveProj.dealsClosed) : (kpi ? cnum(kpi.dealsClosed) : "—")}
          cur={effectiveProj?.dealsClosed ?? kpi?.dealsClosed ?? 0} prv={showMoM ? prev.dealsClosed : undefined} hib={true}
          actual={effectiveProj?.dealsClosed != null && kpi ? num(kpi.dealsClosed) : undefined}
          ma={effectiveProj?.dealsClosed != null && kpi ? cnum(kpi.dealsClosed) : undefined}
          dod={isToday ? dodPct(kpi?.dealsClosed ?? 0, yesterdayRow?.dealsClosed) : undefined}
          avgDaily={isToday && ytdAvg ? fAvg(ytdAvg.dealsClosed) : undefined} />
        <MetricCard label="Close Rate"  value={kpi ? pct(kpi.closeRate) : "—"} cur={kpi?.closeRate ?? 0} prv={showMoM ? prev.closeRate : undefined} hib={true}  />
        <MetricCard label="Cost/Acq"    value={kpi ? $$(kpi.cpa)       : "—"} mv={kpi ? c$$(kpi.cpa) : "—"} cur={kpi?.cpa       ?? 0} prv={showMoM ? prev.cpa : undefined}       hib={false} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(() => {
          const cashRevRatio = kpi && kpi.revenue > 0 ? kpi.cash / kpi.revenue : 0;
          const prevCashRevRatio = prev.cash != null && prev.revenue != null && prev.revenue > 0
            ? prev.cash / prev.revenue : undefined;
          return (<>
            <MetricCard label="Cash"    value={kpi ? $$(kpi.cash)    : "—"} mv={kpi ? c$$(kpi.cash)    : "—"} cur={kpi?.cash    ?? 0} prv={showMoM ? prev.cash : undefined}    hib={true}
              dod={isToday ? dodPct(kpi?.cash ?? 0, yesterdayRow?.cash) : undefined}
              avgDaily={isToday && ytdAvg ? `$${fAvg(ytdAvg.cash)}` : undefined} />
            <MetricCard label="Revenue" value={kpi ? $$(kpi.revenue) : "—"} mv={kpi ? c$$(kpi.revenue) : "—"} cur={kpi?.revenue ?? 0} prv={showMoM ? prev.revenue : undefined} hib={true}
              dod={isToday ? dodPct(kpi?.revenue ?? 0, yesterdayRow?.revenue) : undefined}
              avgDaily={isToday && ytdAvg ? `$${fAvg(ytdAvg.revenue)}` : undefined} />
            <MetricCard label="Cash:Rev" value={cashRevRatio > 0 ? `${cashRevRatio.toFixed(2)}x` : "—"} cur={cashRevRatio} prv={prevCashRevRatio} hib={true} />
          </>);
        })()}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(() => {
          const cashROAS = kpi && kpi.cashROAS > 0 ? kpi.cashROAS
            : (kpi && kpi.amountSpent > 0 ? kpi.cash / kpi.amountSpent : 0);
          const revROAS  = kpi && kpi.revenueROAS > 0 ? kpi.revenueROAS
            : (kpi && kpi.amountSpent > 0 ? kpi.revenue / kpi.amountSpent : 0);
          return (<>
            <MetricCard label="Cash ROAS"    value={cashROAS > 0 ? `${cashROAS.toFixed(2)}x`    : "—"} cur={cashROAS}    prv={showMoM ? prev.cashROAS : undefined}    hib={true} />
            <MetricCard label="Revenue ROAS" value={revROAS  > 0 ? `${revROAS.toFixed(2)}x`     : "—"} cur={revROAS}     prv={showMoM ? prev.revenueROAS : undefined} hib={true} />
          </>);
        })()}
      </div>

      {/* ── Sparklines ── */}
      <div style={{ marginTop: 8 }}>
        <SectionLabel label="Daily Trends" color="#3b82f6" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SparkCard label="Leads" monthName={monthName} curData={dailyRows.map((r) => r.leads)}
          monthIdx={monthIdx} year={year} color="#8b5cf6" formatter={num}
          curTotal={kpi?.leads ?? 0} prv={showMoM ? prev.leads : undefined} />
        <SparkCard label="Booked Calls" monthName={monthName} curData={dailyRows.map((r) => r.bookedCalls)}
          monthIdx={monthIdx} year={year} color="#22c55e" formatter={num}
          curTotal={kpi?.bookedCalls ?? 0} prv={showMoM ? prev.bookedCalls : undefined} />
        <SparkCard label="Taken Calls" monthName={monthName} curData={dailyRows.map((r) => r.takenCalls)}
          monthIdx={monthIdx} year={year} color="#f59e0b" formatter={num}
          curTotal={kpi?.takenCalls ?? 0} prv={showMoM ? prev.takenCalls : undefined} />
        <SparkCard label="Deals Closed" monthName={monthName} curData={dailyRows.map((r) => r.dealsClosed)}
          monthIdx={monthIdx} year={year} color="#ef4444" formatter={num}
          curTotal={kpi?.dealsClosed ?? 0} prv={showMoM ? prev.dealsClosed : undefined} />
      </div>

    </div>
  );
}
