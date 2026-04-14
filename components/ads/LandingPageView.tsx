"use client";

import { useState, useEffect } from "react";
import type { LandingPageData, HeadToHeadRow } from "@/lib/landingPage";

// ─── Among Us palette ────────────────────────────────────────────────────────
const AU = {
  bg:       "#12122a",
  card:     "#1e1e42",
  cardDark: "#15152e",
  border:   "#2e2e6a",
  red:      "#c51111",
  cyan:     "#38d6f5",
  yellow:   "#f5f542",
  green:    "#4AE96D",
  muted:    "#6b6b9e",
  text:     "#d4d4f8",
  white:    "#ffffff",
  star:     "rgba(255,255,255,0.7)",
};

// ─── Crewmate SVG ────────────────────────────────────────────────────────────
function Crewmate({ color, size = 72, flip = false }: { color: string; size?: number; flip?: boolean }) {
  const dark = shadeColor(color, -25);
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 54"
      style={{ transform: flip ? "scaleX(-1)" : undefined, display: "block" }}>
      <ellipse cx="20" cy="37" rx="16" ry="15" fill={color} />
      <circle  cx="20" cy="17" r="13"          fill={color} />
      <path d="M 11 13 Q 11 6 20 6 Q 29 6 29 13 Q 29 21 20 21 Q 11 21 11 13"
        fill="#38d6f5" opacity={0.88} />
      <ellipse cx="16" cy="11" rx="4" ry="2.5" fill="white" opacity={0.35} />
      <rect x="34" y="27" width="7"  height="13" rx="3.5" fill={dark} />
      <rect x="9"  y="49" width="8"  height="6"  rx="3"   fill={dark} />
      <rect x="23" y="49" width="8"  height="6"  rx="3"   fill={dark} />
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

// ─── Stat chip ───────────────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="lp-stat-value" style={{ fontWeight: 800, color: color ?? AU.white, letterSpacing: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: AU.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden", flex: 1 }}>
      <div style={{
        height: "100%", borderRadius: 4, background: color,
        width: `${Math.min(100, Math.max(0, pct))}%`,
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
    <div className="lp-h2h-row" style={{
      alignItems: "center",
      padding: "9px 12px",
      borderRadius: 8,
      background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
      gap: 6,
    }}>
      <span style={{ fontSize: 11, color: AU.text, fontFamily: "monospace", wordBreak: "break-word" }}>
        {row.metric}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 700, textAlign: "center",
        color: isP1 ? AU.red : AU.muted,
        background: isP1 ? "rgba(197,17,17,0.15)" : "transparent",
        borderRadius: 6, padding: "2px 6px",
      }}>{row.page1 || "—"}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, textAlign: "center",
        color: isP2 ? AU.cyan : AU.muted,
        background: isP2 ? "rgba(56,214,245,0.12)" : "transparent",
        borderRadius: 6, padding: "2px 6px",
      }}>{row.page2 || "—"}</span>
      <span style={{
        fontSize: 10, fontWeight: 800, textAlign: "center", textTransform: "uppercase",
        color: isP1 ? AU.red : isP2 ? AU.cyan : AU.muted,
      }}>
        {isP1 ? "🔴" : isP2 ? "🩵" : "—"}
      </span>
    </div>
  );
}

