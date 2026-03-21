"use client";

import { type ScoreboardRow, type MonthlyRow, type YTDRow } from "@/lib/funnel";

// ─── Formatters ───────────────────────────────────────────────────────────────
const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => (n === 0 ? "—" : `${n.toFixed(1)}%`);
const num = (n: number) => (n === 0 ? "—" : n.toLocaleString("en-US"));
const ratio = (n: number) => (n === 0 ? "—" : `${n.toFixed(2)}x`);

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const ABBRS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mom(cur: number, prv: number): number | null {
  if (!prv || !cur) return null;
  return ((cur - prv) / prv) * 100;
}

function MomBadge({ cur, prv, hib = true }: { cur: number; prv: number; hib?: boolean }) {
  const d = mom(cur, prv);
  if (d === null) return null;
  const good = hib ? d >= 0 : d <= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: good ? "#4ade80" : "#f87171" }}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({
  cur,
  prv,
  curLabel,
  prvLabel,
  color,
}: {
  cur: number[];
  prv?: number[];
  curLabel: string;
  prvLabel?: string;
  color: string;
}) {
  const W = 300;
  const H = 80;
  const pad = 6;

  function points(data: number[]) {
    const valid = data.map((v) => (isNaN(v) ? 0 : v));
    const max = Math.max(...valid, 0.001);
    const min = 0;
    const range = max - min || 1;
    return valid.map((v, i) => {
      const x = pad + (i / Math.max(valid.length - 1, 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return [x, y] as [number, number];
    });
  }

  const curPts = cur.length >= 2 ? points(cur) : [];
  const prvPts = prv && prv.length >= 2 ? points(prv) : [];

  const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(" ");

  // x-axis labels: show ~5 labels
  const labelCount = Math.min(cur.length, 5);
  const step = Math.max(1, Math.floor(cur.length / (labelCount - 1)));
  const xLabels: number[] = [];
  for (let i = 0; i < cur.length; i += step) xLabels.push(i);
  if (xLabels[xLabels.length - 1] !== cur.length - 1) xLabels.push(cur.length - 1);

  return (
    <div>
      {cur.length >= 2 ? (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }} preserveAspectRatio="none">
          {/* Grid lines */}
          {[0.33, 0.66].map((t) => (
            <line key={t} x1={pad} x2={W - pad}
              y1={pad + (1 - t) * (H - pad * 2)} y2={pad + (1 - t) * (H - pad * 2)}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
          {/* Previous period (dim) */}
          {prvPts.length >= 2 && (
            <polyline points={poly(prvPts)} fill="none" stroke={color} strokeWidth="1.5"
              strokeOpacity="0.3" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 2" />
          )}
          {/* Current period */}
          {curPts.length >= 2 && (
            <>
              <polygon
                points={[`${curPts[0][0]},${H - pad}`, ...curPts.map(([x, y]) => `${x},${y}`), `${curPts[curPts.length - 1][0]},${H - pad}`].join(" ")}
                fill={`${color}18`} />
              <polyline points={poly(curPts)} fill="none" stroke={color} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
              {curPts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
              ))}
            </>
          )}
        </svg>
      ) : (
        <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#334155", fontSize: 11 }}>no data</span>
        </div>
      )}

      {/* X-axis day labels */}
      {cur.length >= 2 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 6px 0", marginTop: 2 }}>
          {xLabels.map((i) => (
            <span key={i} style={{ color: "#475569", fontSize: 9 }}>{i + 1}</span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {prvLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, opacity: 0.35, display: "inline-block" }} />
            <span style={{ color: "#64748b", fontSize: 10 }}>{prvLabel}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
          <span style={{ color: "#94a3b8", fontSize: 10 }}>{curLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Hero card ────────────────────────────────────────────────────────────────
function HeroCard({ label, value, sub, bg, cur, prv, hib = true }: {
  label: string; value: string; sub?: string; bg: string;
  cur?: number; prv?: number; hib?: boolean;
}) {
  return (
    <div className="rounded-2xl flex flex-col justify-between p-6" style={{ background: bg, minHeight: 170 }}>
      <div>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17, fontWeight: 600 }}>{label}</p>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>Month to date</p>
      </div>
      <div>
        <p style={{ color: "#ffffff", fontSize: 42, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>{value}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {sub && <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>{sub}</span>}
          {cur != null && prv != null && <MomBadge cur={cur} prv={prv} hib={hib} />}
        </div>
      </div>
    </div>
  );
}

// ─── Small tile ───────────────────────────────────────────────────────────────
const TILE_BG = "#0d1525";

function Tile({ label, value, cur, prv, hib = true }: {
  label: string; value: string; cur?: number; prv?: number; hib?: boolean;
}) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center gap-1 p-4 text-center"
      style={{ background: TILE_BG, minHeight: 110 }}>
      <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{label}</p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Month to date</p>
      <p style={{ color: "#ffffff", fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{value}</p>
      {cur != null && prv != null && <MomBadge cur={cur} prv={prv} hib={hib} />}
    </div>
  );
}

// ─── Trend card (sparkline) ───────────────────────────────────────────────────
function TrendCard({ label, curData, prvData, curLabel, prvLabel, color }: {
  label: string; curData: number[]; prvData?: number[];
  curLabel: string; prvLabel?: string; color: string;
}) {
  const trimmed = [...curData];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === 0) trimmed.pop();

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: TILE_BG, minHeight: 220 }}>
      <div>
        <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{label}</p>
        <p style={{ color: "#64748b", fontSize: 11 }}>Month to date</p>
      </div>
      <Sparkline cur={trimmed} prv={prvData} curLabel={curLabel} prvLabel={prvLabel} color={color} />
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
  // Current month KPI from 30-day rollup
  const kpi = monthly.find((r) => r.period === "30 Days") ?? monthly.find((r) => r.isRollup) ?? null;
  const dailyRows = monthly.filter((r) => !r.isRollup);

  // Previous month lookup
  const [abbr] = monthLabel.split(" ");
  const curMonthIdx = ABBRS.indexOf(abbr?.toUpperCase() ?? "");
  const prevMonthIdx = curMonthIdx > 0 ? curMonthIdx - 1 : -1;
  const prevMonthName = prevMonthIdx >= 0 ? MONTH_NAMES[prevMonthIdx] : null;
  const prevMonthAbbr = prevMonthIdx >= 0 ? ABBRS[prevMonthIdx] : null;

  const prevYTD = prevMonthName
    ? ytd.find((r) => r.month.toLowerCase() === prevMonthName.toLowerCase()) ?? null
    : null;

  const cashPerCall = kpi && kpi.takenCalls > 0 ? kpi.cash / kpi.takenCalls : 0;
  const prevCashPerCall = prevYTD && prevYTD.takenCalls > 0 ? prevYTD.cash / prevYTD.takenCalls : 0;

  // Daily sparkline arrays
  const dailyLeads   = dailyRows.map((r) => r.leads);
  const dailyBooked  = dailyRows.map((r) => r.bookedCalls);
  const dailyTaken   = dailyRows.map((r) => r.takenCalls);
  const dailyCash    = dailyRows.map((r) => r.cash);
  const dailyClosed  = dailyRows.map((r) => r.dealsClosed);

  // Labels for sparkline legend
  const curLabel = monthLabel || "Current";
  const prvLabel = prevMonthAbbr ?? undefined;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Row 1: 4 hero cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <HeroCard label="Taken Calls"    value={kpi ? num(kpi.takenCalls) : "—"}
          sub={kpi ? `Show-up: ${pct(kpi.showUpRate)}` : undefined}
          bg="#0f2044" cur={kpi?.takenCalls} prv={prevYTD?.takenCalls ?? 0} />
        <HeroCard label="$ Per Call"     value={kpi ? $$(cashPerCall) : "—"}
          sub={kpi ? `Cash: ${$$(kpi.cash)}` : undefined}
          bg="#92400e" cur={cashPerCall} prv={prevCashPerCall} />
        <HeroCard label="Show-Up Rate"   value={kpi ? pct(kpi.showUpRate) : "—"}
          sub={kpi ? `${num(kpi.takenCalls)} of ${num(kpi.bookedCalls)} booked` : undefined}
          bg="#7f1d1d" cur={kpi?.showUpRate} prv={prevYTD?.showUpRate ?? 0} />
        <HeroCard label="Cash Collected" value={kpi ? $$(kpi.cash) : "—"}
          sub={kpi ? `Revenue: ${$$(kpi.revenue)}` : undefined}
          bg="#14532d" cur={kpi?.cash} prv={prevYTD?.cash ?? 0} />
      </div>

      {/* ── Row 2: 8 small tiles ── */}
      <div className="grid grid-cols-8 gap-3">
        <Tile label="New Leads"    value={kpi ? num(kpi.leads) : "—"}       cur={kpi?.leads}       prv={prevYTD?.leads ?? 0} />
        <Tile label="Booked Calls" value={kpi ? num(kpi.bookedCalls) : "—"} cur={kpi?.bookedCalls} prv={prevYTD?.bookedCalls ?? 0} />
        <Tile label="Deals Closed" value={kpi ? num(kpi.dealsClosed) : "—"} cur={kpi?.dealsClosed} prv={prevYTD?.dealsClosed ?? 0} />
        <Tile label="Amount Spent" value={kpi ? $$(kpi.amountSpent) : "—"}  cur={kpi?.amountSpent} prv={prevYTD?.amountSpent ?? 0} hib={false} />
        <Tile label="Taken Calls"  value={kpi ? num(kpi.takenCalls) : "—"}  cur={kpi?.takenCalls}  prv={prevYTD?.takenCalls ?? 0} />
        <Tile label="Close Rate"   value={kpi ? pct(kpi.closeRate) : "—"}   cur={kpi?.closeRate}   prv={prevYTD?.closeRate ?? 0} />
        <Tile label="Cash ROAS"    value={kpi ? ratio(kpi.cashROAS) : "—"}   cur={kpi?.cashROAS}    prv={prevYTD?.cashROAS ?? 0} />
        <Tile label="Rev ROAS"     value={kpi ? ratio(kpi.revenueROAS) : "—"} cur={kpi?.revenueROAS} prv={prevYTD?.revenueROAS ?? 0} />
      </div>

      {/* ── Row 3: 4 sparkline trend cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <TrendCard label="New Leads"    curData={dailyLeads}  curLabel={curLabel} prvLabel={prvLabel} color="#d946ef" />
        <TrendCard label="Deals Closed" curData={dailyClosed} curLabel={curLabel} prvLabel={prvLabel} color="#22c55e" />
        <TrendCard label="Taken Calls"  curData={dailyTaken}  curLabel={curLabel} prvLabel={prvLabel} color="#3b82f6" />
        <TrendCard label="Cash Collected" curData={dailyCash} curLabel={curLabel} prvLabel={prvLabel} color="#4ade80" />
      </div>

      {/* ── Row 4: 3 sparkline trend cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <TrendCard label="Booked Calls" curData={dailyBooked} curLabel={curLabel} prvLabel={prvLabel} color="#a78bfa" />
        <TrendCard label="Amount Spent" curData={dailyRows.map((r) => r.amountSpent)} curLabel={curLabel} prvLabel={prvLabel} color="#f87171" />
        <TrendCard label="$ Per Call"   curData={dailyRows.map((r) => r.takenCalls > 0 ? r.cash / r.takenCalls : 0)} curLabel={curLabel} prvLabel={prvLabel} color="#fbbf24" />
      </div>

    </div>
  );
}
