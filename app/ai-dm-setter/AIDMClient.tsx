"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, RefreshCw, TrendingUp, TrendingDown, Minus,
  MessageSquare, Star, Link2, CalendarCheck,
} from "lucide-react";
import { refreshAIDMData } from "./actions";
import type { AIDMDashboardData, DailyMetrics } from "@/lib/ai-dm-fetch";

// ─── Types & constants ─────────────────────────────────────────────────────────

type Window = 1 | 4 | 7 | 14 | 30;
const WINDOWS: Window[] = [1, 4, 7, 14, 30];
const WINDOW_LABELS: Record<Window, string> = { 1: "TODAY", 4: "4D", 7: "7D", 14: "14D", 30: "30D" };

type Metric = "conversations" | "qualifiedLeads" | "linksSent" | "bookedCalls";

interface MetricDef {
  key: Metric;
  label: string;
  color: string;
  icon: React.ElementType;
}

const METRICS: MetricDef[] = [
  { key: "conversations",  label: "Conversations",  color: "#3b82f6", icon: MessageSquare },
  { key: "qualifiedLeads", label: "Qualified Leads", color: "#22c55e", icon: Star },
  { key: "linksSent",      label: "Links Sent",      color: "#f59e0b", icon: Link2 },
  { key: "bookedCalls",    label: "Booked Calls",    color: "#a855f7", icon: CalendarCheck },
];

// ─── Rolling window helpers ────────────────────────────────────────────────────

function currSlice(daily: DailyMetrics[], w: Window, today?: string): DailyMetrics[] {
  if (w === 1 && today) return daily.filter(d => d.date === today);
  return daily.slice(Math.max(0, daily.length - w));
}

function prevSlice(daily: DailyMetrics[], w: Window, today?: string): DailyMetrics[] {
  if (w === 1 && today) {
    // "yesterday" for comparison
    const yIdx = daily.findIndex(d => d.date === today) - 1;
    return yIdx >= 0 ? [daily[yIdx]] : [];
  }
  const end = Math.max(0, daily.length - w);
  return daily.slice(Math.max(0, end - w), end);
}

function sumM(slice: DailyMetrics[], key: Metric): number {
  return slice.reduce((acc, d) => acc + d[key], 0);
}

function avgM(slice: DailyMetrics[], key: Metric): number {
  return slice.length ? sumM(slice, key) / slice.length : 0;
}