// ─── Stars ───────────────────────────────────────────────────────────────────
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
          animation: `lpTwinkle ${s.d}s ease-in-out infinite alternate`,
          opacity: 0.5,
        }} />
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
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
  const p1Wins     = headToHead.filter((r) => r.winner === "page1").length;
  const p2Wins     = headToHead.filter((r) => r.winner === "page2").length;
  const qualWinner = quality.winner.trim().toLowerCase();
  const crewWinner = qualWinner.includes("1") ? "page1" : qualWinner.includes("2") ? "page2" : "tie";
  const fmt$       = (n: number) => n === 0 ? "$0" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const fmtPct     = (n: number) => `${n.toFixed(1)}%`;
  const needsMore  = overall.totalLeads < 100;

  return (
    <>
      <LPStyles />
      <div className="lp-outer" style={{ background: AU.bg, border: `2px solid ${AU.border}` }}>
        <Stars />

        <div className="lp-inner">

          {/* HEADER */}
          <div style={{
            textAlign: "center", marginBottom: 24,
            background: "linear-gradient(135deg, rgba(197,17,17,0.15), rgba(56,214,245,0.08))",
            border: `1px solid ${AU.border}`, borderRadius: 14, padding: "16px 20px",
          }}>
            <div style={{ fontSize: 10, color: AU.yellow, letterSpacing: "0.2em", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>
              ⚠ EMERGENCY MEETING ⚠
            </div>
            <div className="lp-title" style={{ fontWeight: 900, color: AU.white, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Landing Page Split Test
            </div>
            <div style={{ fontSize: 11, color: AU.muted, marginTop: 4 }}>
              Which page is the impostor? Only one can survive.
            </div>
          </div>

          {/* OVERALL STATS */}
          <div className="lp-overall-grid" style={{ marginBottom: 20 }}>
            {[
              { label: "Total Leads",  value: overall.totalLeads.toString(),  color: AU.yellow },
              { label: "Calls Shown",  value: overall.callsShown.toString(),  color: AU.cyan   },
              { label: "Total Closed", value: overall.totalClosed.toString(), color: AU.green  },
              { label: "Show Rate",    value: fmtPct(overall.showRate),       color: AU.cyan   },
              { label: "Close Rate",   value: fmtPct(overall.closeRate),      color: AU.green  },
              { label: "Total Cash",   value: fmt$(overall.totalCash),        color: AU.yellow },
            ].map((s) => (
              <div key={s.label} style={{
                background: AU.cardDark, border: `1px solid ${AU.border}`,
                borderRadius: 10, padding: "12px 8px", textAlign: "center",
              }}>
                <Stat label={s.label} value={s.value} color={s.color} />
              </div>
            ))}
          </div>

          {/* WARNING */}
          {needsMore && (
            <div style={{
              marginBottom: 18, padding: "9px 14px", borderRadius: 10,
              background: "rgba(245,245,66,0.08)", border: "1px solid rgba(245,245,66,0.3)",
              fontSize: 11, color: AU.yellow, textAlign: "center", fontWeight: 600,
            }}>
              ⚠ {note || "Only make a decision when total leads hit 100+"}
            </div>
          )}

          {/* CREWMATE CARDS */}
          <div className="lp-crew-grid" style={{ marginBottom: 20 }}>
            {([
              { label: "PAGE 1", color: AU.red,  stats: page1, wins: p1Wins, flip: false },
              { label: "PAGE 2", color: AU.cyan, stats: page2, wins: p2Wins, flip: true  },
            ] as const).map(({ label, color, stats, wins, flip }) => (
              <div key={label} style={{
                background: AU.card, border: `2px solid ${color}30`,
                borderRadius: 14, padding: "16px 14px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              }}>
                <Crewmate color={color} size={52} flip={flip} />
                <div style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {label}
                </div>
                <div className="lp-crew-stats">
                  <Stat label="Bookings"   value={stats.bookings.toString()}      color={AU.white} />
                  <Stat label="Calls Shown" value={stats.callsShown.toString()}   color={AU.white} />
                  <Stat label="Show Rate"  value={fmtPct(stats.showRate)}         color={AU.cyan}  />
                  <Stat label="Closes"     value={stats.closes.toString()}         color={AU.white} />
                  <Stat label="Close Rate" value={fmtPct(stats.closeRate)}        color={AU.green} />
                  <Stat label="Cash"       value={fmt$(stats.totalCash)}          color={AU.yellow}/>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: AU.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {wins} metric{wins !== 1 ? "s" : ""} won
                </div>
              </div>
            ))}
          </div>

          {/* H2H TABLE */}
          <div style={{
            background: AU.card, border: `1px solid ${AU.border}`,
            borderRadius: 12, overflow: "hidden", marginBottom: 20,
          }}>
            <div className="lp-h2h-row lp-h2h-header" style={{
              padding: "9px 12px", gap: 6,
              borderBottom: `1px solid ${AU.border}`,
              background: AU.cardDark,
            }}>
              <span style={{ fontSize: 10, color: AU.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Metric</span>
              <span style={{ fontSize: 10, color: AU.red,   textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>P1</span>
              <span style={{ fontSize: 10, color: AU.cyan,  textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>P2</span>
              <span style={{ fontSize: 10, color: AU.muted, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>Win</span>
            </div>
            {headToHead.map((row, i) => <H2HRow key={row.metric} row={row} i={i} />)}
          </div>

          {/* QUALITY SCORE */}
          <div style={{
            background: AU.card, border: `1px solid ${AU.border}`,
            borderRadius: 12, padding: "18px 18px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, color: AU.yellow, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 12 }}>
              🧬 Call Quality Score
            </div>
            <div style={{ fontSize: 9, color: AU.muted, marginBottom: 14, fontFamily: "monospace" }}>
              (Show Rate × 40%) + (Close Rate × 60%)
            </div>
            {([
              { label: "Page 1", score: quality.page1Score, color: AU.red  },
              { label: "Page 2", score: quality.page2Score, color: AU.cyan },
            ] as const).map(({ label, score, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 48 }}>{label}</span>
                <Bar pct={score} color={color} />
                <span style={{ fontSize: 12, fontWeight: 800, color, minWidth: 40, textAlign: "right" }}>
                  {fmtPct(score)}
                </span>
              </div>
            ))}
          </div>

          {/* VERDICT */}
          <div style={{
            textAlign: "center",
            background: crewWinner === "page1" ? "rgba(197,17,17,0.12)"
              : crewWinner === "page2" ? "rgba(56,214,245,0.1)"
              : "rgba(255,255,255,0.05)",
            border: `2px solid ${crewWinner === "page1" ? AU.red : crewWinner === "page2" ? AU.cyan : AU.border}`,
            borderRadius: 14, padding: "20px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 14, alignItems: "flex-end" }}>
              <div style={{ opacity: crewWinner === "page2" ? 0.3 : 1, transition: "opacity 0.3s" }}>
                <Crewmate color={AU.red}  size={48} />
              </div>
              <div style={{ fontSize: 24, marginBottom: 10 }}>🚀</div>
              <div style={{ opacity: crewWinner === "page1" ? 0.3 : 1, transition: "opacity 0.3s" }}>
                <Crewmate color={AU.cyan} size={48} flip />
              </div>
            </div>
            <div className="lp-verdict" style={{ fontWeight: 900, color: AU.white, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {crewWinner === "tie" ? "It's a Tie. Keep Testing." : `${quality.winner} was ejected.`}
            </div>
            <div style={{ fontSize: 11, color: AU.muted, marginTop: 6 }}>
              {crewWinner === "tie"
                ? "Not enough data to call a winner yet."
                : crewWinner === "page1"
                ? `${quality.winner} was The Impostor. Run Page 2.`
                : `${quality.winner} was The Impostor. Run Page 1.`}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Responsive styles ────────────────────────────────────────────────────────
function LPStyles() {
  return (
    <style>{`
      .lp-outer {
        position: relative;
        border-radius: 20px;
        overflow: hidden;
        min-height: 500px;
      }
      .lp-inner {
        position: relative;
        z-index: 1;
        padding: 24px 24px 28px;
      }
      .lp-title        { font-size: 20px; }
      .lp-stat-value   { font-size: 20px; }
      .lp-verdict      { font-size: 16px; }
      .lp-overall-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .lp-crew-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .lp-crew-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 12px;
        width: 100%;
      }
      .lp-h2h-row {
        display: grid;
        grid-template-columns: 1fr 72px 72px 44px;
      }
      .lp-h2h-header {
        display: grid;
        grid-template-columns: 1fr 72px 72px 44px;
      }

      @media (max-width: 480px) {
        .lp-inner         { padding: 14px 14px 20px; }
        .lp-title         { font-size: 16px; }
        .lp-stat-value    { font-size: 17px; }
        .lp-verdict       { font-size: 14px; }
        .lp-overall-grid  { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .lp-crew-grid     { grid-template-columns: 1fr 1fr; gap: 8px; }
        .lp-crew-stats    { gap: 8px 8px; }
        .lp-h2h-row       { grid-template-columns: 1fr 54px 54px 34px; }
        .lp-h2h-header    { grid-template-columns: 1fr 54px 54px 34px; }
      }

      @keyframes lpTwinkle {
        from { opacity: 0.2; }
        to   { opacity: 0.9; }
      }
    `}</style>
  );
}

function LoadingScreen() {
  return (
    <>
      <LPStyles />
      <div className="lp-outer" style={{ background: AU.bg, border: `2px solid ${AU.border}`, minHeight: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Crewmate color={AU.red} size={56} />
        <div style={{ fontSize: 12, color: AU.muted, letterSpacing: "0.1em", textTransform: "uppercase", animation: "lpBlink 1s step-end infinite" }}>
          Scanning vents…
        </div>
        <style>{`@keyframes lpBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    </>
  );
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <>
      <LPStyles />
      <div className="lp-outer" style={{ background: AU.bg, border: `2px solid ${AU.red}50`, minHeight: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Crewmate color="#555" size={56} />
        <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 700 }}>Error loading data</div>
        <div style={{ fontSize: 11, color: AU.muted }}>{msg}</div>
      </div>
    </>
  );
}
