"use client";

import { useState } from "react";
import { type Call, type Customer } from "@/lib/funnel";
import { Search } from "lucide-react";

const $$ = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

interface Props {
  calls: Call[];
  customers: Customer[];
}

type SubTab = "calls" | "customers";

export function CallsView({ calls, customers }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("calls");
  const [search, setSearch] = useState("");

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Calls" value={String(calls.length)} color="#f59e0b" />
        <SummaryCard
          label="Showed"
          value={String(calls.filter((c) => c.showed).length)}
          color="#22c55e"
        />
        <SummaryCard
          label="Closed"
          value={String(calls.filter((c) => c.cashCollected > 0).length)}
          color="#3b82f6"
        />
        <SummaryCard label="Active Customers" value={String(customers.length)} color="#d946ef" />
      </div>

      {/* Sub-tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-lg mb-4 w-fit"
        style={{ background: "var(--secondary)" }}
      >
        {(["calls", "customers"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setSubTab(t); setSearch(""); }}
            className="px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all"
            style={{
              background: subTab === t ? "var(--card)" : "transparent",
              color: subTab === t ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {t === "calls" ? `Calls (${calls.length})` : `Customers (${customers.length})`}
          </button>
        ))}
      </div>

      {subTab === "calls" ? (
        <CallsTable calls={calls} search={search} setSearch={setSearch} />
      ) : (
        <CustomersTable customers={customers} search={search} setSearch={setSearch} />
      )}
    </div>
  );
}

// ─── Calls table ───────────────────────────────────────────────────────────

function CallsTable({
  calls,
  search,
  setSearch,
}: {
  calls: Call[];
  search: string;
  setSearch: (s: string) => void;
}) {
  const filtered = calls.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.setter.toLowerCase().includes(q) ||
      c.closer.toLowerCase().includes(q) ||
      c.callOutcome.toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <TableHeader title="Calls Log" search={search} setSearch={setSearch} count={filtered.length} total={calls.length} />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
              {["Name","Booked","Appt","Setter","Closer","Outcome","Show","Offered","Closed","Cash","Revenue","Product"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((call, i) => (
              <tr
                key={call.email + call.bookedDate + i}
                style={{
                  background: i % 2 === 0 ? "var(--card)" : "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <td className="px-3 py-2 whitespace-nowrap font-medium" style={{ color: "var(--foreground)" }}>
                  {call.firstName} {call.lastName}
                </td>
                <Td muted>{call.bookedDate}</Td>
                <Td muted>{call.appointmentDate}</Td>
                <Td>{call.setter}</Td>
                <Td>{call.closer}</Td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <OutcomeBadge outcome={call.callOutcome} canceled={call.canceled} noShow={call.noShow} showed={call.showed} />
                </td>
                <td className="px-3 py-2">
                  <BoolDot value={call.showed} />
                </td>
                <td className="px-3 py-2">
                  <BoolDot value={call.offered} />
                </td>
                <td className="px-3 py-2">
                  <BoolDot value={call.cashCollected > 0} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold" style={{ color: call.cashCollected > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
                  {call.cashCollected > 0 ? $$(call.cashCollected) : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: call.revenue > 0 ? "#3b82f6" : "var(--muted-foreground)" }}>
                  {call.revenue > 0 ? $$(call.revenue) : "—"}
                </td>
                <Td muted>{call.productTerm || "—"}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                  {calls.length === 0 ? "No calls data — ensure the CALLS tab is accessible." : "No results match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Customers table ───────────────────────────────────────────────────────

function CustomersTable({
  customers,
  search,
  setSearch,
}: {
  customers: Customer[];
  search: string;
  setSearch: (s: string) => void;
}) {
  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.closer.toLowerCase().includes(q) ||
      c.term.toLowerCase().includes(q)
    );
  });

  const totalCash = customers.reduce((s, c) => s + c.cashCollected, 0);
  const totalRev  = customers.reduce((s, c) => s + c.revenue, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Total Cash (Customers)</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#22c55e" }}>{$$(totalCash)}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Total Revenue (Customers)</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#3b82f6" }}>{$$(totalRev)}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <TableHeader title="Active Customers" search={search} setSearch={setSearch} count={filtered.length} total={customers.length} />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                {["Name","Term","Join Date","End Date","Remaining","Closer","Cash","Revenue","Notes"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.email + c.joinDate + i}
                  style={{
                    background: i % 2 === 0 ? "var(--card)" : "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-medium" style={{ color: "var(--foreground)" }}>
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                    >
                      {c.term}
                    </span>
                  </td>
                  <Td muted>{c.joinDate}</Td>
                  <Td muted>{c.endDate}</Td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#f59e0b" }}>
                    {c.remainingDays}
                  </td>
                  <Td>{c.closer || c.setter || "—"}</Td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold" style={{ color: "#22c55e" }}>
                    {$$(c.cashCollected)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#3b82f6" }}>
                    {$$(c.revenue)}
                  </td>
                  <td className="px-3 py-2 max-w-xs" style={{ color: "var(--muted-foreground)" }}>
                    <span className="block truncate" style={{ maxWidth: 200 }} title={c.internalNotes}>
                      {c.internalNotes || "—"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    {customers.length === 0 ? "No customer data — ensure the CUSTOMERS tab is accessible." : "No results match."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function TableHeader({
  title,
  search,
  setSearch,
  count,
  total,
}: {
  title: string;
  search: string;
  setSearch: (s: string) => void;
  count: number;
  total: number;
}) {
  return (
    <div
      className="px-5 py-3 flex items-center justify-between gap-4"
      style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
        {title}
        <span className="ml-2 text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>
          ({count} / {total})
        </span>
      </p>
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
      >
        <Search size={13} style={{ color: "var(--muted-foreground)" }} />
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-xs"
          style={{ color: "var(--foreground)", width: 160 }}
        />
      </div>
    </div>
  );
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className="px-3 py-2 whitespace-nowrap" style={{ color: muted ? "var(--muted-foreground)" : "var(--foreground)" }}>
      {children}
    </td>
  );
}

function BoolDot({ value }: { value: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: value ? "#22c55e" : "var(--border)" }}
    />
  );
}

function OutcomeBadge({
  outcome,
  canceled,
  noShow,
  showed,
}: {
  outcome: string;
  canceled: boolean;
  noShow: boolean;
  showed: boolean;
}) {
  const label = outcome || (canceled ? "Canceled" : noShow ? "No Show" : showed ? "Showed" : "—");
  const color = canceled || noShow
    ? { bg: "rgba(239,68,68,0.15)", text: "#ef4444" }
    : showed
    ? { bg: "rgba(34,197,94,0.15)", text: "#22c55e" }
    : { bg: "rgba(148,163,184,0.1)", text: "var(--muted-foreground)" };

  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: color.bg, color: color.text }}
    >
      {label}
    </span>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
