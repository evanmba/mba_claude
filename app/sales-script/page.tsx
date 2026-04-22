"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { Check, RotateCcw } from "lucide-react";

// ─── Config — edit these to extend ───────────────────────────────────────────

const CLOSERS = ["Evan Mendoza"];

const PROGRAMS = [
  "Full Ride Framework",
  "Triple Play Pro",
  "Triple Play Basic",
] as const;
type Program = (typeof PROGRAMS)[number];

const ACCENT = "#06b6d4";

// ─── Types ───────────────────────────────────────────────────────────────────

type CallType = "initial" | "followup";

interface Discovery {
  exitVelo: string;
  armVelo: string;
  time60: string;
  gpa: string;
  gradYear: string;
}

// ─── Placeholder copy — replace with real script later ───────────────────────

const OPENING_COPY: Record<CallType, { description: string; body: string }> = {
  initial: {
    description: "First-touch rapport and agenda set.",
    body: "Hey [first name], this is [closer] over at Mendoza Baseball Academy — thanks for jumping on. Before we dig in, I want to make sure this call is actually worth your time, so I'll ask a few questions to understand where your player is at and what you're hoping to accomplish. Sound good? [PLACEHOLDER — replace with real initial-call opening]",
  },
  followup: {
    description: "Re-engage and recap.",
    body: "Hey [first name], good to catch up — last time we talked about [recap from discovery notes]. Since then, have anything changed on your end? Here's where I think we left off and what I want to cover today. [PLACEHOLDER — replace with real follow-up opening]",
  },
};

const PROGRAM_COPY: Record<Program, { blurb: string; bullets: string[] }> = {
  "Full Ride Framework": {
    blurb: "Elite-track development + recruiting. For athletes on a D1 scholarship trajectory.",
    bullets: [
      "Full-scope dev plan + recruiting strategy",
      "Direct coach outreach + film package",
      "Monthly 1-on-1 with Evan",
    ],
  },
  "Triple Play Pro": {
    blurb: "Structured development + recruiting assist for players closing the gap to the next level.",
    bullets: [
      "Position-specific training blocks",
      "Profile build + showcase targeting",
      "Bi-weekly check-ins",
    ],
  },
  "Triple Play Basic": {
    blurb: "Foundational skill work and metrics tracking — the entry point.",
    bullets: [
      "Core training plan",
      "Metric benchmarking",
      "Quarterly progress review",
    ],
  },
};

// ─── Recommendation rule — PLACEHOLDER, refine later ─────────────────────────
// Current logic is a first-pass stub based on exit velo + GPA. Real logic
// should factor in grad year, arm velo, 60 time, and obstacles from the call.
function recommendProgram(d: Discovery): Program {
  const exitVelo = parseFloat(d.exitVelo);
  const gpa = parseFloat(d.gpa);

  if (!Number.isNaN(exitVelo) && !Number.isNaN(gpa) && exitVelo >= 90 && gpa >= 3.5) {
    return "Full Ride Framework";
  }
  if ((!Number.isNaN(exitVelo) && exitVelo >= 85) || (!Number.isNaN(gpa) && gpa >= 3.0)) {
    return "Triple Play Pro";
  }
  return "Triple Play Basic";
}

// ─── Small inline pieces ─────────────────────────────────────────────────────

