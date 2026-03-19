"use client";

import { useState, useCallback } from "react";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, MousePointerClick, Eye, Send } from "lucide-react";
import type { EmailData, EmailMonthlyRow, EmailCampaign } from "@/lib/sheets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

type SortDir = "asc" | "desc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortRows<T>(arr: T[], key: keyof T, dir: SortDir): T[] {
  return [...arr].sort((a, b) => {
    const av = a[key] as any, bv = b[key] as any;
    if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

// ─── Sortable TH ──────────────────────────────────────────────────────────────

function Th({ label, col, activeCol, dir, onSort }: {
  label: string; col: string; activeCol: string | null; dir: SortDir; onSort: (c: string) => void;
}) {
  const active = col === activeCol;
  return (
    <th
      className="text-left py-2 pr-4 text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
      style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
      onClick={() => onSort(col)}
    >
      {label}{" "}
      <span style={{ opacity: active ? 1 : 0.35, fontSize: 10 }}>
        {active ? (dir === "desc" ? "↓" : "↑") : "↕"}
      </span>
    </th>
  );
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

interface ChartSeries { label: string; color: string; values: number[]; }

function LineChart({
  series, xLabels, formatY = (v) => fmtNum(v), height = 130,
}: {
  series: ChartSeries[]; xLabels: string[]; formatY?: (v: number) => string; height?: number;
}) {
  const VW = 520, VH = height;
  const pad = { t: 16, r: 12, b: 28, l: 52 };
  const iW = VW - pad.l - pad.r;
  const iH = VH - pad.t - pad.b;
  const n = xLabels.length;

  const allVals = series.flatMap((s) => s.values).filter((v) => v > 0);
  const maxV = allVals.length > 0 ? Math.max(...allVals) * 1.05 : 1;

  const xs = (i: number) => pad.l + (n <= 1 ? iW / 2 : (i / (n - 1)) * iW);
  const ys = (v: number) => pad.t + iH - (v / maxV) * iH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: maxV * f, y: ys(maxV * f) }));

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {yTicks.map(({ v, y }, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y} x2={VW - pad.r} y2={y}
            stroke="#1e293b" strokeWidth={1} />
          <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize={9}
            style={{ fill: "#64748b" }}>
            {formatY(v)}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xLabels.map((label, i) => (
        <text key={i} x={xs(i)} y={VH - 4} textAnchor="middle" fontSize={9}
          style={{ fill: "#64748b" }}>
          {label.slice(0, 3)}
        </text>
      ))}

      {/* Series */}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => [xs(i), ys(v)] as [number, number]);
        const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");
        const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${ys(0)} L ${pts[0][0]},${ys(0)} Z`;

        return (
          <g key={si}>
            <path d={areaPath} fill={s.color} opacity={0.08} />
            <path d={linePath} fill="none" stroke={s.color} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" />
            {pts.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={3.5} fill={s.color}
                stroke="#0f172a" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: "up" | "down" | null;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" && <TrendingUp size={11} style={{ color: "#22c55e" }} />}
          {trend === "down" && <TrendingDown size={11} style={{ color: "#ef4444" }} />}
          <span className="text-xs" style={{ color: trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "var(--muted-foreground)" }}>
            {sub}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Monthly Table (sortable) ─────────────────────────────────────────────────

type MonthKey = keyof Omit<EmailMonthlyRow, "month">;

function MonthlyTable({ monthly, yearlyAvg }: { monthly: EmailMonthlyRow[]; yearlyAvg: EmailMonthlyRow | null }) {
  const [sortCol, setSortCol] = useState<MonthKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = (col: string) => {
    const k = col as MonthKey;
    if (sortCol === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(k); setSortDir("desc"); }
  };

  const filled = monthly.filter((m) => m.delivered > 0);
  const sorted: EmailMonthlyRow[] = sortCol ? sortRows(filled, sortCol, sortDir) : filled;
  const rows: Array<EmailMonthlyRow & { _isAvg?: true }> = yearlyAvg
    ? [...sorted, { ...yearlyAvg, _isAvg: true }]
    : sorted;

  if (filled.length === 0) return null;

  const thProps = { activeCol: sortCol, dir: sortDir, onSort };

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>Monthly Performance</p>
      <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>2026 email metrics by month · click headers to sort</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Month</th>
              <Th label="Delivered" col="delivered" {...thProps} />
              <Th label="Opens" col="opens" {...thProps} />
              <Th label="Open %" col="openPct" {...thProps} />
              <Th label="Clicks" col="clicks" {...thProps} />
              <Th label="CTR %" col="ctrPct" {...thProps} />
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const isAvg = !!m._isAvg;
              const openColor = m.openPct >= 80 ? "#22c55e" : m.openPct >= 65 ? "#f59e0b" : "#ef4444";
              const ctrColor  = m.ctrPct >= 1  ? "#22c55e" : m.ctrPct  >= 0.5 ? "#f59e0b" : "#ef4444";
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: isAvg ? "rgba(239,68,68,0.04)" : undefined }}>
                  <td className="py-2.5 pr-4 font-medium whitespace-nowrap" style={{ color: isAvg ? "#ef4444" : "var(--foreground)" }}>{m.month}</td>
                  <td className="py-2.5 pr-4 font-semibold" style={{ color: "#22c55e" }}>{m.delivered ? fmtNum(m.delivered) : "—"}</td>
                  <td className="py-2.5 pr-4" style={{ color: "var(--foreground)" }}>{m.opens ? fmtNum(m.opens) : "—"}</td>
                  <td className="py-2.5 pr-4 font-semibold" style={{ color: m.openPct ? openColor : "var(--muted-foreground)" }}>
                    {m.openPct ? `${m.openPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2.5 pr-4" style={{ color: "var(--foreground)" }}>{m.clicks || "—"}</td>
                  <td className="py-2.5 pr-4 font-semibold" style={{ color: m.ctrPct ? ctrColor : "var(--muted-foreground)" }}>
                    {m.ctrPct ? `${m.ctrPct.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Campaigns Log (sortable) ─────────────────────────────────────────────────

type CampaignKey = keyof EmailCampaign;

function CampaignsLog({ campaigns }: { campaigns: EmailCampaign[] }) {
  const [sortCol, setSortCol] = useState<CampaignKey>("openPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = (col: string) => {
    const k = col as CampaignKey;
    if (sortCol === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(k); setSortDir("desc"); }
  };

  const sorted: EmailCampaign[] = sortRows(campaigns, sortCol, sortDir);
  const thProps = { activeCol: sortCol, dir: sortDir, onSort };

  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <Mail size={28} className="mx-auto mb-3" style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
        <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>No individual campaigns detected</p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Individual email rows will appear here when the sheet includes per-campaign data rows below the monthly summary.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>
        Campaign Log — {campaigns.length} emails
      </p>
      <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Individual campaign performance · click headers to sort</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <Th label="Subject" col="subject" {...thProps} />
              <Th label="Delivered" col="delivered" {...thProps} />
              <Th label="Opens" col="opens" {...thProps} />
              <Th label="Open %" col="openPct" {...thProps} />
              <Th label="Clicks" col="clicks" {...thProps} />
              <Th label="CTR %" col="ctrPct" {...thProps} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const openColor = c.openPct >= 80 ? "#22c55e" : c.openPct >= 65 ? "#f59e0b" : "#ef4444";
              const ctrColor  = c.ctrPct >= 1 ? "#22c55e" : c.ctrPct >= 0.5 ? "#f59e0b" : "#ef4444";
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2.5 pr-4" style={{ color: "var(--foreground)", maxWidth: 300 }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {c.subject || "—"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-semibold" style={{ color: "#22c55e" }}>{fmtNum(c.delivered)}</td>
                  <td className="py-2.5 pr-4" style={{ color: "var(--foreground)" }}>{fmtNum(c.opens)}</td>
                  <td className="py-2.5 pr-4 font-semibold" style={{ color: openColor }}>{c.openPct.toFixed(1)}%</td>
                  <td className="py-2.5 pr-4" style={{ color: "var(--foreground)" }}>{c.clicks}</td>
                  <td className="py-2.5 pr-4 font-semibold" style={{ color: ctrColor }}>{c.ctrPct.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface Props {
  initialData: EmailData;
  initialError: boolean;
  serverFetchedAt: string;
}

type RefreshState = "idle" | "loading" | "success" | "error";

export function EmailDashboard({ initialData, initialError, serverFetchedAt }: Props) {
  const [data, setData]         = useState<EmailData>(initialData);
  const [hasError, setHasError] = useState(initialError);
  const [fetchedAt, setFetchedAt] = useState(serverFetchedAt);
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");

  const refresh = useCallback(async () => {
    setRefreshState("loading");
    try {
      const res  = await fetch("/api/email/refresh");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json.data);
      setFetchedAt(json.fetchedAt);
      setHasError(false);
      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 2500);
    } catch {
      setHasError(true);
      setRefreshState("error");
      setTimeout(() => setRefreshState("idle"), 3000);
    }
  }, []);

  const { monthly, campaigns, yearlyAvg } = data;
  const filled  = monthly.filter((m) => m.delivered > 0);
  const latest  = filled[filled.length - 1];
  const prev    = filled[filled.length - 2];

  const ytdDelivered = filled.reduce((s, m) => s + m.delivered, 0);
  const ytdOpens     = filled.reduce((s, m) => s + m.opens, 0);
  const ytdClicks    = filled.reduce((s, m) => s + m.clicks, 0);
  const avgOpenPct   = yearlyAvg?.openPct ?? (filled.length > 0 ? filled.reduce((s, m) => s + m.openPct, 0) / filled.length : 0);
  const avgCtrPct    = yearlyAvg?.ctrPct  ?? (filled.length > 0 ? filled.reduce((s, m) => s + m.ctrPct, 0)  / filled.length : 0);

  // Chart data — only months with data
  const chartLabels = filled.map((m) => m.month);
  const volumeSeries: ChartSeries[] = [
    { label: "Delivered", color: "#22c55e", values: filled.map((m) => m.delivered) },
    { label: "Opens",     color: "#3b82f6", values: filled.map((m) => m.opens) },
  ];
  const clickSeries: ChartSeries[] = [
    { label: "Clicks", color: "#f59e0b", values: filled.map((m) => m.clicks) },
  ];
  const rateSeries: ChartSeries[] = [
    { label: "Open %", color: "#3b82f6", values: filled.map((m) => m.openPct) },
    { label: "CTR %",  color: "#f59e0b", values: filled.map((m) => m.ctrPct) },
  ];

  const momOpenPct = latest && prev && prev.openPct
    ? ((latest.openPct - prev.openPct) / prev.openPct * 100).toFixed(0)
    : null;
  const momCtrPct = latest && prev && prev.ctrPct
    ? ((latest.ctrPct - prev.ctrPct) / prev.ctrPct * 100).toFixed(0)
    : null;

  return (
    <>
      {/* Error banner */}
      {hasError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
          <AlertCircle size={16} />
          <span>Could not load email sheet data. Check that the CSV URL is still published.</span>
        </div>
      )}

      {/* Header: sync + refresh */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {refreshState === "success" ? (
            <><CheckCircle2 size={13} style={{ color: "#22c55e" }} /><span style={{ color: "#22c55e" }}>Updated just now</span></>
          ) : (
            <span>Last synced: {timeAgo(fetchedAt)}</span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshState === "loading"}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg hover:opacity-80 active:scale-95 disabled:opacity-50"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          <RefreshCw size={12} style={{ animation: refreshState === "loading" ? "spin 0.6s linear infinite" : undefined }} />
          {refreshState === "loading" ? "Syncing…" : "Refresh from Sheet"}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KPI label="YTD Delivered" value={fmtNum(ytdDelivered)} />
        <KPI label="YTD Opens" value={fmtNum(ytdOpens)} />
        <KPI
          label={`Avg Open %${latest ? ` · ${latest.month}` : ""}`}
          value={`${avgOpenPct.toFixed(1)}%`}
          sub={momOpenPct ? `${Number(momOpenPct) >= 0 ? "+" : ""}${momOpenPct}% vs last month` : undefined}
          trend={momOpenPct ? (Number(momOpenPct) >= 0 ? "up" : "down") : null}
        />
        <KPI label="YTD Clicks" value={fmtNum(ytdClicks)} />
        <KPI
          label={`Avg CTR${latest ? ` · ${latest.month}` : ""}`}
          value={`${avgCtrPct.toFixed(2)}%`}
          sub={momCtrPct ? `${Number(momCtrPct) >= 0 ? "+" : ""}${momCtrPct}% vs last month` : undefined}
          trend={momCtrPct ? (Number(momCtrPct) >= 0 ? "up" : "down") : null}
        />
      </div>

      {/* Line charts */}
      {filled.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Delivered + Opens */}
          <div className="lg:col-span-2 rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>Volume — Delivered &amp; Opens</p>
            <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Emails delivered vs opened by month</p>
            <LineChart series={volumeSeries} xLabels={chartLabels} height={130} />
            <div className="flex gap-5 mt-2">
              {volumeSeries.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div style={{ width: 12, height: 2.5, background: s.color, borderRadius: 2 }} />
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clicks */}
          <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>Clicks</p>
            <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Total link clicks per month</p>
            <LineChart series={clickSeries} xLabels={chartLabels} height={130} />
          </div>

          {/* Open % + CTR % */}
          <div className="lg:col-span-3 rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>Engagement Rates</p>
            <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Open rate and click-through rate by month</p>
            <LineChart
              series={rateSeries}
              xLabels={chartLabels}
              formatY={(v) => `${v.toFixed(1)}%`}
              height={110}
            />
            <div className="flex gap-5 mt-2">
              {rateSeries.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div style={{ width: 12, height: 2.5, background: s.color, borderRadius: 2 }} />
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly table */}
      <div className="mb-5">
        <MonthlyTable monthly={monthly} yearlyAvg={yearlyAvg} />
      </div>

      {/* Campaign log */}
      <CampaignsLog campaigns={campaigns} />

      {/* Empty state */}
      {!hasError && filled.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}>
          <AlertCircle size={16} />
          <span>Sheet loaded but no monthly data found. Ensure the CSV URL points to the correct tab.</span>
        </div>
      )}
    </>
  );
}
