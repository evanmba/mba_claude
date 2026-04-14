"use client";

import { useState, useEffect } from "react";
import type { LandingPageData, HeadToHeadRow } from "@/lib/landingPage";

// ─── Among Us palette ────────────────────────────────────────────────────────
const AU = {
  bg:        "#12122a",
  card:      "#1e1e42",
  cardDark:  "#15152e",
  border:    "#2e2e6a",
  red:       "#c51111",
  redLight:  "#ff4444",
  cyan:      "#38d6f5",
  cyanDark:  "#1aabb5",
  yellow:    "#f5f542",
  green:     "#4AE96D",
  muted:     "#6b6b9e",
  text:      "#d4d4f8",
  white:     "#ffffff",
  star:      "rgba(255,255,255,0.7)",
};

// ─── Crewmate SVG ────────────────────────────────────────────────────────────
function Crewmate({ color, size = 72, flip = false }: { color: string; size?: number; flip?: boolean }) {
  const visor = "#38d6f5";
  const dark  = shadeColor(color, -25);
  return (
    <svg
      width={size} height={size * 1.3}
      viewBox="0 0 40 54"
      style={{ transform: flip ? "scaleX(-1)" : undefined, display: "block" }}
    >
      {/* body */}
      <ellipse cx="20" cy="37" rx="16" ry="15" fill={color} />
      {/* head */}
      <circle cx="20" cy="17" r="13" fill={color} />
      {/* visor */}
      <path
        d="M 11 13 Q 11 6 20 6 Q 29 6 29 13 Q 29 21 20 21 Q 11 21 11 13"
        fill={visor}
        opacity={0.88}
      />
      {/* visor shine */}
      <ellipse cx="16" cy="11" rx="4" ry="2.5" fill="white" opacity={0.35} />
      {/* backpack */}
      <rect x="34" y="27" width="7" height="13" rx="3.5" fill={dark} />
      {/* left leg */}
      <rect x="9"  y="49" width="8" height="6" rx="3" fill={dark} />
      {/* right leg */}
      <rect x="23" y="49" width="8" height="6" rx="3" fill={dark} />
    </svg>
  );
}

function shadeColor(hex: string, pct: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + pct));
  const g = Math.max(0, Math.min(255, ((n >> 8)  & 0xff) + pct));
  const b = Math.max(0, Math.min(255, ((n >> 0)  & 0xff) + pct));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// ─── Pixel-ish stat chip ─────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: color ?? AU.white, letterSpacing: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: AU.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Bar ─────────────────────────────────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden", flex: 1 }}>
      <div style={{
        height: "100%", borderRadius: 4,
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ─── Head-to-head row ─────────────────────────────────────────────────────────
function H2HRow({ row, i }: { row: HeadToHeadRow; i: number }) {
  const isP1 = row.winner === "page1";
  const isP2 = row.winner === "page2";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 90px 90px 80px",
      alignItems: "center",
      padding: "10px 16px",
      borderRadius: 8,
      background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
      gap: 8,
    }}>
      <span style={{ fontSize: 12, color: AU.text, fontFamily: "monospace" }}>{row.metric}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, textAlign: "center",
        color: isP1 ? AU.red : AU.muted,
        background: isP1 ? "rgba(197,17,17,0.15)" : "transparent",
        borderRadius: 6, padding: "3px 8px",
      }}>{row.page1 || "—"}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, textAlign: "center",
        color: isP2 ? AU.cyan : AU.muted,
        background: isP2 ? "rgba(56,214,245,0.12)" : "transparent",
        borderRadius: 6, padding: "3px 8px",
      }}>{row.page2 || "—"}</span>
      <span style={{
        fontSize: 11, fontWeight: 800, textAlign: "center", textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: isP1 ? AU.red : isP2 ? AU.cyan : AU.muted,
      }}>
        {isP1 ? "🔴 P1" : isP2 ? "🩵 P2" : "SKIP"}
      </span>
    </div>
  );
}

