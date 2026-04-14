"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { SelfVsInternalData, H2HRow } from "@/lib/self-vs-internal-fetch";

// ─── Among Us color palette ───────────────────────────────────────────────────
const SELF_COLOR = "#132ED1";   // blue crewmate
const INT_COLOR  = "#C61111";   // red crewmate
const GOLD       = "#F5F557";   // task-complete yellow
const SPACE_BG   = "#0a0f1e";   // deep space

// ─── Crewmate SVG ─────────────────────────────────────────────────────────────
function Crewmate({ color, size = 36, flip = false }: { color: string; size?: number; flip?: boolean }) {
  const dark = color === SELF_COLOR ? "#0c1a7a" : "#7a0000";
  return (
    <svg
      width={size}
      height={Math.round(size * 1.25)}
      viewBox="0 0 40 50"
      fill="none"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* Body */}
      <path d="M6 20 C6 9 34 9 34 20 L34 38 C34 44 28 46 20 46 C12 46 6 44 6 38 Z" fill={color} />
      {/* Visor area */}
      <ellipse cx="20" cy="16" rx="11" ry="8" fill={color} />
      {/* Visor glass */}
      <path d="M11 15 C11 9 29 9 29 15 C29 20 20 20 20 20 C20 20 11 20 11 15 Z" fill="#9ED7F5" />
      {/* Visor highlight */}
      <path d="M14 12 C15 10 20 10 23 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* Legs */}
      <rect x="10" y="43" width="8" height="7" rx="4" fill={dark} />
      <rect x="22" y="43" width="8" height="7" rx="4" fill={dark} />
      {/* Backpack */}
      <rect x="32" y="23" width="8" height="12" rx="4" fill={dark} />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt$(n: number) {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

// ─── Cell component — mimics a spreadsheet cell ───────────────────────────────
function Cell({
  children, header = false, color, align = "center", span,
  highlight = false,
}: {
  children: React.ReactNode;
  header?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  span?: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        gridColumn: span ? `span ${span}` : undefined,
        padding: header ? "8px 12px" : "10px 12px",
        textAlign: align,
        fontWeight: header ? 700 : 600,
        fontSize: header ? 11 : 14,
        letterSpacing: header ? "0.08em" : "0.01em",
        textTransform: header ? "uppercase" : undefined,
        color: color ?? (header ? "#94a3b8" : "var(--foreground)"),
        background: highlight ? `${GOLD}18` : "transparent",
        borderBottom: "1px solid #1e293b",
        borderRight: "1px solid #1e293b",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {children}
    </div>
  );
}

// ─── Section header — full-width label bar ────────────────────────────────────
function SectionHeader({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      style={{
        background: accent ? `${accent}18` : "#0f172a",
        borderBottom: `2px solid ${accent ?? "#1e293b"}`,
        borderTop: "1px solid #1e293b",
        padding: "10px 16px",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: accent ?? "#64748b",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {children}
    </div>
  );
}

// ─── Winner badge ─────────────────────────────────────────────────────────────
function Winner({ who }: { who: "A" | "B" | null }) {
  if (!who) return <span style={{ color: "#475569", fontSize: 12 }}>—</span>;
  const color = who === "A" ? SELF_COLOR : INT_COLOR;
  const label = who === "A" ? "A ✓" : "B ✓";
  return (
    <span
      style={{
        display: "inline-block",
        background: color + "22",
        color,
        border: `1px solid ${color}55`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: "0.08em",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {label}
    </span>
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

  const selfWins = headToHead.filter(r => r.winner === "A").length;
  const intWins  = headToHead.filter(r => r.winner === "B").length;
  const overallWinner = selfWins > intWins ? "A" : intWins > selfWins ? "B" : null;

  const overallCols = [
    { label: "Total Leads",  value: overall.totalLeads.toString() },
    { label: "Calls Shown",  value: overall.callsShown.toString() },
    { label: "Total Closed", value: overall.totalClosed.toString() },
    { label: "Show Rate",    value: fmtPct(overall.showRate) },
    { label: "Close Rate",   value: fmtPct(overall.closeRate) },
    { label: "Total Cash",   value: fmt$(overall.totalCash) },
  ];

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>

      {/* ── Title banner ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: `radial-gradient(ellipse at top, #0d1b3e 0%, ${SPACE_BG} 70%)`,
          border: `2px solid ${GOLD}55`,
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 2 : 1,
              borderRadius: "50%",
              background: "white",
              opacity: 0.3 + (i % 4) * 0.15,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53 + 7) % 100}%`,
            }}
          />
        ))}

        <div className="flex items-center justify-between flex-wrap gap-4" style={{ position: "relative" }}>
          {/* Left crewmate + label */}
          <div className="flex items-center gap-3">
            <Crewmate color={SELF_COLOR} size={48} />
            <div>
              <div style={{ fontSize: 10, color: SELF_COLOR, letterSpacing: "0.1em", fontWeight: 700 }}>VARIANT A</div>
              <div style={{ fontSize: 18, color: "white", fontWeight: 900, letterSpacing: "0.05em" }}>SELF</div>
            </div>
          </div>

          {/* Center title */}
          <div className="text-center flex-1">
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.15em", fontWeight: 700, marginBottom: 4 }}>
              ⬡ VARIANT REPORTING ⬡
            </div>
            <div style={{ fontSize: 22, color: "white", fontWeight: 900, letterSpacing: "0.08em" }}>
              SELF (A) vs INTERNAL (B)
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, letterSpacing: "0.1em" }}>
              2026 SEASON
            </div>
          </div>

          {/* Right crewmate + label */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div style={{ fontSize: 10, color: INT_COLOR, letterSpacing: "0.1em", fontWeight: 700 }}>VARIANT B</div>
              <div style={{ fontSize: 18, color: "white", fontWeight: 900, letterSpacing: "0.05em" }}>INTERNAL</div>
            </div>
            <Crewmate color={INT_COLOR} size={48} flip />
          </div>
        </div>

        {/* Refresh row */}
        <div className="flex items-center justify-between mt-4" style={{ position: "relative" }}>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.08em" }}>
            LAST SYNC: {lastFetched.toUpperCase()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "4px 12px",
              color: "#64748b",
              fontSize: 11,
              letterSpacing: "0.08em",
              cursor: "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            <RefreshCw size={11} className={isPending ? "animate-spin" : ""} />
            {isPending ? "SYNCING..." : "SYNC DATA"}
          </button>
        </div>
      </div>

      {/* ── Spreadsheet panel ─────────────────────────────────────────────────── */}
      <div
        style={{
          border: "1px solid #1e293b",
          borderRadius: 10,
          overflow: "hidden",
          background: "#080e1c",
        }}
      >

        {/* ── SECTION 1: Overall Performance ─────────────────────────────────── */}
        <SectionHeader>▸ Overall Performance</SectionHeader>

        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
          {overallCols.map(col => (
            <Cell key={col.label} header align="center">{col.label}</Cell>
          ))}
        </div>
        {/* Value row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", background: "#0c1424" }}>
          {overallCols.map(col => (
            <Cell key={col.label} align="center" color={GOLD}>
              {col.value}
            </Cell>
          ))}
        </div>

        {/* ── SECTION 2: Head to Head ─────────────────────────────────────────── */}
        <SectionHeader accent={undefined}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>▸ A — SELF&nbsp;&nbsp;vs&nbsp;&nbsp;B — INTERNAL &nbsp;· HEAD TO HEAD</span>
            <span style={{ color: "#475569", fontWeight: 600 }}>
              {selfWins}W — {intWins}W
              {overallWinner && (
                <span style={{ marginLeft: 10, color: overallWinner === "A" ? SELF_COLOR : INT_COLOR }}>
                  &nbsp;{overallWinner === "A" ? "SELF LEADS" : "INTERNAL LEADS"}
                </span>
              )}
            </span>
          </div>
        </SectionHeader>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <Cell header align="left">Metric</Cell>
          <Cell header align="center" color={SELF_COLOR + "cc"}>A — SELF</Cell>
          <Cell header align="center" color={INT_COLOR + "cc"}>B — INTERNAL</Cell>
          <Cell header align="center">Winner</Cell>
        </div>

        {/* Data rows */}
        {headToHead.map((row: H2HRow, i: number) => {
          const isLast = i === headToHead.length - 1;
          return (
            <div
              key={row.metric}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                background: i % 2 === 0 ? "#0a1020" : "#080e1c",
                borderBottom: isLast ? "none" : "1px solid #131f35",
              }}
            >
              {/* Metric label */}
              <div style={{
                padding: "11px 16px",
                fontSize: 13,
                color: "#cbd5e1",
                fontWeight: 600,
                letterSpacing: "0.02em",
                borderRight: "1px solid #1e293b",
                fontFamily: "'Courier New', monospace",
              }}>
                {row.metric}
              </div>

              {/* Self value */}
              <div style={{
                padding: "11px 12px",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 700,
                color: row.winner === "A" ? SELF_COLOR : "#e2e8f0",
                borderRight: "1px solid #1e293b",
                fontFamily: "'Courier New', monospace",
                background: row.winner === "A" ? `${SELF_COLOR}0d` : "transparent",
              }}>
                {row.selfVal}
              </div>

              {/* Internal value */}
              <div style={{
                padding: "11px 12px",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 700,
                color: row.winner === "B" ? INT_COLOR : "#e2e8f0",
                borderRight: "1px solid #1e293b",
                fontFamily: "'Courier New', monospace",
                background: row.winner === "B" ? `${INT_COLOR}0d` : "transparent",
              }}>
                {row.internalVal}
              </div>

              {/* Winner */}
              <div style={{
                padding: "11px 12px",
                textAlign: "center",
                fontFamily: "'Courier New', monospace",
              }}>
                <Winner who={row.winner} />
              </div>
            </div>
          );
        })}

        {/* Win summary row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            borderTop: `2px solid #1e293b`,
            background: "#0c1424",
          }}
        >
          <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: "#475569", fontFamily: "'Courier New', monospace", textTransform: "uppercase" }}>
            Total Wins
          </div>
          <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 14, fontWeight: 900, color: SELF_COLOR, borderLeft: "1px solid #1e293b", fontFamily: "'Courier New', monospace" }}>
            {selfWins}
          </div>
          <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 14, fontWeight: 900, color: INT_COLOR, borderLeft: "1px solid #1e293b", fontFamily: "'Courier New', monospace" }}>
            {intWins}
          </div>
          <div style={{ padding: "10px 12px", textAlign: "center", borderLeft: "1px solid #1e293b" }}>
            {overallWinner ? (
              <span style={{
                display: "inline-block",
                background: (overallWinner === "A" ? SELF_COLOR : INT_COLOR) + "22",
                color: overallWinner === "A" ? SELF_COLOR : INT_COLOR,
                border: `1px solid ${(overallWinner === "A" ? SELF_COLOR : INT_COLOR)}55`,
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.08em",
                fontFamily: "'Courier New', monospace",
              }}>
                {overallWinner === "A" ? "SELF" : "INTERNAL"} WINS
              </span>
            ) : (
              <span style={{ color: "#475569", fontSize: 12 }}>TIED</span>
            )}
          </div>
        </div>

        {/* ── SECTION 3: Call Quality Score ───────────────────────────────────── */}
        <SectionHeader accent={GOLD}>
          ▸ CALL QUALITY SCORE — Which variant drives better-quality leads?
        </SectionHeader>

        {/* Formula row */}
        <div style={{
          padding: "8px 16px",
          fontSize: 10,
          color: "#475569",
          letterSpacing: "0.06em",
          background: "#080e1c",
          borderBottom: "1px solid #131f35",
          fontFamily: "'Courier New', monospace",
        }}>
          FORMULA: (SHOW RATE × 40%) + (CLOSE RATE × 60%)
        </div>

        {/* Score rows */}
        {[
          { label: "A — SELF QUALITY SCORE",     value: fmtPct(quality.self),     isBetter: quality.better === "A", color: SELF_COLOR },
          { label: "B — INTERNAL QUALITY SCORE", value: fmtPct(quality.internal), isBetter: quality.better === "B", color: INT_COLOR },
          { label: "BETTER QUALITY VARIANT",     value: quality.better === "A" ? "A — SELF" : "B — INTERNAL", isBetter: true, color: GOLD },
        ].map((row, i) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              background: row.isBetter && i < 2 ? `${row.color}0a` : i % 2 === 0 ? "#0a1020" : "#080e1c",
              borderBottom: i < 2 ? "1px solid #131f35" : "none",
            }}
          >
            <div style={{
              padding: "12px 16px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: row.isBetter && i < 2 ? row.color : "#64748b",
              borderRight: "1px solid #1e293b",
              fontFamily: "'Courier New', monospace",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              {i < 2 && <Crewmate color={row.color} size={20} />}
              {row.label}
            </div>
            <div style={{
              padding: "12px 16px",
              fontSize: i === 2 ? 13 : 16,
              fontWeight: 900,
              color: i === 2 ? GOLD : row.isBetter ? row.color : "#e2e8f0",
              textAlign: "center",
              letterSpacing: "0.04em",
              fontFamily: "'Courier New', monospace",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}>
              {row.value}
              {row.isBetter && i < 2 && (
                <span style={{ fontSize: 10, color: GOLD, background: GOLD + "22", border: `1px solid ${GOLD}55`, borderRadius: 4, padding: "1px 6px", letterSpacing: "0.1em" }}>
                  BEST
                </span>
              )}
            </div>
          </div>
        ))}

      </div>{/* end spreadsheet panel */}

    </div>
  );
}
