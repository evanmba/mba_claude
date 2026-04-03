"use client";

import type { CreativeSpend } from "@/lib/attribution";

const fmt$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BG     = "#0b1628";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED  = "#475569";
const ACCENT = "#3b82f6";

const ROWS: { key: keyof CreativeSpend; label: string }[] = [
  { key: "spend4d",  label: "4 Days"  },
  { key: "spend7d",  label: "7 Days"  },
  { key: "spend14d", label: "14 Days" },
  { key: "spend30d", label: "30 Days" },
];

function SpendCard({ data }: { data: CreativeSpend }) {
  return (
    <div style={{
      background: BG, borderRadius: 16, border: `1px solid ${BORDER}`,
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* Creative name */}
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {data.label}
      </p>

      {/* Spend rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ROWS.map(({ key, label }) => (
          <div key={key} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>{label}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              {fmt$(data[key] as number)}
            </span>
          </div>
        ))}
      </div>

      {/* Divider + accent bar */}
      <div style={{ height: 2, borderRadius: 1, background: ACCENT, opacity: 0.4, marginTop: 4 }} />
    </div>
  );
}

export function SpendCards({ data }: { data: CreativeSpend[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
      {data.map((d) => <SpendCard key={d.label} data={d} />)}
    </div>
  );
}
