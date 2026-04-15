"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { LibraryAdSetRow } from "@/app/api/ads/library/route";
import type { LibraryAdRow }    from "@/app/api/ads/library/creatives/route";

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

// ─── Formatters ────────────────────────────────────────────────────────────────

const fmt$    = (n: number) => n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmtRoas = (n: number) => n === 0 ? "—" : `${n.toFixed(2)}x`;
const fmtN    = (n: number) => n === 0 ? "—" : String(n);
const fmtPct  = (n: number, graded: number) => graded === 0 ? "—" : `${n.toFixed(1)}%`;

function roasColor(r: number) {
  if (r >= 2)   return "#4ade80";
  if (r >= 1)   return "#f59e0b";
  return r > 0 ? "#f87171" : MUTED;
}
function pctColor(p: number) {
  if (p >= 30) return "#4ade80";
  if (p >= 15) return "#f59e0b";
  return "#f87171";
}

// ─── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumb({ url, size = 80 }: { url: string; size?: number }) {
  const [err, setErr] = useState(false);
  const h = Math.round(size * 0.65);
  if (!url || err) {
    return (
      <div style={{ width: size, height: h, borderRadius: 6, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <ImageIcon size={size * 0.3} style={{ color: "#334155" }} />
      </div>
    );
  }
  return (
    <img
      src={url}
      width={size}
      height={h}
      onError={() => setErr(true)}
      referrerPolicy="no-referrer"
      style={{ width: size, height: h, objectFit: "cover", borderRadius: 6, flexShrink: 0, display: "block" }}
      alt=""
    />
  );
}

// ─── Metric chip ───────────────────────────────────────────────────────────────

function Chip({ label, val, color }: { label: string; val: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color ?? "#e2e8f0" }}>{val}</span>
    </div>
  );
}

// ─── Ad Set row ────────────────────────────────────────────────────────────────

