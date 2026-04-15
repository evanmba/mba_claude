"use client";

import { useEffect, useState, useRef } from "react";
import { X, Users, Phone, CheckCircle, DollarSign, Loader2 } from "lucide-react";
import type { DetailRecord } from "@/app/api/ads/detail/route";

export type DetailType = "leads" | "booked" | "taken" | "deals";

interface Props {
  type:    DetailType;
  adName:  string;
  window:  string;
  onClose: () => void;
}

const MUTED  = "#475569";
const BORDER = "rgba(255,255,255,0.07)";
const CARD   = "#0f172a";
const BG     = "#080f1c";

const TYPE_META: Record<DetailType, { label: string; icon: React.ElementType; color: string }> = {
  leads:  { label: "Leads",        icon: Users,       color: "#60a5fa" },
  booked: { label: "Booked Calls", icon: Phone,       color: "#60a5fa" },
  taken:  { label: "Taken Calls",  icon: CheckCircle, color: "#a78bfa" },
  deals:  { label: "Deals",        icon: DollarSign,  color: "#f59e0b" },
};

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: "8px 12px",
      textAlign: right ? "right" : "left",
      fontSize: 10,
      fontWeight: 700,
      color: MUTED,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      borderBottom: `1px solid ${BORDER}`,
      background: "#0a1020",
      position: "sticky",
      top: 0,
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}

function Td({ children, right, muted }: { children: React.ReactNode; right?: boolean; muted?: boolean }) {
  return (
    <td style={{
      padding: "8px 12px",
      textAlign: right ? "right" : "left",
      fontSize: 12,
      color: muted ? MUTED : "#e2e8f0",
      borderBottom: `1px solid ${BORDER}`,
      whiteSpace: "nowrap",
    }}>
      {children}
    </td>
  );
}

export function MetricDetailModal({ type, adName, window, onClose }: Props) {
  const [records, setRecords] = useState<DetailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ads/detail?type=${type}&adName=${encodeURIComponent(adName)}&window=${window}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d)) setRecords(d as DetailRecord[]);
        else setError((d as { error: string }).error ?? "Unknown error");
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [type, adName, window]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    globalThis.window?.addEventListener("keydown", handler);
    return () => globalThis.window?.removeEventListener("keydown", handler);
  }, [onClose]);

  const meta = TYPE_META[type];
  const Icon = meta.icon;

  // Determine which columns to show
  const showGrade  = type === "leads";
  const showShowed = type === "booked" || type === "deals";
  const showCash   = type === "deals";

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          9999,
        background:      "rgba(0,0,0,0.72)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "24px 16px",
        backdropFilter:  "blur(2px)",
      }}
    >
      <div style={{
        background:    CARD,
        border:        `1px solid ${BORDER}`,
        borderRadius:  14,
        width:         "100%",
        maxWidth:      620,
        maxHeight:     "80vh",
        display:       "flex",
        flexDirection: "column",
        boxShadow:     "0 24px 64px rgba(0,0,0,0.6)",
        overflow:      "hidden",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
              {meta.label}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {adName}
            </div>
          </div>
          {!loading && (
            <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>
              {records.length} record{records.length !== 1 ? "s" : ""}
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: MUTED, display: "flex", alignItems: "center", marginLeft: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "40px 20px", color: MUTED, fontSize: 13 }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              Loading…
            </div>
          )}
          {error && (
            <div style={{ padding: "20px", fontSize: 12, color: "#f87171" }}>
              Error: {error}
            </div>
          )}
          {!loading && !error && records.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              No records found for this ad creative in the selected window.
            </div>
          )}
          {!loading && !error && records.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", background: BG }}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Name</Th>
                  {type === "leads"  && <Th right>Lead Date</Th>}
                  {type !== "leads"  && <Th right>Booked Date</Th>}
                  {showGrade         && <Th right>Grade</Th>}
                  {showShowed        && <Th right>Taken</Th>}
                  {showCash          && <Th right>Cash</Th>}
                  {type === "deals"  && <Th right>Closed</Th>}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}
                  >
                    <Td muted>{i + 1}</Td>
                    <Td>{r.name || "—"}</Td>
                    <Td right muted>{r.date ?? "—"}</Td>
                    {showGrade  && <Td right>{r.grade ?? "—"}</Td>}
                    {showShowed && <Td right>{r.showed ? <span style={{ color: "#a78bfa" }}>✓</span> : <span style={{ color: "#334155" }}>—</span>}</Td>}
                    {showCash   && <Td right>{r.cash ? `$${r.cash.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}</Td>}
                    {type === "deals" && <Td right>{r.closed ? <span style={{ color: "#4ade80" }}>✓</span> : <span style={{ color: "#334155" }}>—</span>}</Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