function fieldValueOr(value: string, unit?: string) {
  if (!value.trim()) return <span style={{ color: "var(--muted-foreground)" }}>—</span>;
  return (
    <span style={{ color: ACCENT, fontWeight: 600 }}>
      {value}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--secondary)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
        style={inputStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SalesScriptPage() {
  const [callType, setCallType] = useState<CallType>("initial");
  const [email, setEmail] = useState("");
  const [closer, setCloser] = useState("");
  const [discovery, setDiscovery] = useState<Discovery>({
    exitVelo: "",
    armVelo: "",
    time60: "",
    gpa: "",
    gradYear: "",
  });
  const [programOverride, setProgramOverride] = useState<Program | null>(null);

  const suggested = recommendProgram(discovery);
  const selected = programOverride ?? suggested;

  const setDiscoveryField = (key: keyof Discovery) => (v: string) =>
    setDiscovery((prev) => ({ ...prev, [key]: v }));

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ─── Setup ─────────────────────────────────────────────────── */}
        <PlaceholderCard
          title="Setup"
          description="Pick the call type, log the prospect's email, and select the closer on the call."
        >
          {/* Call type toggle */}
          <div className="mt-4 flex gap-2">
            {(["initial", "followup"] as const).map((t) => {
              const active = callType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCallType(t)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    background: active ? `${ACCENT}26` : "var(--secondary)",
                    color: active ? ACCENT : "var(--muted-foreground)",
                    border: `1px solid ${active ? ACCENT : "var(--border)"}`,
                  }}
                >
                  {t === "initial" ? "Initial Call" : "Follow-Up Call"}
                </button>
              );
            })}
          </div>

          {/* Email + closer */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabeledInput
              label="Prospect Email"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="parent@example.com"
            />
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                Closer
              </label>
              <select
                value={closer}
                onChange={(e) => setCloser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <option value="">Select closer…</option>
                {CLOSERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </PlaceholderCard>

        {/* ─── Opening ──────────────────────────────────────────────── */}
        <PlaceholderCard title="Opening" description={OPENING_COPY[callType].description}>
          <div
            className="mt-4 p-4 rounded-lg text-sm leading-relaxed"
            style={{
              background: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {OPENING_COPY[callType].body}
          </div>
        </PlaceholderCard>

        {/* ─── Discovery ────────────────────────────────────────────── */}
        <PlaceholderCard
          title="Discovery"
          description="Capture the metrics that drive gap creation and program fit."
        >
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledInput
              label="Exit Velocity (mph)"
              value={discovery.exitVelo}
              onChange={setDiscoveryField("exitVelo")}
              type="number"
              step="0.1"
              placeholder="e.g. 88.5"
            />
            <LabeledInput
              label="Arm Velocity (mph)"
              value={discovery.armVelo}
              onChange={setDiscoveryField("armVelo")}
              type="number"
              step="0.1"
              placeholder="e.g. 82.0"
            />
            <LabeledInput
              label="60 Time (sec)"
              value={discovery.time60}
              onChange={setDiscoveryField("time60")}
              type="number"
              step="0.01"
              placeholder="e.g. 6.95"
            />
            <LabeledInput
              label="GPA"
              value={discovery.gpa}
              onChange={setDiscoveryField("gpa")}
              type="number"
              step="0.01"
              placeholder="e.g. 3.6"
            />
            <LabeledInput
              label="Grad Year"
              value={discovery.gradYear}
              onChange={setDiscoveryField("gradYear")}
              type="number"
              step="1"
              placeholder="e.g. 2027"
            />
          </div>
        </PlaceholderCard>

        {/* ─── Gap Creation ─────────────────────────────────────────── */}
        <PlaceholderCard
          title="Gap Creation"
          description="Surface the distance between where the player is and where they want to be."
        >
          <div
            className="mt-4 p-4 rounded-lg text-sm leading-relaxed"
            style={{
              background: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="mb-3">
              Class of {fieldValueOr(discovery.gradYear)} — exit velo {fieldValueOr(discovery.exitVelo, "mph")},
              arm {fieldValueOr(discovery.armVelo, "mph")}, 60 {fieldValueOr(discovery.time60, "s")},
              GPA {fieldValueOr(discovery.gpa)}.
            </p>
            <p style={{ color: "var(--muted-foreground)" }}>
              [PLACEHOLDER — this is where the scripted gap narrative goes. Use the numbers above to
              anchor the conversation: what's the target for their grad year, where do they sit today,
              and what's the cost of not closing the gap. Obstacles surfaced on the call get layered in
              here.]
            </p>
          </div>
        </PlaceholderCard>

        {/* ─── Program Recommendation ──────────────────────────────── */}
        <PlaceholderCard
          title="Program Recommendation"
          description="Tailored match based on discovery data. Click any card to override."
        >
          <div className="mt-4 flex items-center justify-between mb-3">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Auto-suggested: <span style={{ color: ACCENT, fontWeight: 600 }}>{suggested}</span>
              {programOverride && (
                <span className="ml-2" style={{ color: "var(--muted-foreground)" }}>
                  (overridden)
                </span>
              )}
            </p>
            {programOverride && (
              <button
                type="button"
                onClick={() => setProgramOverride(null)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROGRAMS.map((p) => {
              const isSelected = selected === p;
              const isSuggested = suggested === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProgramOverride(p)}
                  className="text-left p-4 rounded-xl border transition-colors"
                  style={{
                    background: isSelected ? `${ACCENT}14` : "var(--secondary)",
                    borderColor: isSelected ? ACCENT : "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {p}
                    </h4>
                    {isSelected && (
                      <span
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{ background: `${ACCENT}26`, color: ACCENT }}
                      >
                        <Check size={10} /> Selected
                      </span>
                    )}
                    {!isSelected && isSuggested && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(148,163,184,0.15)", color: "var(--muted-foreground)" }}
                      >
                        Suggested
                      </span>
                    )}
                  </div>
                  <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
                    {PROGRAM_COPY[p].blurb}
                  </p>
                  <ul className="space-y-1">
                    {PROGRAM_COPY[p].bullets.map((b, i) => (
                      <li
                        key={i}
                        className="text-xs flex items-start gap-1.5"
                        style={{ color: "var(--foreground)" }}
                      >
                        <span style={{ color: ACCENT }}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </PlaceholderCard>

      </div>
    </DashboardLayout>
  );
}