// ─── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return (
      <div
        style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Not enough data</span>
      </div>
    );
  }

  const W = 200, H = 56, PAD = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i): [number, number] => [
    PAD + (i / (data.length - 1)) * (W - PAD * 2),
    PAD + ((max - v) / range) * (H - PAD * 2),
  ]);

  const polyPts  = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const fillPts  = [
    `${pts[0][0]},${H}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${H}`,
  ].join(" ");

  const gradId = `aidm-grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: H, display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

// ─── Pipeline Funnel ──────────────────────────────────────────────────────────

function buildFunnelPath(vals: number[], W: number, H: number): string {
  const N      = vals.length;
  const maxVal = vals[0] || 1;
  const maxH   = H - 16;
  const minH   = 12;
  const cy     = H / 2;

  const xs     = vals.map((_, i) => ((i + 0.5) / N) * W);
  const getH   = (v: number) => Math.max(minH, (v / maxVal) * maxH);
  const topYs  = vals.map(v => cy - getH(v) / 2);
  const botYs  = vals.map(v => cy + getH(v) / 2);

  // Top edge: left → right with cubic bezier transitions
  let top = `M 0 ${topYs[0]} L ${xs[0]} ${topYs[0]}`;
  for (let i = 0; i < N - 1; i++) {
    const midX = (xs[i] + xs[i + 1]) / 2;
    top += ` C ${midX} ${topYs[i]} ${midX} ${topYs[i + 1]} ${xs[i + 1]} ${topYs[i + 1]}`;
  }
  top += ` L ${W} ${topYs[N - 1]}`;

  // Bottom edge: right → left (mirror)
  let bot = ` L ${W} ${botYs[N - 1]} L ${xs[N - 1]} ${botYs[N - 1]}`;
  for (let i = N - 1; i > 0; i--) {
    const midX = (xs[i] + xs[i - 1]) / 2;
    bot += ` C ${midX} ${botYs[i]} ${midX} ${botYs[i - 1]} ${xs[i - 1]} ${botYs[i - 1]}`;
  }
  bot += ` L 0 ${botYs[0]} Z`;

  return top + bot;
}

function PipelineFunnel({ daily, win, today }: { daily: DailyMetrics[]; win: Window; today: string }) {
  const slice  = currSlice(daily, win, today);
  const totals = {
    conversations:  sumM(slice, "conversations"),
    qualifiedLeads: sumM(slice, "qualifiedLeads"),
    linksSent:      sumM(slice, "linksSent"),
    bookedCalls:    sumM(slice, "bookedCalls"),
  };

  const labels   = ["Convos", "Qualified", "Links Sent", "Booked"];
  const vals     = [totals.conversations, totals.qualifiedLeads, totals.linksSent, totals.bookedCalls];

  const convRate = (a: number, b: number) =>
    b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—";

  // Conversion rate badges between stages (null = no badge for first stage)
  const badges = [
    null,
    convRate(totals.qualifiedLeads, totals.conversations),
    convRate(totals.linksSent,      totals.qualifiedLeads),
    convRate(totals.bookedCalls,    totals.linksSent),
  ];

  const SVG_W = 800;
  const SVG_H = 160;
  const funnelPath = buildFunnelPath(vals, SVG_W, SVG_H);

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Stage headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {labels.map((label, i) => (
          <div
            key={label}
            style={{
              padding: "20px 20px 16px",
              borderRight: i < 3 ? "1px solid var(--border)" : "none",
            }}
          >
            <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ color: "var(--foreground)", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
              {vals[i].toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* SVG funnel stream */}
      <div style={{ position: "relative", borderTop: "1px solid var(--border)" }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: SVG_H, display: "block" }}
        >
          <defs>
            <linearGradient id="funnelFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.50" />
            </linearGradient>
          </defs>

          {/* Stage divider lines */}
          {[1, 2, 3].map(i => (
            <line
              key={i}
              x1={(SVG_W / 4) * i} y1={0}
              x2={(SVG_W / 4) * i} y2={SVG_H}
              stroke="var(--border)"
              strokeWidth="1"
            />
          ))}

          {/* Flowing funnel path */}
          <path d={funnelPath} fill="url(#funnelFill)" />
        </svg>

        {/* Conversion rate badges — centered on each divider line */}
        {badges.map((badge, i) =>
          badge === null ? null : (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${(i / 4) * 100}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <span
                style={{
                  background: "rgba(10,15,30,0.85)",
                  border: "1px solid var(--border)",
                  borderRadius: 20,
                  padding: "4px 11px",
                  fontSize: 11,
                  color: "var(--foreground)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  backdropFilter: "blur(6px)",
                }}
              >
                {badge} →
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  metric,
  daily,
  win,
  today,
}: {
  metric: MetricDef;
  daily: DailyMetrics[];
  win: Window;
  today: string;
}) {
  const curr = currSlice(daily, win, today);
  const prev = prevSlice(daily, win, today);
  const currAvg = avgM(curr, metric.key);
  const prevAvg = avgM(prev, metric.key);
  const delta =
    prevAvg > 0 ? Math.round(((currAvg - prevAvg) / prevAvg) * 100) : null;
  const Icon = metric.icon;

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        padding: "20px 24px",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          {metric.label}
        </span>
        <div
          style={{
            padding: 8,
            borderRadius: 8,
            background: metric.color + "1a",
          }}
        >
          <Icon size={15} style={{ color: metric.color }} />
        </div>
      </div>

      <div
        style={{
          color: "var(--foreground)",
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {win === 1
          ? Math.round(currAvg).toLocaleString()
          : currAvg.toFixed(1)}
      </div>

      <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 4 }}>
        {win === 1 ? "today" : `${win}-day rolling avg`}
      </div>

      {delta !== null && (
        <div className="flex items-center gap-1" style={{ marginTop: 8 }}>
          {delta > 0 ? (
            <TrendingUp size={12} style={{ color: "#22c55e" }} />
          ) : delta < 0 ? (
            <TrendingDown size={12} style={{ color: "#ef4444" }} />
          ) : (
            <Minus size={12} style={{ color: "var(--muted-foreground)" }} />
          )}
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color:
                delta > 0
                  ? "#22c55e"
                  : delta < 0
                  ? "#ef4444"
                  : "var(--muted-foreground)",
            }}
          >
            {delta > 0 ? "+" : ""}
            {delta}% vs prev {win}d
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Sparkline Card ───────────────────────────────────────────────────────────

function SparklineCard({
  metric,
  daily,
  win,
  today,
}: {
  metric: MetricDef;
  daily: DailyMetrics[];
  win: Window;
  today: string;
}) {
  const slice = currSlice(daily, win, today);
  const vals  = slice.map((d) => d[metric.key]);
  const first = slice[0]?.date?.slice(5) ?? "";
  const last  = slice[slice.length - 1]?.date?.slice(5) ?? "";

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        padding: "16px 20px",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>
          {metric.label}
        </span>
        <span style={{ color: metric.color, fontSize: 11 }}>
          {win === 1 ? "today" : `last ${win} days`}
        </span>
      </div>

      <Sparkline data={vals} color={metric.color} />

      {win > 1 && (
        <div
          className="flex justify-between"
          style={{ color: "var(--muted-foreground)", fontSize: 10, marginTop: 4 }}
        >
          <span>{first}</span>
          <span>{last}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIDMClient({ data }: { data: AIDMDashboardData }) {
  const [win, setWin] = useState<Window>(7);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRefresh() {
    startTransition(async () => {
      await refreshAIDMData();
      router.refresh();
    });
  }

  const { daily, today } = data;

  return (
    <div style={{ color: "var(--foreground)" }}>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3" style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-3">
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "#a855f71a",
            }}
          >
            <Bot size={22} style={{ color: "#a855f7" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              AI DM Setter
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
              {data.lastFetched
                ? `Updated at ${data.lastFetched}`
                : "Rolling pipeline analytics · mock data"}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
          style={{
            background: "var(--secondary)",
            color: "var(--muted-foreground)",
            border: "1px solid var(--border)",
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Period selector ── */}
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 24 }}>
        <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          Rolling window:
        </span>
        <div className="flex gap-1 flex-wrap">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWin(w)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: win === w ? "#a855f7" : "var(--secondary)",
                color: win === w ? "#fff" : "var(--muted-foreground)",
                border: "1px solid " + (win === w ? "#a855f7" : "var(--border)"),
              }}
            >
              {WINDOW_LABELS[w]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pipeline funnel ── */}
      <div style={{ marginBottom: 24 }}>
        <PipelineFunnel daily={daily} win={win} today={today} />
      </div>

      {/* ── KPI cards ── */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          marginBottom: 24,
        }}
      >
        {METRICS.map((m) => (
          <KPICard key={m.key} metric={m} daily={daily} win={win} today={today} />
        ))}
      </div>

      {/* ── Daily trend sparklines ── */}
      <div>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--foreground)",
            marginBottom: 12,
          }}
        >
          Daily Trends
        </h3>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          {METRICS.map((m) => (
            <SparklineCard key={m.key} metric={m} daily={daily} win={win} today={today} />
          ))}
        </div>
      </div>

      {/* ── n8n setup callout ── */}
      <div
        style={{
          marginTop: 24,
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--secondary)",
        }}
      >
        <div className="flex items-start gap-3">
          <Bot size={16} style={{ color: "#a855f7", marginTop: 2, flexShrink: 0 }} />
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--foreground)",
                marginBottom: 6,
              }}
            >
              n8n Setup — AI_DM_EVENTS Tab
            </p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.65 }}>
              Create an{" "}
              <code style={{ background: "var(--card)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>
                AI_DM_EVENTS
              </code>{" "}
              tab in your existing sheet with 4 columns:{" "}
              <strong style={{ color: "var(--foreground)" }}>Date · Contact_ID · Event · Channel</strong>
              . Add a{" "}
              <strong style={{ color: "var(--foreground)" }}>Google Sheets → Append Row</strong>{" "}
              node at each trigger point in your SMS / FB / IG workflows:
            </p>
            <ul style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 8, lineHeight: 2.2, listStyle: "none", padding: 0 }}>
              {[
                { event: "conversation_started", when: "after each incoming webhook trigger" },
                { event: "qualified",            when: "after your bot's HS baseball parent filter" },
                { event: "link_sent",            when: "after VSL or Book follow-up sequence fires" },
                { event: "booked",               when: "when GHL confirms an appointment (optional)" },
              ].map(({ event, when }) => (
                <li key={event}>
                  <code style={{ background: "var(--card)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>
                    {event}
                  </code>
                  {" — "}{when}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
