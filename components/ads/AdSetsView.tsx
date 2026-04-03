"use client";

import type { CreativeAttribution, CreativeRow } from "@/lib/attribution";

const fmt$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n: number) => (n === 0 ? "—" : String(n));

const BG     = "#0b1628";
const BORDER = "rgba(255,255,255,0.06)";
const MUTED  = "#475569";

const th = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: MUTED,
  textAlign: "right",
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${BORDER}`,
  ...extra,
});

const td = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "11px 14px",
  fontSize: 13,
  color: "#e2e8f0",
  textAlign: "right",
  borderBottom: `1px solid ${BORDER}`,
  ...extra,
});

export function CreativeTable({ data }: { data: CreativeAttribution }) {
  const { rows, error } = data;

  if (error) {
    return (
      <div style={{ padding: 16, borderRadius: 12, background: BG, color: "#f87171", fontSize: 13 }}>
        Error: {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 24, borderRadius: 12, background: BG, color: MUTED, fontSize: 13, textAlign: "center" }}>
        No ad creative data found.
      </div>
    );
  }

  const totals = rows.reduce<CreativeRow>(
    (acc, r) => ({
      adName: "Total",
      spend4d:           acc.spend4d           + r.spend4d,
      spend7d:           acc.spend7d           + r.spend7d,
      spend14d:          acc.spend14d          + r.spend14d,
      spend30d:          acc.spend30d          + r.spend30d,
      bookedCalls:       acc.bookedCalls       + r.bookedCalls,
      shownAppointments: acc.shownAppointments + r.shownAppointments,
      deals:             acc.deals             + r.deals,
    }),
    { adName: "Total", spend4d: 0, spend7d: 0, spend14d: 0, spend30d: 0, bookedCalls: 0, shownAppointments: 0, deals: 0 }
  );

  return (
    <div style={{ borderRadius: 16, background: BG, overflow: "hidden", border: `1px solid ${BORDER}` }}>
      {/* Column group headers */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            {/* Group labels */}
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th style={th({ textAlign: "left", color: "transparent" })}>Ad</th>
              <th colSpan={4} style={th({ textAlign: "center", color: "#3b82f6", borderLeft: `1px solid ${BORDER}` })}>
                Spend (Meta · CBO Winners)
              </th>
              <th colSpan={3} style={th({ textAlign: "center", color: "#94a3b8", borderLeft: `1px solid ${BORDER}` })}>
                Last 30 Days
              </th>
            </tr>
            {/* Column labels */}
            <tr>
              <th style={th({ textAlign: "left" })}>Ad Creative</th>
              <th style={th({ borderLeft: `1px solid ${BORDER}` })}>4d</th>
              <th style={th()}>7d</th>
              <th style={th()}>14d</th>
              <th style={th()}>30d</th>
              <th style={th({ borderLeft: `1px solid ${BORDER}`, color: "#60a5fa" })}>Booked</th>
              <th style={th({ color: "#4ade80" })}>Shown</th>
              <th style={th({ color: "#a78bfa" })}>Deals</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <td style={td({ textAlign: "left", color: "#94a3b8", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}
                  title={r.adName}>
                  {r.adName || "—"}
                </td>
                <td style={td({ borderLeft: `1px solid ${BORDER}` })}>{fmt$(r.spend4d)}</td>
                <td style={td()}>{fmt$(r.spend7d)}</td>
                <td style={td()}>{fmt$(r.spend14d)}</td>
                <td style={td()}>{fmt$(r.spend30d)}</td>
                <td style={td({ borderLeft: `1px solid ${BORDER}`, color: r.bookedCalls > 0 ? "#60a5fa" : MUTED })}>{fmtN(r.bookedCalls)}</td>
                <td style={td({ color: r.shownAppointments > 0 ? "#4ade80" : MUTED })}>{fmtN(r.shownAppointments)}</td>
                <td style={td({ color: r.deals > 0 ? "#a78bfa" : MUTED })}>{fmtN(r.deals)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${BORDER}` }}>
              <td style={td({ textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "none" })}>Total</td>
              <td style={td({ fontWeight: 700, borderLeft: `1px solid ${BORDER}`, borderBottom: "none" })}>{fmt$(totals.spend4d)}</td>
              <td style={td({ fontWeight: 700, borderBottom: "none" })}>{fmt$(totals.spend7d)}</td>
              <td style={td({ fontWeight: 700, borderBottom: "none" })}>{fmt$(totals.spend14d)}</td>
              <td style={td({ fontWeight: 700, borderBottom: "none" })}>{fmt$(totals.spend30d)}</td>
              <td style={td({ fontWeight: 700, color: "#60a5fa", borderLeft: `1px solid ${BORDER}`, borderBottom: "none" })}>{fmtN(totals.bookedCalls)}</td>
              <td style={td({ fontWeight: 700, color: "#4ade80", borderBottom: "none" })}>{fmtN(totals.shownAppointments)}</td>
              <td style={td({ fontWeight: 700, color: "#a78bfa", borderBottom: "none" })}>{fmtN(totals.deals)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
