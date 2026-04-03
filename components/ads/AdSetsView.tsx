"use client";

import type { CreativeAttribution, CreativeRow } from "@/lib/attribution";
import type { AdWindow } from "@/lib/meta";

const $$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (n: number) => (n === 0 ? "—" : String(n));

const CARD_BG  = "#0b1628";
const BORDER   = "rgba(255,255,255,0.06)";
const HDR_CLR  = "#475569";
const TEXT_CLR = "#e2e8f0";
const SUB_CLR  = "#64748b";

interface Props {
  data: CreativeAttribution;
  window: AdWindow;
}

export function CreativeTable({ data }: Props) {
  const { rows, windowLabel, error } = data;

  if (error) {
    return (
      <div style={{ padding: 16, borderRadius: 12, background: CARD_BG, color: "#f87171", fontSize: 13 }}>
        Error loading data: {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 24, borderRadius: 12, background: CARD_BG, color: SUB_CLR, fontSize: 13, textAlign: "center" }}>
        No ad creative data found for {windowLabel}.
      </div>
    );
  }

  // Totals row
  const totals: CreativeRow = rows.reduce(
    (acc, r) => ({
      adName: "Total",
      spend:             acc.spend             + r.spend,
      bookedCalls:       acc.bookedCalls       + r.bookedCalls,
      shownAppointments: acc.shownAppointments + r.shownAppointments,
      deals:             acc.deals             + r.deals,
    }),
    { adName: "Total", spend: 0, bookedCalls: 0, shownAppointments: 0, deals: 0 }
  );

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    color: HDR_CLR,
    textAlign: "right" as const,
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${BORDER}`,
  };
  const tdStyle: React.CSSProperties = {
    padding: "11px 14px",
    fontSize: 13,
    color: TEXT_CLR,
    textAlign: "right" as const,
    borderBottom: `1px solid ${BORDER}`,
  };
  const tdNameStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: "left",
    color: "#94a3b8",
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ borderRadius: 16, background: CARD_BG, overflow: "hidden", border: `1px solid ${BORDER}` }}>
      {/* Window label */}
      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
        <span style={{ color: SUB_CLR, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {windowLabel}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Ad Creative</th>
              <th style={thStyle}>Spend</th>
              <th style={thStyle}>Booked</th>
              <th style={thStyle}>Shown</th>
              <th style={thStyle}>Deals</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ transition: "background 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <td style={tdNameStyle} title={r.adName}>{r.adName || "—"}</td>
                <td style={tdStyle}>{$$(r.spend)}</td>
                <td style={{ ...tdStyle, color: r.bookedCalls > 0 ? "#60a5fa" : SUB_CLR }}>{num(r.bookedCalls)}</td>
                <td style={{ ...tdStyle, color: r.shownAppointments > 0 ? "#4ade80" : SUB_CLR }}>{num(r.shownAppointments)}</td>
                <td style={{ ...tdStyle, color: r.deals > 0 ? "#a78bfa" : SUB_CLR }}>{num(r.deals)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${BORDER}` }}>
              <td style={{ ...tdStyle, textAlign: "left", color: HDR_CLR, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "none" }}>
                Total
              </td>
              <td style={{ ...tdStyle, fontWeight: 700, borderBottom: "none" }}>{$$(totals.spend)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: "#60a5fa", borderBottom: "none" }}>{num(totals.bookedCalls)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: "#4ade80", borderBottom: "none" }}>{num(totals.shownAppointments)}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: "#a78bfa", borderBottom: "none" }}>{num(totals.deals)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
