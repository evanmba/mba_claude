"use client";

import { useState } from "react";
import { type Lead } from "@/lib/funnel";
import { Search } from "lucide-react";

interface Props {
  leads: Lead[];
}

export function LeadsView({ leads }: Props) {
  const [search, setSearch] = useState("");

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.firstName.toLowerCase().includes(q) ||
      l.lastName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.source.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Leads" value={String(leads.length)} color="#d946ef" />
        <StatCard
          label="Responded NLT1"
          value={String(leads.filter((l) => l.respondedNLT1?.toLowerCase() === "yes").length)}
          color="#3b82f6"
        />
        <StatCard
          label="Parent / Athlete"
          value={String(leads.filter((l) => l.parentAthlete).length)}
          color="#22c55e"
        />
      </div>

      {/* Search + table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div
          className="px-5 py-3 flex items-center justify-between gap-4"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Leads Tracker
          </p>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          >
            <Search size={13} style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-xs"
              style={{ color: "var(--foreground)", width: 180 }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                {["Date","Name","Email","Phone","Source","NLT1","NLT2","NLT3","Type"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr
                  key={lead.email + i}
                  style={{
                    background: i % 2 === 0 ? "var(--card)" : "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <Td muted>{lead.date}</Td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium" style={{ color: "var(--foreground)" }}>
                    {lead.firstName} {lead.lastName}
                  </td>
                  <Td muted>{lead.email}</Td>
                  <Td muted>{lead.phone}</Td>
                  <td className="px-3 py-2 max-w-xs" style={{ color: "var(--muted-foreground)" }}>
                    <span
                      className="block truncate"
                      title={lead.source}
                      style={{ maxWidth: 200 }}
                    >
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge value={lead.respondedNLT1} />
                  </td>
                  <td className="px-3 py-2">
                    <Badge value={lead.respondedNLT2} />
                  </td>
                  <td className="px-3 py-2">
                    <Badge value={lead.respondedNLT3} />
                  </td>
                  <Td>{lead.parentAthlete || "—"}</Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                    {leads.length === 0
                      ? "No leads data — ensure the LEADS tab is accessible."
                      : "No results match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div
            className="px-5 py-2 text-xs"
            style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", background: "var(--card)" }}
          >
            Showing {filtered.length} of {leads.length} leads
          </div>
        )}
      </div>
    </div>
  );
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      className="px-3 py-2 whitespace-nowrap"
      style={{ color: muted ? "var(--muted-foreground)" : "var(--foreground)" }}
    >
      {children}
    </td>
  );
}

function Badge({ value }: { value: string }) {
  if (!value) return <span style={{ color: "var(--muted-foreground)" }}>—</span>;
  const isYes = value.toLowerCase() === "yes" || value.toLowerCase() === "true";
  const isNo  = value.toLowerCase() === "no"  || value.toLowerCase() === "false";
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: isYes ? "rgba(34,197,94,0.15)" : isNo ? "rgba(239,68,68,0.15)" : "rgba(148,163,184,0.15)",
        color: isYes ? "#22c55e" : isNo ? "#ef4444" : "var(--muted-foreground)",
      }}
    >
      {value}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