function AdSetRow({ row, onClick, i }: { row: LibraryAdSetRow; onClick: () => void; i: number }) {
  const [hov, setHov] = useState(false);
  const canDrill = row.adCount > 1;
  const cpl      = row.totalLeads > 0 ? row.spend / row.totalLeads : 0;
  const cashRoas = row.cashCollected > 0 && row.spend > 0 ? row.cashCollected / row.spend : 0;
  const revRoas  = row.revenue       > 0 && row.spend > 0 ? row.revenue       / row.spend : 0;

  const bg = hov && canDrill
    ? "rgba(59,130,246,0.06)"
    : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent";

  return (
    <div
      onClick={canDrill ? onClick : undefined}
      onMouseEnter={() => canDrill && setHov(true)}
      onMouseLeave={() => canDrill && setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "10px 16px", background: bg,
        cursor: canDrill ? "pointer" : "default",
        borderBottom: `1px solid ${BORDER}`,
        transition: "background 0.15s",
        minWidth: "max-content",
      }}
    >
      {/* Thumbnail */}
      <Thumb url={row.thumbnailUrl} size={88} />

      {/* Name + campaign + badge */}
      <div style={{ minWidth: 180, maxWidth: 240, flex: "0 0 200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: hov ? "#93c5fd" : "#e2e8f0", lineHeight: 1.3 }}>
            {row.name}
          </span>
          {canDrill && (
            <span style={{ fontSize: 10, background: "rgba(59,130,246,0.15)", color: ACCENT, borderRadius: 4, padding: "1px 6px", fontWeight: 700, whiteSpace: "nowrap" }}>
              {row.adCount} creatives
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{row.campaignName}</div>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", flex: 1 }}>
        <Chip label="Spend"     val={fmt$(row.spend)} />
        <Chip label="Leads"     val={fmtN(row.totalLeads)} />
        <Chip label="CPL"       val={fmt$(cpl)} />
        <Chip label="11th%"     val={fmtPct(row.pct11, row.gradedLeads)} color={row.gradedLeads > 0 ? pctColor(row.pct11) : MUTED} />
        <Chip label="Booked"    val={fmtN(row.bookedCalls)}  color={row.bookedCalls > 0 ? "#60a5fa" : MUTED} />
        <Chip label="CPC"       val={fmt$(row.costPerBooked)} />
        <Chip label="Taken"     val={fmtN(row.takenCalls)}   color={row.takenCalls > 0 ? "#a78bfa" : MUTED} />
        <Chip label="CPT"       val={fmt$(row.costPerTaken)} />
        <Chip label="Deals"     val={fmtN(row.deals)}        color={row.deals > 0 ? "#f59e0b" : MUTED} />
        <Chip label="Cost/Deal" val={fmt$(row.costPerDeal)} />
        <Chip label="Cash ROAS" val={fmtRoas(cashRoas)} color={roasColor(cashRoas)} />
        <Chip label="Rev ROAS"  val={fmtRoas(revRoas)}  color={roasColor(revRoas * 0.67)} />
      </div>

      {canDrill && <ChevronRight size={14} style={{ color: hov ? ACCENT : "#1e293b", flexShrink: 0 }} />}
    </div>
  );
}

// ─── Creative card ─────────────────────────────────────────────────────────────

function CreativeCard({ row }: { row: LibraryAdRow }) {
  const cpl      = row.totalLeads > 0 ? row.spend / row.totalLeads : 0;
  const cashRoas = row.cashCollected > 0 && row.spend > 0 ? row.cashCollected / row.spend : 0;
  const revRoas  = row.revenue       > 0 && row.spend > 0 ? row.revenue       / row.spend : 0;

  return (
    <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Thumbnail */}
      <div style={{ position: "relative", background: "#0f1e35", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {row.thumbnailUrl ? (
          <img
            src={row.thumbnailUrl}
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            alt=""
          />
        ) : (
          <ImageIcon size={40} style={{ color: "#334155" }} />
        )}
      </div>

      {/* Ad name */}
      <div style={{ padding: "10px 12px 6px", borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4, margin: 0, wordBreak: "break-word" }}>
          {row.name}
        </p>
        <p style={{ fontSize: 11, color: MUTED, margin: "3px 0 0" }}>{fmt$(row.spend)} spend</p>
      </div>

      {/* Metrics grid */}
      <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
        <Chip label="Leads"     val={fmtN(row.totalLeads)} />
        <Chip label="CPL"       val={fmt$(cpl)} />

        <Chip label="11th%"     val={fmtPct(row.pct11, row.gradedLeads)} color={row.gradedLeads > 0 ? pctColor(row.pct11) : MUTED} />
        <Chip label="11th CPL"  val={fmt$(row.costPer11)} />

        <Chip label="Booked"    val={fmtN(row.bookedCalls)}  color={row.bookedCalls > 0 ? "#60a5fa" : MUTED} />
        <Chip label="CPC"       val={fmt$(row.costPerBooked)} />

        <Chip label="Taken"     val={fmtN(row.takenCalls)}   color={row.takenCalls > 0 ? "#a78bfa" : MUTED} />
        <Chip label="CPT"       val={fmt$(row.costPerTaken)} />

        <Chip label="Deals"     val={fmtN(row.deals)}        color={row.deals > 0 ? "#f59e0b" : MUTED} />
        <Chip label="Cost/Deal" val={fmt$(row.costPerDeal)} />

        <Chip label="Cash ROAS" val={fmtRoas(cashRoas)} color={roasColor(cashRoas)} />
        <Chip label="Rev ROAS"  val={fmtRoas(revRoas)}  color={roasColor(revRoas * 0.67)} />
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function AdLibraryView() {
  const [win, setWin]   = useState<Window>("7d");
  const [view, setView] = useState<"adsets" | "creatives">("adsets");
  const [selected, setSelected] = useState<{ id: string; name: string; adCount: number } | null>(null);

  const [adSets,     setAdSets]     = useState<LibraryAdSetRow[]>([]);
  const [creatives,  setCreatives]  = useState<LibraryAdRow[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const loadAdSets = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/ads/library?window=${win}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Request failed");
      setAdSets(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [win]);

  const loadCreatives = useCallback(async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/ads/library/creatives?adSetId=${selected.id}&window=${win}`);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Request failed");
      setCreatives(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [selected, win]);

  useEffect(() => {
    if (view === "adsets")    loadAdSets();
    if (view === "creatives") loadCreatives();
  }, [view, loadAdSets, loadCreatives]);

  function drillInto(row: LibraryAdSetRow) {
    setSelected({ id: row.id, name: row.name, adCount: row.adCount });
    setView("creatives");
  }

  function goBack() {
    setView("adsets");
    setCreatives([]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {view === "creatives" && (
            <>
              <button
                onClick={goBack}
                style={{ display: "flex", alignItems: "center", gap: 3, background: "transparent", border: "none", cursor: "pointer", color: ACCENT, fontSize: 12, fontWeight: 600, padding: 0 }}
              >
                <ChevronLeft size={13} /> Ad Sets
              </button>
              <ChevronRight size={11} style={{ color: MUTED }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selected?.name}
              </span>
              <span style={{ fontSize: 10, color: MUTED }}>({selected?.adCount} creatives)</span>
            </>
          )}
          {view === "adsets" && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Ad Sets</span>
          )}
        </div>

        {/* Window selector */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setWin(w.key)} style={{
              padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none",
              background: win === w.key ? ACCENT : CARD, color: win === w.key ? "#fff" : MUTED, cursor: "pointer",
            }}>{w.label}</button>
          ))}
        </div>
      </div>

      {/* ── Ad Sets view ── */}
      {view === "adsets" && (
        <div style={{ background: BG, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "10px 16px", background: CARD, borderBottom: `1px solid ${BORDER}`, fontSize: 10, color: MUTED }}>
            Click any ad set with multiple creatives to see individual performance · {win} window
          </div>

          {/* Rows */}
          <div style={{ overflowX: "auto" }}>
            {loading && (
              <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 13 }}>Loading…</div>
            )}
            {error && (
              <div style={{ padding: 20, fontSize: 12, color: "#f87171" }}>Error: {error}</div>
            )}
            {!loading && !error && adSets.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 13 }}>No data for this period.</div>
            )}
            {!loading && !error && adSets.map((row, i) => (
              <AdSetRow key={row.id} row={row} i={i} onClick={() => drillInto(row)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Creatives view ── */}
      {view === "creatives" && (
        <div>
          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 13 }}>Loading creatives…</div>
          )}
          {error && (
            <div style={{ padding: 20, fontSize: 12, color: "#f87171" }}>Error: {error}</div>
          )}
          {!loading && !error && creatives.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 13 }}>No creatives with spend in this period.</div>
          )}
          {!loading && !error && creatives.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}>
              {creatives.map((c) => <CreativeCard key={c.id} row={c} />)}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
