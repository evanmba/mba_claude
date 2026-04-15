"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft, Layers, LayoutList, ImageIcon } from "lucide-react";
import type { GradeRow } from "@/app/api/ads/grade/campaigns/route";

type Level = "campaigns" | "adsets" | "ads";
type Window = "7d" | "14d" | "month";

const BG     = "#0b1628";
const CARD   = "#0f172a";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED  = "#475569";
const ACCENT = "#3b82f6";

const WINDOWS: { key: Window; label: string }[] = [
  { key: "7d",    label: "7 Days"  },
  { key: "14d",   label: "14 Days" },
  { key: "month", label: "30 Days" },
];

const LEVEL_META: Record<Level, { label: string; icon: React.ElementType }> = {
  campaigns: { label: "Campaigns",  icon: Layers      },
  adsets:    { label: "Ad Sets",    icon: LayoutList   },
  ads:       { label: "Ad Creatives", icon: ImageIcon  },
};

interface BreadcrumbItem { label: string; level: Level }

const fmt$ = (n: number) => n === 0 ? "—"
  : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function pctColor(pct: number): string {
  if (pct >= 30) return "#4ade80";
  if (pct >= 15) return "#f59e0b";
  return "#f87171";
}

// ─── Grade % bar ────────────────────────────────────────────────────────────────
function GradeBar({ pct }: { pct: number }) {
  const color = pctColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: "rgba(255,255,255,0.07)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 3, background: color,
          width: `${Math.min(100, pct)}%`, transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 40, textAlign: "right" }}>
        {fmtPct(pct)}
      </span>
    </div>
  );
}

// ─── Column header ──────────────────────────────────────────────────────────────
function ColHeader({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span style={{
      fontSize: 10, color: MUTED, textTransform: "uppercase",
      letterSpacing: "0.08em", textAlign: right ? "right" : "left",
      display: "block",
    }}>
      {children}
    </span>
  );
}