// ─── Stars background ─────────────────────────────────────────────────────────
function Stars() {
  const stars = Array.from({ length: 55 }, (_, i) => ({
    x: (i * 17 + 3) % 100,
    y: (i * 23 + 7) % 100,
    s: ((i % 3) + 1) * 1.2,
    d: (i * 0.3 + 0.2).toFixed(1),
  }));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.s, height: s.s, borderRadius: "50%",
          background: AU.star,
          animation: `twinkle ${s.d}s ease-in-out infinite alternate`,
          opacity: 0.5,
        }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LandingPageView() {
  const [data, setData]       = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ads/landing-page")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen msg={error ?? "No data"} />;

  const { overall, page1, page2, headToHead, quality, note } = data;

  const p1Wins   = headToHead.filter((r) => r.winner === "page1").length;
  const p2Wins   = headToHead.filter((r) => r.winner === "page2").length;
  const qualWinner = quality.winner.trim().toLowerCase();
  const crewWinner = qualWinner.includes("1") ? "page1" : qualWinner.includes("2") ? "page2" : "tie";

  const fmt$ = (n: number) => n === 0 ? "$0" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;
  const needsMoreData = overall.totalLeads < 100;

  return (
    <div style={{
      position: "relative",
      background: AU.bg,
      borderRadius: 20,
      border: `2px solid ${AU.border}`,
      overflow: "hidden",
      minHeight: 600,
    }}>
      <Stars />

      <div style={{ position: "relative", zIndex: 1, padding: "28px 28px 32px" }}>

        {/* ── EMERGENCY MEETING HEADER ── */}
        <div style={{
          textAlign: "center", marginBottom: 28,
          background: "linear-gradient(135deg, rgba(197,17,17,0.15), rgba(56,214,245,0.08))",
          border: `1px solid ${AU.border}`,
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 11, color: AU.yellow, letterSpacing: "0.25em", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            ⚠ EMERGENCY MEETING ⚠
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: AU.white, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Landing Page Split Test
          </div>
          <div style={{ fontSize: 12, color: AU.muted, marginTop: 4 }}>
            Which page is the impostor? Only one can survive.
          </div>
        </div>

        {/* ── OVERALL STATS ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12, marginBottom: 24,
        }}>
          {[
            { label: "Total Leads", value: overall.totalLeads.toString(), color: AU.yellow },
            { label: "Calls Shown", value: overall.callsShown.toString(), color: AU.cyan },
            { label: "Total Closed", value: overall.totalClosed.toString(), color: AU.green },
            { label: "Show Rate", value: fmtPct(overall.showRate), color: AU.cyan },
            { label: "Close Rate", value: fmtPct(overall.closeRate), color: AU.green },
            { label: "Total Cash", value: fmt$(overall.totalCash), color: AU.yellow },
          ].map((s) => (
            <div key={s.label} style={{
              background: AU.cardDark,
              border: `1px solid ${AU.border}`,
              borderRadius: 10, padding: "14px 12px", textAlign: "center",
            }}>
              <Stat label={s.label} value={s.value} color={s.color} />
            </div>
          ))}
        </div>

        {/* ── NEEDS MORE DATA WARNING ── */}
        {needsMoreData && (
          <div style={{
            marginBottom: 20, padding: "10px 16px", borderRadius: 10,
            background: "rgba(245,245,66,0.08)", border: `1px solid rgba(245,245,66,0.3)`,
            fontSize: 12, color: AU.yellow, textAlign: "center", fontWeight: 600,
          }}>
            ⚠&nbsp; {note || "Only make a decision when total leads hit 100+"}
          </div>
        )}

        {/* ── PAGE 1 vs PAGE 2 CREWMATES ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 12, marginBottom: 24,
        }}>
          {([
            { label: "PAGE 1", color: AU.red, stats: page1, wins: p1Wins, flip: false },
            { label: "PAGE 2", color: AU.cyan, stats: page2, wins: p2Wins, flip: true },
          ] as const).map(({ label, color, stats, wins, flip }) => (
            <div key={label} style={{
              background: AU.card,
              border: `2px solid ${color}30`,
              borderRadius: 16, padding: "20px 18px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            }}>
              <Crewmate color={color} size={64} flip={flip} />
              <div style={{ fontSize: 14, fontWeight: 900, color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", width: "100%" }}>
                <Stat label="Bookings"  value={stats.bookings.toString()}    color={AU.white} />
                <Stat label="Calls Shown" value={stats.callsShown.toString()} color={AU.white} />
                <Stat label="Show Rate" value={fmtPct(stats.showRate)}       color={AU.cyan}  />
                <Stat label="Closes"    value={stats.closes.toString()}      color={AU.white} />
                <Stat label="Close Rate" value={fmtPct(stats.closeRate)}     color={AU.green} />
                <Stat label="Cash"      value={fmt$(stats.totalCash)}        color={AU.yellow}/>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: AU.muted,
                textTransform: "uppercase", letterSpacing: "0.1em",
                marginTop: -4,
              }}>
                {wins} metric{wins !== 1 ? "s" : ""} won
              </div>
            </div>
          ))}
        </div>

        {/* ── HEAD-TO-HEAD TABLE ── */}
        <div style={{
          background: AU.card, border: `1px solid ${AU.border}`,
          borderRadius: 14, overflow: "hidden", marginBottom: 24,
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 90px 90px 80px",
            padding: "10px 16px", gap: 8,
            borderBottom: `1px solid ${AU.border}`,
            background: AU.cardDark,
          }}>
            <span style={{ fontSize: 10, color: AU.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Metric</span>
            <span style={{ fontSize: 10, color: AU.red,   textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>PAGE 1</span>
            <span style={{ fontSize: 10, color: AU.cyan,  textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>PAGE 2</span>
            <span style={{ fontSize: 10, color: AU.muted, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>VOTE</span>
          </div>
          {headToHead.map((row, i) => <H2HRow key={row.metric} row={row} i={i} />)}
        </div>

        {/* ── CALL QUALITY SCORE ── */}
        <div style={{
          background: AU.card, border: `1px solid ${AU.border}`,
          borderRadius: 14, padding: "20px 22px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: AU.yellow, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 16 }}>
            🧬 Call Quality Score
          </div>
          <div style={{ fontSize: 10, color: AU.muted, marginBottom: 16, fontFamily: "monospace" }}>
            Formula: (Show Rate × 40%) + (Close Rate × 60%)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([
              { label: "Page 1", score: quality.page1Score, color: AU.red  },
              { label: "Page 2", score: quality.page2Score, color: AU.cyan },
            ] as const).map(({ label, score, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 56 }}>{label}</span>
                <Bar pct={score} color={color} />
                <span style={{ fontSize: 13, fontWeight: 800, color, minWidth: 44, textAlign: "right" }}>
                  {fmtPct(score)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── VERDICT / EJECTION ── */}
        <div style={{
          textAlign: "center",
          background: crewWinner === "page1"
            ? "rgba(197,17,17,0.12)"
            : crewWinner === "page2"
            ? "rgba(56,214,245,0.1)"
            : "rgba(255,255,255,0.05)",
          border: `2px solid ${crewWinner === "page1" ? AU.red : crewWinner === "page2" ? AU.cyan : AU.border}`,
          borderRadius: 16, padding: "24px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 16, alignItems: "flex-end" }}>
            <div style={{ opacity: crewWinner === "page2" ? 0.35 : 1, transition: "opacity 0.3s" }}>
              <Crewmate color={AU.red} size={56} />
            </div>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🚀</div>
            <div style={{ opacity: crewWinner === "page1" ? 0.35 : 1, transition: "opacity 0.3s" }}>
              <Crewmate color={AU.cyan} size={56} flip />
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: AU.white, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {crewWinner === "tie"
              ? "It's a Tie. Keep Testing."
              : `${quality.winner} was ejected.`}
          </div>
          <div style={{ fontSize: 12, color: AU.muted, marginTop: 6 }}>
            {crewWinner === "tie"
              ? "Not enough data to call a winner yet."
              : crewWinner === "page1"
              ? `${quality.winner} was The Impostor. (Use Page 2.)`
              : `${quality.winner} was The Impostor. (Use Page 1.)`}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes twinkle {
          from { opacity: 0.2; }
          to   { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      background: AU.bg, borderRadius: 20, border: `2px solid ${AU.border}`,
      minHeight: 400, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      <Crewmate color={AU.red} size={60} />
      <div style={{ fontSize: 13, color: AU.muted, letterSpacing: "0.1em", textTransform: "uppercase", animation: "blink 1s step-end infinite" }}>
        Scanning vents…
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <div style={{
      background: AU.bg, borderRadius: 20, border: `2px solid ${AU.red}50`,
      minHeight: 400, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
    }}>
      <Crewmate color="#555" size={60} />
      <div style={{ fontSize: 14, color: "#ef4444", fontWeight: 700 }}>Error loading data</div>
      <div style={{ fontSize: 11, color: AU.muted }}>{msg}</div>
    </div>
  );
}
