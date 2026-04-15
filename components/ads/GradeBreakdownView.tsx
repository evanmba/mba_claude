"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft, Layers, LayoutList, ImageIcon } from "lucide-react";
import type { GradeRow } from "@/app/api/ads/grade/campaigns/route";

type Level  = "campaigns" | "adsets" | "ads";
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
  campaigns: { label: "Campaigns",    icon: Layers     },
  adsets:    { label: "Ad Sets",      icon: LayoutList },
  ads:       { label: "Ad Creatives", icon: ImageIcon  },
};

function pct11Color(pct: number) {
  if (pct >= 30) return "#4ade80";
  if (pct >= 15) return "#f59e0b";
  return "#f87171";
}

const fmt$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmtDec = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── Sub-components ────────────────────────────────────────────────────────────

function PctBar({ pct }: { pct: number }) {
  const color = pct11Color(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: color, width: `${Math.min(100, pct)}%`, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function Hdr({ children, right, white }: { children: React.ReactNode; right?: boolean; white?: boolean }) {
  return (
    <div style={{ fontSize: 10, color: white ? "#e2e8f0" : MUTED, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: right ? "right" : "left", padding: "8px 12px" }}>
      {children}
    </div>
  );
}

function Cell({ children, right, style }: { children: React.ReactNode; right?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: "11px 12px", textAlign: right ? "right" : "left", display: "flex", alignItems: "center", justifyContent: right ? "flex-end" : "flex-start", ...style }}>
      {children}
    </div>
  );
}