// ─── Table row ──────────────────────────────────────────────────────────────────
function DataRow({
  row, level, onClick, i,
}: {
  row: GradeRow; level: Level; onClick?: () => void; i: number;
}) {
  const canDrill = level !== "ads";
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={canDrill ? onClick : undefined}
      onMouseEnter={() => canDrill && setHover(true)}
      onMouseLeave={() => canDrill && setHover(false)}
      style={{
        display: "contents",
        cursor: canDrill ? "pointer" : "default",
      }}
    >
      {/* Name cell spans via a row-wrapper div — use CSS grid on parent */}
      <div style={{
        gridColumn: "1", display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        background: hover ? "rgba(59,130,246,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
        borderRadius: 8,
        transition: "background 0.1s",
      }}>
        <span style={{ fontSize: 13, color: hover ? "#93c5fd" : "#e2e8f0", fontWeight: 500, flex: 1, wordBreak: "break-word" }}>
          {row.name}
        </span>
        {canDrill && <ChevronRight size={14} style={{ color: hover ? ACCENT : "#334155", flexShrink: 0 }} />}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "12px 16px", background: hover ? "rgba(59,130,246,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{fmt$(row.spend)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "12px 16px", background: hover ? "rgba(59,130,246,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
        <span style={{ fontSize: 13, color: "#e2e8f0" }}>{row.totalLeads > 0 ? row.totalLeads : "—"}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "12px 16px", background: hover ? "rgba(59,130,246,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: row.grade11 > 0 ? "#a78bfa" : MUTED }}>
          {row.grade11 > 0 ? row.grade11 : "—"}
        </span>
      </div>

      <div style={{ padding: "12px 16px", background: hover ? "rgba(59,130,246,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
        {row.totalLeads > 0
          ? <GradeBar pct={row.pct11} />
          : <span style={{ fontSize: 12, color: MUTED }}>—</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "12px 16px", background: hover ? "rgba(59,130,246,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
        <span style={{ fontSize: 13, color: row.costPer11 > 0 ? "#4ade80" : MUTED }}>
          {row.costPer11 > 0 ? fmt$(row.costPer11) : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function GradeBreakdownView() {
  const [window, setWindow]   = useState<Window>("7d");
  const [level, setLevel]     = useState<Level>("campaigns");
  const [rows, setRows]       = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Drill-down state
  const [campaign, setCampaign] = useState<{ id: string; name: string } | null>(null);
  const [adSet, setAdSet]       = useState<{ id: string; name: string } | null>(null);

  // ── Fetch rows when level / selection / window changes ──────────────────────
  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "";
      if (level === "campaigns") {
        url = `/api/ads/grade/campaigns?window=${window}`;
      } else if (level === "adsets" && campaign) {
        url = `/api/ads/grade/adsets?campaignId=${campaign.id}&campaignName=${encodeURIComponent(campaign.name)}&window=${window}`;
      } else if (level === "ads" && adSet) {
        url = `/api/ads/grade/ads?adSetId=${adSet.id}&window=${window}`;
      }
      if (!url) { setRows([]); setLoading(false); return; }
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [level, window, campaign, adSet]);

  useEffect(() => { loadRows(); }, [loadRows]);

  // ── Drill-down handlers ──────────────────────────────────────────────────────
  function drillToCampaign(row: GradeRow) {
    setCampaign({ id: row.id, name: row.name });
    setAdSet(null);
    setLevel("adsets");
  }

  function drillToAdSet(row: GradeRow) {
    setAdSet({ id: row.id, name: row.name });
    setLevel("ads");
  }

  function goBack() {
    if (level === "ads") {
      setAdSet(null);
      setLevel("adsets");
    } else if (level === "adsets") {
      setCampaign(null);
      setLevel("campaigns");
    }
  }

  // ── Breadcrumb ───────────────────────────────────────────────────────────────
  const breadcrumb: BreadcrumbItem[] = [{ label: "Campaigns", level: "campaigns" }];
  if (campaign) breadcrumb.push({ label: campaign.name, level: "adsets" });
  if (adSet)    breadcrumb.push({ label: adSet.name,    level: "ads"    });

  const LevelIcon = LEVEL_META[level].icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Controls ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {breadcrumb.map((b, i) => (
            <span key={b.level} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <ChevronRight size={12} style={{ color: MUTED }} />}
              <span style={{
                fontSize: 12, fontWeight: i === breadcrumb.length - 1 ? 700 : 400,
                color: i === breadcrumb.length - 1 ? "#e2e8f0" : MUTED,
              }}>
                {b.label.length > 36 ? b.label.slice(0, 36) + "…" : b.label}
              </span>
            </span>
          ))}
        </div>

        {/* Window picker */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setWindow(w.key)}
              style={{
                padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none",
                background: window === w.key ? ACCENT : CARD,
                color:      window === w.key ? "#fff" : MUTED,
                cursor: "pointer",
              }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div style={{
        background: BG, borderRadius: 16, border: `1px solid ${BORDER}`,
        overflow: "hidden",
      }}>
        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 20px",
          borderBottom: `1px solid ${BORDER}`,
          background: CARD,
        }}>
          {level !== "campaigns" && (
            <button onClick={goBack} style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "transparent", border: "none", cursor: "pointer",
              color: ACCENT, fontSize: 12, fontWeight: 600, padding: 0,
            }}>
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {level !== "campaigns" && (
            <div style={{ width: 1, height: 14, background: BORDER }} />
          )}
          <LevelIcon size={15} style={{ color: ACCENT }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
            {LEVEL_META[level].label}
          </span>
          {level !== "campaigns" && (
            <span style={{ fontSize: 11, color: MUTED }}>
              — {level === "adsets" ? campaign?.name : adSet?.name}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: MUTED }}>
            Grade = 11th
          </span>
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 130px 90px 90px 160px 130px",
          padding: "8px 16px", gap: 0,
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <ColHeader>Name</ColHeader>
          <ColHeader right>Spend</ColHeader>
          <ColHeader right>Leads</ColHeader>
          <ColHeader right>11th</ColHeader>
          <ColHeader>% 11th Grade</ColHeader>
          <ColHeader right>Cost / 11th Lead</ColHeader>
        </div>

        {/* Rows */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 130px 90px 90px 160px 130px",
        }}>
          {loading && (
            <div style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ gridColumn: "1 / -1", padding: "20px", fontSize: 12, color: "#f87171" }}>
              Error: {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              No data for this period.
            </div>
          )}
          {!loading && !error && rows.map((row, i) => (
            <DataRow
              key={row.id}
              row={row}
              level={level}
              i={i}
              onClick={level === "campaigns" ? () => drillToCampaign(row)
                     : level === "adsets"   ? () => drillToAdSet(row)
                     : undefined}
            />
          ))}
        </div>

        {/* Summary footer */}
        {!loading && rows.length > 0 && (
          <div style={{
            borderTop: `1px solid ${BORDER}`, padding: "10px 16px",
            display: "flex", gap: 24, flexWrap: "wrap",
          }}>
            {[
              { label: "Total Spend",      val: fmt$(rows.reduce((s, r) => s + r.spend, 0))          },
              { label: "Total Leads",      val: rows.reduce((s, r) => s + r.totalLeads, 0).toString() },
              { label: "Total 11th Grade", val: rows.reduce((s, r) => s + r.grade11, 0).toString()   },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{s.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
