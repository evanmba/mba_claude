"use client";

import { useState } from "react";
import {
  Phone, RotateCcw, ChevronDown, ChevronRight,
  User, Search, Zap, BookOpen, Target, DollarSign,
  CheckCircle2, Circle, AlertCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#06b6d4"; // cyan

const CLOSERS = [
  "Evan Mendoza",
  "Greg Wilson",
  "Daneile Brown",
  "Gabriana Brown",
  "Allieandra Alexander",
];

const POSITIONS = [
  "RHP", "LHP", "C", "1B", "2B", "3B", "SS",
  "LF", "CF", "RF", "OF", "UTIL", "MIF",
];

const OBSTACLES = [
  "Price / cost concern",
  "Needs to talk to spouse / parents",
  "Needs time to think",
  "Already working with someone else",
  "Not sure the program is right for them",
  "Timeline / urgency not there",
  "Doesn't believe in the outcome",
  "Previous bad experience",
];

const PROGRAMS = [
  {
    id: "full-ride",
    name: "Full Ride Framework",
    tag: "PREMIUM",
    color: "#f59e0b",
    desc: "Full recruiting pipeline — exposure, film, outreach, academic positioning, and placement support from start to signed.",
    bestFor: "Committed families ready to go all-in on a D1/D2 offer",
  },
  {
    id: "triple-pro",
    name: "Triple Play Pro",
    tag: "MID-TIER",
    color: ACCENT,
    desc: "Core program with recruiting strategy, profile build, and coach outreach — built for serious athletes who want structure.",
    bestFor: "Athletes with strong metrics who need the right exposure and guidance",
  },
  {
    id: "triple-basic",
    name: "Triple Play Basic",
    tag: "ENTRY",
    color: "#22c55e",
    desc: "Foundation-level: profile setup, recruiting roadmap, and introductory outreach to get the process started.",
    bestFor: "Younger athletes or families starting early and building toward a bigger play",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type CallType = "initial" | "followup";

interface ProspectData {
  email: string;
  closer: string;
  firstName: string;
  parentName: string;
  gradYear: string;
  gpa: string;
  position: string;
  exitVelo: string;
  armVelo: string;
  sixtyTime: string;
  height: string;
  weight: string;
  currentSchool: string;
  currentTeam: string;
  targetSchools: string;
  offersReceived: string;
  dreamSchool: string;
  whyMBA: string;
  biggestChallenge: string;
  timeline: string;
}

const EMPTY: ProspectData = {
  email: "", closer: "", firstName: "", parentName: "",
  gradYear: "", gpa: "", position: "", exitVelo: "", armVelo: "",
  sixtyTime: "", height: "", weight: "", currentSchool: "", currentTeam: "",
  targetSchools: "", offersReceived: "", dreamSchool: "", whyMBA: "",
  biggestChallenge: "", timeline: "",
};

// ─── Small components ─────────────────────────────────────────────────────────

function SectionCard({
  number, title, icon: Icon, children, accent = ACCENT,
}: {
  number: number; title: string; icon: React.ElementType;
  children: React.ReactNode; accent?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        style={{ background: open ? `${accent}0d` : "transparent", borderBottom: open ? `1px solid var(--border)` : "none" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background: accent + "22", color: accent }}
        >
          {number}
        </div>
        <Icon size={16} style={{ color: accent }} />
        <span className="font-bold text-sm flex-1" style={{ color: "var(--foreground)" }}>{title}</span>
        {open ? <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function ScriptBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 text-sm leading-relaxed"
      style={{
        background: "rgba(6,182,212,0.06)",
        border: "1px solid rgba(6,182,212,0.2)",
        color: "var(--foreground)",
        fontStyle: "normal",
        lineHeight: 1.75,
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
          Say This
        </span>
      </div>
      {children}
    </div>
  );
}

function NoteBox({ label = "Listen For", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-3 text-sm mt-3"
      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
    >
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#f59e0b" }}>
        {label}:{" "}
      </span>
      <span style={{ color: "var(--muted-foreground)" }}>{children}</span>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", as,
  options = [], span = 1,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
  as?: "select" | "textarea";
  options?: string[]; span?: number;
}) {
  const style: React.CSSProperties = {
    width: "100%",
    background: "var(--secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "var(--foreground)",
    fontSize: 14,
    outline: "none",
    gridColumn: span > 1 ? `span ${span}` : undefined,
    resize: as === "textarea" ? "vertical" : undefined,
  };
  return (
    <div style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      {as === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={style}>
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : as === "textarea" ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          style={style}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={style}
        />
      )}
    </div>
  );
}

function Pill(p: { filled: boolean; label: string }) {
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{
        background: p.filled ? `${ACCENT}22` : "var(--secondary)",
        color: p.filled ? ACCENT : "var(--muted-foreground)",
        border: `1px solid ${p.filled ? ACCENT + "55" : "var(--border)"}`,
      }}
    >
      {p.filled ? "✓ " : ""}{p.label}
    </span>
  );
}

// ─── Inline text replacement ──────────────────────────────────────────────────

function S({ p, field }: { p: ProspectData; field: keyof ProspectData }) {
  const v = p[field];
  return v ? (
    <strong style={{ color: ACCENT }}>{v}</strong>
  ) : (
    <span
      className="rounded px-1 text-xs font-bold uppercase"
      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
    >
      [{field}]
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SalesScriptClient() {
  const [callType, setCallType] = useState<CallType>("initial");
  const [p, setP]               = useState<ProspectData>(EMPTY);
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  function set(field: keyof ProspectData) {
    return (v: string) => setP(prev => ({ ...prev, [field]: v }));
  }

  function toggleObstacle(o: string) {
    setObstacles(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  }

  const filledCount = Object.values(p).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* ── Call type toggle ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Sales Script</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Live call companion — fill in as you go
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          {(["initial", "followup"] as CallType[]).map(t => (
            <button
              key={t}
              onClick={() => setCallType(t)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: callType === t ? ACCENT : "transparent",
                color: callType === t ? "#fff" : "var(--muted-foreground)",
              }}
            >
              <Phone size={14} />
              {t === "initial" ? "Initial Call" : "Follow Up Call"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Call type badge ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
        style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, color: ACCENT }}
      >
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: ACCENT }} />
        {callType === "initial" ? "🎯 INITIAL CALL — First contact. Build rapport, run full discovery." : "🔄 FOLLOW UP CALL — Reference prior conversation, move to close."}
      </div>

      {/* ── SECTION 0: Prospect info ─────────────────────────────────────────── */}
      <SectionCard number={0} title="Prospect Info" icon={User} accent={ACCENT}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Prospect Email" value={p.email} onChange={set("email")} placeholder="athlete@email.com" span={2} />
          <Field label="Closer" value={p.closer} onChange={set("closer")} as="select" options={CLOSERS} />
          <Field label="First Name" value={p.firstName} onChange={set("firstName")} placeholder="e.g. Jake" />
          <Field label="Parent / Guardian" value={p.parentName} onChange={set("parentName")} placeholder="e.g. Mike" />
        </div>

        {/* Progress pills */}
        <div className="flex gap-2 flex-wrap mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <Pill filled={!!p.email} label="Email" />
          <Pill filled={!!p.closer} label="Closer" />
          <Pill filled={!!p.firstName} label="Name" />
          <Pill filled={!!p.gradYear} label="Grad Year" />
          <Pill filled={!!p.exitVelo} label="Exit Velo" />
          <Pill filled={!!p.gpa} label="GPA" />
          <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
            {filledCount} / {Object.keys(EMPTY).length} fields filled
          </span>
        </div>
      </SectionCard>

      {/* ── SECTION 1: Opening ───────────────────────────────────────────────── */}
      <SectionCard number={1} title="Opening" icon={Phone} accent={ACCENT}>
        {callType === "initial" ? (
          <>
            <ScriptBox>
              "Hey, is this <S p={p} field="firstName" />? Hey, this is <S p={p} field="closer" /> over here at Mendoza Baseball Academy — how are you doing today?"
              <br /><br />
              [Let them respond]
              <br /><br />
              "Awesome. So the reason I'm reaching out is we saw your profile come through and honestly your numbers caught our eye. We work specifically with players who are serious about playing at the next level — and based on what we saw, we just wanted to jump on a quick call to learn more about you and see if there's a fit on our end. Does that make sense?"
            </ScriptBox>
            <NoteBox>Tone of voice, energy level, are parents on the call, any immediate objections</NoteBox>
          </>
        ) : (
          <>
            <ScriptBox>
              "Hey <S p={p} field="firstName" />, it's <S p={p} field="closer" /> from Mendoza Baseball Academy — how's everything going since we last talked?"
              <br /><br />
              [Let them respond]
              <br /><br />
              "Good, good. So I was thinking about our conversation and I wanted to circle back because honestly I feel like where you're at right now is exactly the situation we were built for. I wanted to jump back on and make sure I gave you everything you needed to make the right decision."
            </ScriptBox>
            <NoteBox>Their energy, what they've been thinking about, has anything changed</NoteBox>
          </>
        )}
      </SectionCard>

      {/* ── SECTION 2: Discovery ─────────────────────────────────────────────── */}
      <SectionCard number={2} title="Discovery" icon={Search} accent={ACCENT}>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
          <Field label="Grad Year" value={p.gradYear} onChange={set("gradYear")} as="select"
            options={["2025","2026","2027","2028","2029","2030"]} />
          <Field label="GPA" value={p.gpa} onChange={set("gpa")} placeholder="e.g. 3.4" />
          <Field label="Position" value={p.position} onChange={set("position")} as="select" options={POSITIONS} />
          <Field label="Current School / Team" value={p.currentSchool} onChange={set("currentSchool")} placeholder="e.g. Riverside HS" />
          <Field label="Exit Velocity (mph)" value={p.exitVelo} onChange={set("exitVelo")} placeholder="e.g. 88" />
          <Field label="Arm Velocity (mph)" value={p.armVelo} onChange={set("armVelo")} placeholder="e.g. 84" />
          <Field label="60 Time (sec)" value={p.sixtyTime} onChange={set("sixtyTime")} placeholder="e.g. 6.9" />
          <Field label="Height / Weight" value={p.height} onChange={set("height")} placeholder="e.g. 6ft 1in / 185lbs" />
          <Field label="Dream School" value={p.dreamSchool} onChange={set("dreamSchool")} placeholder="e.g. Florida State" span={2} />
          <Field label="Schools Already Targeting" value={p.targetSchools} onChange={set("targetSchools")} placeholder="e.g. USF, FAU, UNF" span={2} />
          <Field label="Current Offers" value={p.offersReceived} onChange={set("offersReceived")} placeholder="e.g. None / 1 D3" span={2} />
          <Field label="Graduation Timeline" value={p.timeline} onChange={set("timeline")} as="select"
            options={["Spring 2025","Fall 2025","Spring 2026","Fall 2026","Spring 2027","Fall 2027","Spring 2028"]} />
        </div>

        <ScriptBox>
          "So tell me a little about yourself — what position do you play, and what level are you trying to get to?"
          <br /><br />
          "And what's your GPA looking like right now?"
          <br /><br />
          "Have you had any coaches reach out yet, or is that something that's been frustrating — like you know you're good enough but the right eyes just haven't been on you?"
          <br /><br />
          "What's your dream school? Like if you could go anywhere?"
          <br /><br />
          "Okay and what's the biggest thing standing between you and that right now?"
        </ScriptBox>
        <NoteBox label="Capture">Their frustration level, timeline urgency, parental involvement, any current momentum</NoteBox>
      </SectionCard>

      {/* ── SECTION 3: Gap Creation ───────────────────────────────────────────── */}
      <SectionCard number={3} title="Gap Creation" icon={Zap} accent="#f59e0b">

        {/* Dynamic gap summary */}
        {(p.exitVelo || p.gradYear || p.dreamSchool) && (
          <div
            className="rounded-lg p-4 mb-4 text-sm"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#f59e0b" }}>
              Prospect Snapshot
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              {p.firstName    && <span><strong style={{ color: "var(--foreground)" }}>{p.firstName}</strong> · {p.position || "—"} · {p.gradYear || "—"}</span>}
              {p.exitVelo     && <span>Exit Velo: <strong style={{ color: "var(--foreground)" }}>{p.exitVelo} mph</strong></span>}
              {p.armVelo      && <span>Arm Velo: <strong style={{ color: "var(--foreground)" }}>{p.armVelo} mph</strong></span>}
              {p.sixtyTime    && <span>60 Time: <strong style={{ color: "var(--foreground)" }}>{p.sixtyTime}s</strong></span>}
              {p.gpa          && <span>GPA: <strong style={{ color: "var(--foreground)" }}>{p.gpa}</strong></span>}
              {p.dreamSchool  && <span>Dream: <strong style={{ color: "var(--foreground)" }}>{p.dreamSchool}</strong></span>}
              {p.offersReceived && <span>Offers: <strong style={{ color: "var(--foreground)" }}>{p.offersReceived}</strong></span>}
            </div>
          </div>
        )}

        <ScriptBox>
          "So here's what I'm hearing — {p.firstName ? <strong style={{ color: ACCENT }}>{p.firstName}</strong> : "you"} {p.dreamSchool ? <>wants to play at <strong style={{ color: ACCENT }}>{p.dreamSchool}</strong></> : "has a big school in mind"}, {p.offersReceived && p.offersReceived.toLowerCase() !== "none" ? <>already has {<strong style={{ color: ACCENT }}>{p.offersReceived}</strong>} to work with</> : "but hasn't had coaches knocking down the door yet"}. And the gap between where you are right now and where you want to be — that's exactly what this call is about."
          <br /><br />
          "The reality is most players with {p.exitVelo ? <><strong style={{ color: ACCENT }}>{p.exitVelo} mph</strong> exit velo</> : "your numbers"} and a {p.gpa ? <><strong style={{ color: ACCENT }}>{p.gpa}</strong> GPA</> : "strong GPA"} should already have D1 programs looking at them. The problem isn't your ability — it's visibility. Coaches don't have time to find you. You have to put yourself in front of them the right way."
          <br /><br />
          "Does that feel accurate to where you're at?"
        </ScriptBox>
        <NoteBox label="Watch For">Head-nodding, verbal agreement — this is your buying signal. If they push back, dig deeper into WHY they haven't gotten looks.</NoteBox>

        <div className="mt-4">
          <Field label="Biggest Challenge (their words)" value={p.biggestChallenge} onChange={set("biggestChallenge")}
            as="textarea" placeholder="Type exactly what they said their biggest challenge is…" />
        </div>
      </SectionCard>

      {/* ── SECTION 4: Program Recommendation ────────────────────────────────── */}
      <SectionCard number={4} title="Program Recommendation" icon={BookOpen} accent="#a855f7">

        {/* Obstacle selector */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
            Obstacles on this call — check all that apply
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OBSTACLES.map(o => {
              const active = obstacles.includes(o);
              return (
                <button
                  key={o}
                  onClick={() => toggleObstacle(o)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all"
                  style={{
                    background: active ? "rgba(168,85,247,0.12)" : "var(--secondary)",
                    border: `1px solid ${active ? "#a855f7aa" : "var(--border)"}`,
                    color: active ? "#c084fc" : "var(--muted-foreground)",
                  }}
                >
                  {active
                    ? <CheckCircle2 size={15} style={{ color: "#a855f7", flexShrink: 0 }} />
                    : <Circle size={15} style={{ flexShrink: 0 }} />}
                  {o}
                </button>
              );
            })}
          </div>
        </div>

        {/* Program selection */}
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
          Select Program to Present
        </p>
        <div className="flex flex-col gap-3">
          {PROGRAMS.map(prog => {
            const active = selectedProgram === prog.id;
            return (
              <button
                key={prog.id}
                onClick={() => setSelectedProgram(active ? null : prog.id)}
                className="rounded-xl border p-4 text-left transition-all"
                style={{
                  background: active ? `${prog.color}12` : "var(--secondary)",
                  borderColor: active ? prog.color + "66" : "var(--border)",
                  borderWidth: active ? 2 : 1,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: prog.color + "22", color: prog.color }}
                  >
                    {prog.tag}
                  </div>
                  <span className="font-bold" style={{ color: active ? prog.color : "var(--foreground)" }}>
                    {prog.name}
                  </span>
                  {active && <CheckCircle2 size={16} style={{ color: prog.color, marginLeft: "auto" }} />}
                </div>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{prog.desc}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: prog.color + "99" }}>
                  Best for: {prog.bestFor}
                </p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── SECTION 5: Close ──────────────────────────────────────────────────── */}
      <SectionCard number={5} title="Close" icon={Target} accent="#10b981">
        <ScriptBox>
          {selectedProgram ? (
            <>
              "So based on everything you've told me{p.firstName ? <>, <S p={p} field="firstName" /></> : ""} — your goals, where you're at, what's holding you back — I think the{" "}
              <strong style={{ color: ACCENT }}>
                {PROGRAMS.find(x => x.id === selectedProgram)?.name}
              </strong>{" "}
              is the right move. Here's why…"
              <br /><br />
              "[Walk through the program fit based on their specific situation]"
              <br /><br />
              "The investment for this is [PRICE]. And honestly, compared to what one scholarship is worth over 4 years — this is the easiest ROI decision a family can make. So what I need from you today is a simple yes or no — are you serious about making this happen?"
            </>
          ) : (
            <span style={{ color: "var(--muted-foreground)" }}>
              ← Select a program above to load the close script
            </span>
          )}
        </ScriptBox>

        {obstacles.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#f59e0b" }}>
              Handle Objections — {obstacles.length} flagged
            </p>
            <div className="flex flex-col gap-2">
              {obstacles.map(o => (
                <div
                  key={o}
                  className="flex items-start gap-2 p-3 rounded-lg text-sm"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <AlertCircle size={14} style={{ color: "#f59e0b", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <span className="font-semibold" style={{ color: "#f59e0b" }}>{o}</span>
                    <p className="mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      [Script for this objection — will be added with your sales script]
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── SECTION 6: Post-call notes ────────────────────────────────────────── */}
      <SectionCard number={6} title="Post-Call Notes" icon={DollarSign} accent="#64748b">
        <Field
          label="Call outcome / next steps"
          value={p.whyMBA}
          onChange={set("whyMBA")}
          as="textarea"
          placeholder="e.g. Sent proposal, follow up Friday, parent needs to review…"
        />
        <div className="mt-3 flex gap-2 flex-wrap">
          {["Closed", "Follow Up Needed", "No Show", "Not Qualified", "Sent Proposal"].map(tag => (
            <button
              key={tag}
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
              style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Reset button */}
        <button
          onClick={() => { setP(EMPTY); setObstacles([]); setSelectedProgram(null); }}
          className="flex items-center gap-2 mt-5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          <RotateCcw size={13} />
          Reset for Next Call
        </button>
      </SectionCard>

    </div>
  );
}