function DataRow({ row, level, onClick, i }: { row: GradeRow; level: Level; onClick?: () => void; i: number }) {
  const [hov, setHov] = useState(false);
  const canDrill = level !== "ads";
  const rowBg = hov ? "rgba(59,130,246,0.07)" : i % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent";

  const cells = (
    <>
      {/* Name */}
      <Cell style={{ background: rowBg, gap: 6 }}>
        <span style={{ fontSize: 13, color: hov ? "#93c5fd" : "#e2e8f0", fontWeight: 500, flex: 1, wordBreak: "break-word", lineHeight: 1.3 }}>
          {row.name}
        </span>
        {canDrill && <ChevronRight size={13} style={{ color: hov ? ACCENT : "#1e293b", flexShrink: 0 }} />}
      </Cell>

      {/* Spend */}
      <Cell right style={{ background: rowBg }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{fmt$(row.spend)}</span>
      </Cell>

      {/* Booked Calls */}
      <Cell right style={{ background: rowBg }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: row.bookedCalls > 0 ? "#60a5fa" : MUTED }}>
          {row.bookedCalls > 0 ? row.bookedCalls : "—"}
        </span>
      </Cell>

      {/* Cost / Booked Call */}
      <Cell right style={{ background: rowBg }}>
        <span style={{ fontSize: 12, color: row.costPerBooked > 0 ? "#34d399" : MUTED }}>
          {row.costPerBooked > 0 ? fmtDec(row.costPerBooked) : "—"}
        </span>
      </Cell>

      {/* Leads */}
      <Cell right style={{ background: rowBg }}>
        <span style={{ fontSize: 13, color: row.totalLeads > 0 ? "#e2e8f0" : MUTED }}>
          {row.totalLeads > 0 ? row.totalLeads : "—"}
        </span>
      </Cell>

      {/* 11th Grade */}
      <Cell right style={{ background: rowBg }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: row.grade11 > 0 ? "#a78bfa" : MUTED }}>
          {row.grade11 > 0 ? row.grade11 : "—"}
        </span>
      </Cell>

      {/* % 11th */}
      <Cell style={{ background: rowBg }}>
        {row.totalLeads > 0
          ? <PctBar pct={row.pct11} />
          : <span style={{ fontSize: 11, color: MUTED }}>—</span>}
      </Cell>

      {/* Cost / 11th Lead */}
      <Cell right style={{ background: rowBg }}>
        <span style={{ fontSize: 12, color: row.costPer11 > 0 ? "#4ade80" : MUTED }}>
          {row.costPer11 > 0 ? fmtDec(row.costPer11) : "—"}
        </span>
      </Cell>
    </>
  );

  return (
    <div
      className="gb-row"
      onClick={canDrill ? onClick : undefined}
      onMouseEnter={() => canDrill && setHov(true)}
      onMouseLeave={() => canDrill && setHov(false)}
      style={{ display: "contents", cursor: canDrill ? "pointer" : "default" }}
    >
      {cells}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function GradeBreakdownView() {
  const [win, setWin]       = useState<Window>("7d");
  const [level, setLevel]   = useState<Level>("campaigns");
  const [rows, setRows]     = useState<GradeRow[]>([]);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [campaign, setCampaign] = useState<{ id: string; name: string } | null>(null);
  const [adSet,    setAdSet]    = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoad(true); setError(null);
    try {
      let url = "";
      if (level === "campaigns") {
        url = `/api/ads/grade/campaigns?window=${win}`;
      } else if (level === "adsets" && campaign) {
        url = `/api/ads/grade/adsets?campaignId=${campaign.id}&campaignName=${encodeURIComponent(campaign.name)}&window=${win}`;
      } else if (level === "ads" && adSet) {
        url = `/api/ads/grade/ads?adSetId=${adSet.id}&window=${win}`;
      }
      if (!url) { setRows([]); setLoad(false); return; }
      const res = await fetch(url);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Request failed");
      setRows(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setRows([]);
    } finally { setLoad(false); }
  }, [level, win, campaign, adSet]);

  useEffect(() => { load(); }, [load]);

  function drillCampaign(row: GradeRow) { setCampaign({ id: row.id, name: row.name }); setAdSet(null); setLevel("adsets"); }
  function drillAdSet(row: GradeRow)    { setAdSet({ id: row.id, name: row.name }); setLevel("ads"); }
  function goBack() {
    if (level === "ads")    { setAdSet(null); setLevel("adsets"); }
    else if (level === "adsets") { setCampaign(null); setLevel("campaigns"); }
  }

  const breadcrumb = [
    { label: "Campaigns", active: level === "campaigns" },
    ...(campaign ? [{ label: campaign.name, active: level === "adsets" }] : []),
    ...(adSet    ? [{ label: adSet.name,    active: level === "ads"    }] : []),
  ];

  const LIcon = LEVEL_META[level].icon;

  // Column layout — 8 columns
  const COLS = "minmax(160px,1fr) 100px 90px 100px 72px 60px 130px 110px";

  const totSpend  = rows.reduce((s, r) => s + r.spend, 0);
  const totBooked = rows.reduce((s, r) => s + r.bookedCalls, 0);
  const totLeads  = rows.reduce((s, r) => s + r.totalLeads, 0);
  const tot11     = rows.reduce((s, r) => s + r.grade11, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <ChevronRight size={11} style={{ color: MUTED }} />}
              <span style={{ fontSize: 12, fontWeight: b.active ? 700 : 400, color: b.active ? "#e2e8f0" : MUTED }}>
                {b.label.length > 40 ? b.label.slice(0, 40) + "…" : b.label}
              </span>
            </span>
          ))}
        </div>
        {/* Window */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setWin(w.key)} style={{
              padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none",
              background: win === w.key ? ACCENT : CARD, color: win === w.key ? "#fff" : MUTED, cursor: "pointer",
            }}>{w.label}</button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div style={{ background: BG, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>

        {/* Panel header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: CARD, flexWrap: "wrap" }}>
          {level !== "campaigns" && (
            <>
              <button onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 3, background: "transparent", border: "none", cursor: "pointer", color: ACCENT, fontSize: 12, fontWeight: 600, padding: 0 }}>
                <ChevronLeft size={13} /> Back
              </button>
              <div style={{ width: 1, height: 12, background: BORDER }} />
            </>
          )}
          <LIcon size={14} style={{ color: ACCENT }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{LEVEL_META[level].label}</span>
          {level !== "campaigns" && (
            <span style={{ fontSize: 11, color: MUTED, marginLeft: 2 }}>
              — {level === "adsets" ? campaign?.name : adSet?.name}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 10, color: MUTED }}>
            Booked Calls: {win} window · Leads + Grade: from Apr 15 2026
          </span>
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, borderBottom: `1px solid ${BORDER}` }}>
          <Hdr>Name</Hdr>
          <Hdr right white>Spend</Hdr>
          <Hdr right white>Booked</Hdr>
          <Hdr right white>$/Booked</Hdr>
          <Hdr right white>Leads</Hdr>
          <Hdr right white>11th</Hdr>
          <Hdr white>% 11th Grade</Hdr>
          <Hdr right white>$/11th Lead</Hdr>
        </div>

        {/* Data rows */}
        <div style={{ display: "grid", gridTemplateColumns: COLS }}>
          {loading && (
            <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ gridColumn: "1 / -1", padding: "20px", fontSize: 12, color: "#f87171" }}>
              Error: {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              No data for this period.
            </div>
          )}
          {!loading && !error && rows.map((row, i) => (
            <DataRow
              key={row.id}
              row={row}
              level={level}
              i={i}
              onClick={
                level === "campaigns" ? () => drillCampaign(row)
                : level === "adsets" ? () => drillAdSet(row)
                : undefined
              }
            />
          ))}
        </div>

        {/* Footer totals */}
        {!loading && rows.length > 0 && (
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: "10px 16px", display: "flex", gap: 20, flexWrap: "wrap", background: "rgba(255,255,255,0.01)" }}>
            {[
              { label: "Total Spend",      val: fmt$(totSpend)           },
              { label: "Booked Calls",     val: totBooked > 0 ? String(totBooked) : "—" },
              { label: "Avg $/Booked",     val: totBooked > 0 ? fmt$(totSpend / totBooked) : "—" },
              { label: "Total Leads",      val: totLeads > 0  ? String(totLeads)  : "—" },
              { label: "Total 11th Grade", val: tot11 > 0     ? String(tot11)     : "—" },
              { label: "Avg % 11th",       val: totLeads > 0  ? `${((tot11 / totLeads) * 100).toFixed(1)}%` : "—" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", gap: 5, alignItems: "baseline" }}>
                <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{s.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
