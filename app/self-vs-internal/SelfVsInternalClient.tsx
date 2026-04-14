"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, RefreshCw, DollarSign, Phone, Target, TrendingUp, Users, Star } from "lucide-react";
import type { SelfVsInternalData, H2HRow } from "@/lib/self-vs-internal-fetch";

// ─── Design tokens ────────────────────────────────────────────────────────────

const SELF_COLOR     = "#3b82f6";  // blue  — A (Self)
const INTERNAL_COLOR = "#a855f7";  // purple — B (Internal / setter team)
const PAGE_COLOR     = "#f97316";  // orange — page accent

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

// ─── Winner badge ─────────────────────────────────────────────────────────────

function WinnerBadge({ winner }: { winner: "A" | "B" | null }) {
  if (!winner) return null;
  const color = winner === "A" ? SELF_COLOR : INTERNAL_COLOR;
  const label = winner === "A" ? "Self ✓" : "Internal ✓";
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}

// ─── H2H table row ────────────────────────────────────────────────────────────

function H2HTableRow({ row }: { row: H2HRow }) {
  const max    = Math.max(row.selfNum, row.internalNum, 1);
  const selfPct = Math.min((row.selfNum / max) * 100, 100);
  const intPct  = Math.min((row.internalNum / max) * 100, 100);

  return (
    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
      {/* Metric label */}
      <td className="px-5 py-4 text-sm font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>
        {row.metric}
      </td>

      {/* Self */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold font-mono w-20 text-right" style={{ color: SELF_COLOR }}>
            {row.selfVal}
          </span>
          <div className="flex-1 h-2 rounded-full min-w-[60px]" style={{ background: "var(--secondary)" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${selfPct}%`, background: SELF_COLOR }}
            />
          </div>
        </div>
      </td>

      {/* Internal */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full min-w-[60px]" style={{ background: "var(--secondary)" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${intPct}%`, background: INTERNAL_COLOR }}
            />
          </div>
          <span className="text-sm font-bold font-mono w-20" style={{ color: INTERNAL_COLOR }}>
            {row.internalVal}
          </span>
        </div>
      </td>

      {/* Winner */}
      <td className="px-5 py-4 text-right">
        <WinnerBadge winner={row.winner} />
      </td>
    </tr>
  );
}

// ─── Quality score card ───────────────────────────────────────────────────────

function QualityCard({
  label, score, color, isBetter,
}: { label: string; score: number; color: string; isBetter: boolean }) {
  const radius = 40;
  const circ   = 2 * Math.PI * radius;
  const fill   = Math.min(score / 100, 1) * circ;

  return (
    <div
      className="flex-1 rounded-xl border p-5 flex flex-col items-center gap-4"
      style={{
        background: "var(--card)",
        borderColor: isBetter ? color + "55" : "var(--border)",
        boxShadow: isBetter ? `0 0 20px ${color}18` : "none",
      }}
    >
      {isBetter && (
        <span
          className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
          style={{ background: color + "22", color }}
        >
          <Star size={11} /> Better Quality
        </span>
      )}
      {/* Ring chart */}
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>
          {fmtPct(score)}
        </text>
        <text x="50" y="61" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">
          quality
        </text>
      </svg>
      <div className="text-center">
        <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          (Show Rate × 40%) + (Close Rate × 60%)
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SelfVsInternalClient({ data }: { data: SelfVsInternalData }) {
  const { overall, headToHead, quality, lastFetched } = data;
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    router.refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRefresh() {
    startTransition(() => { router.refresh(); });
  }

  const overallCards = [
    { label: "Total Leads",   value: overall.totalLeads.toString(),      icon: Users },
    { label: "Calls Shown",   value: overall.callsShown.toString(),       icon: Phone },
    { label: "Total Closed",  value: overall.totalClosed.toString(),      icon: Target },
    { label: "Show Rate",     value: fmtPct(overall.showRate),            icon: TrendingUp },
    { label: "Close Rate",    value: fmtPct(overall.closeRate),           icon: TrendingUp },
    { label: "Total Cash",    value: fmt$(overall.totalCash),             icon: DollarSign },
  ];

  // Score each rep by winner count
  const selfWins     = headToHead.filter(r => r.winner === "A").length;
  const internalWins = headToHead.filter(r => r.winner === "B").length;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(249,115,22,0.15)" }}
            >
              <Scale size={16} style={{ color: PAGE_COLOR }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              Self vs Internal
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            <span style={{ color: SELF_COLOR }}>● Self (A)</span>
            {" vs "}
            <span style={{ color: INTERNAL_COLOR }}>● Internal (B)</span>
            {" — lead source performance comparison"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{lastFetched}</span>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              background: "var(--secondary)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            {isPending ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Overall stats strip ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--muted-foreground)" }}>
          Overall Performance (Combined)
        </p>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {overallCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon size={14} className="mx-auto mb-1" style={{ color: PAGE_COLOR }} />
              <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Head-to-head table ────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Table header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Scale size={15} style={{ color: PAGE_COLOR }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Head to Head
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-bold" style={{ color: SELF_COLOR }}>
              Self (A): {selfWins} wins
            </span>
            <span style={{ color: "var(--muted-foreground)" }}>·</span>
            <span className="font-bold" style={{ color: INTERNAL_COLOR }}>
              Internal (B): {internalWins} wins
            </span>
          </div>
        </div>

        {/* Column labels */}
        <div
          className="grid border-b px-5 py-2"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr auto",
            borderColor: "var(--border)",
            background: "rgba(30,41,59,0.3)",
          }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Metric
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide px-4" style={{ color: SELF_COLOR }}>
            A — Self
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide px-4" style={{ color: INTERNAL_COLOR }}>
            B — Internal
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-right pr-5" style={{ color: "var(--muted-foreground)" }}>
            Winner
          </span>
        </div>

        <table className="w-full">
          <tbody>
            {headToHead.map((row) => (
              <H2HTableRow key={row.metric} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Call quality score ────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Star size={15} style={{ color: PAGE_COLOR }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Call Quality Score
          </h2>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>
          Which source drives better-quality leads? Formula: (Show Rate × 40%) + (Close Rate × 60%)
        </p>
        <div className="flex gap-4 flex-wrap">
          <QualityCard
            label="A — Self"
            score={quality.self}
            color={SELF_COLOR}
            isBetter={quality.better === "A"}
          />
          <QualityCard
            label="B — Internal"
            score={quality.internal}
            color={INTERNAL_COLOR}
            isBetter={quality.better === "B"}
          />
        </div>
      </div>

    </div>
  );
}
