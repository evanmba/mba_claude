"use client";

import { useRouter } from "next/navigation";
import type { CreativeSpend, AdWindow } from "@/lib/attribution";

const fmt$ = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BG     = "#0b1628";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED  = "#475569";
const ACCENT = "#3b82f6";

const WINDOWS: { key: AdWindow; label: string }[] = [
  { key: "7d",    label: "7 Days"  },
  { key: "14d",   label: "14 Days" },
  { key: "month", label: "30 Days" },
];

const fmt$int = (n: number) =>
  n === 0 ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function StatRow({ label, count, spend, color, showPct }: {
  label: string; count: number; spend: number; color?: string;
  showPct?: number; // taken / booked %
}) {
  const cost = count > 0 && spend > 0 ? spend / count : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: MUTED, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: color ?? "#e2e8f0", minWidth: 28, textAlign: "right" }}>
        {count === 0 ? "—" : count}
      </span>
      <span style={{ fontSize: 12, color: "#334155", minWidth: 72, textAlign: "right" }}>
        {cost > 0 ? fmt$int(cost) : "—"}
      </span>
      <span style={{ fontSize: 12, minWidth: 44, textAlign: "right", color: showPct != null ? (showPct >= 60 ? "#4ade80" : showPct >= 40 ? "#f59e0b" : "#f87171") : "transparent" }}>
        {showPct != null ? `${showPct.toFixed(0)}%` : "—"}
      </span>
    </div>
  );
}

function SpendCard({ data }: { data: CreativeSpend }) {
  return (
    <div style={{
      background: BG, borderRadius: 16, border: `1px solid ${BORDER}`,
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14,
    }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {data.label}
      </p>

      {/* Spend — big number */}
      <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {fmt$(data.spend)}
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: BORDER }} />

      {/* Call metrics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 10, color: "#1e3a5f", minWidth: 28, textAlign: "right" }}>#</span>
          <span style={{ fontSize: 10, color: "#1e3a5f", minWidth: 72, textAlign: "right" }}>Cost/ea</span>
          <span style={{ fontSize: 10, color: "#1e3a5f", minWidth: 44, textAlign: "right" }}>Show%</span>
        </div>
        <StatRow label="Leads"        count={data.leads}        spend={data.spend} color="#f59e0b" />
        <StatRow label="Booked Calls" count={data.bookedCalls} spend={data.spend} color="#60a5fa" />
        <StatRow label="Taken Calls"  count={data.takenCalls}  spend={data.spend} color="#4ade80"
          showPct={data.bookedCalls > 0 ? (data.takenCalls / data.bookedCalls) * 100 : undefined} />
        <StatRow label="Deals"        count={data.deals}        spend={data.spend} color="#a78bfa" />
      </div>

      <div style={{ height: 2, borderRadius: 1, background: ACCENT, opacity: 0.35 }} />
    </div>
  );
}

export function SpendCards({ data, window }: { data: CreativeSpend[]; window: AdWindow }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-5">
      {/* Period selector */}
      <div className="flex rounded-lg overflow-hidden self-start" style={{ border: "1px solid var(--border)" }}>
        {WINDOWS.map((w) => (
          <button key={w.key} onClick={() => router.push(`/ads?w=${w.key}`)}
            className="px-4 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: window === w.key ? "#3b82f6" : "var(--card)",
              color:      window === w.key ? "#fff"    : "var(--muted-foreground)",
            }}>
            {w.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {data.map((d) => <SpendCard key={d.label} data={d} />)}
      </div>
    </div>
  );
}
