"use client";

import { type Call } from "@/lib/funnel";

// ── Goals ──────────────────────────────────────────────────────────────────────
// Individual weekly goal: 6 calls. Chart max = goal / 0.75 so the goal line
// sits at 3/4 of the bar width — setters can still exceed it.
const WEEKLY_SETTER_GOAL = 6;
const CHART_MAX           = Math.ceil(WEEKLY_SETTER_GOAL / 0.75); // = 8

// Team goals for the top bar chart
const TEAM_GOALS = { monthly: 180, weekly: 45, daily: 7 };

const BG     = "#0b1628";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED  = "#475569";

// ── Date helpers ───────────────────────────────────────────────────────────────
function parseSheetDate(s: string): Date | null {
  const parts = s.split("/");
  if (parts.length < 3) return null;
  const m = parseInt(parts[0], 10), d = parseInt(parts[1], 10);
  let y   = parseInt(parts[2], 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (y < 100) y += 2000;
  return new Date(y, m - 1, d);
}

// ── Team goal bar (Monthly / Weekly / Daily) ───────────────────────────────────
function GoalBarRow({
  label, value, goal, color,
}: { label: string; value: number; goal: number; color: string }) {
  const fillPct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const hitGoal = fillPct >= 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ color: MUTED, fontSize: 12, minWidth: 56, textAlign: "right" }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: "right" }}>{value}</span>
      <div style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.04)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{
          width: `${fillPct}%`, height: "100%",
          background: hitGoal ? "#22c55e" : color,
          borderRadius: 5, transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{ color: "#334155", fontSize: 11, minWidth: 36, textAlign: "right" }}>{goal}</span>
      <span style={{ color: hitGoal ? "#22c55e" : "#94a3b8", fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: "right" }}>
        {Math.round(fillPct)}%
      </span>
    </div>
  );
}

// ── Individual setter bar (weekly, with dotted goal line at 75%) ───────────────
function SetterBar({ name, weeklyCount }: { name: string; weeklyCount: number }) {
  const fillPct    = Math.min((weeklyCount / CHART_MAX) * 100, 100);
  const goalLinePct = (WEEKLY_SETTER_GOAL / CHART_MAX) * 100; // 75%
  const hitGoal    = weeklyCount >= WEEKLY_SETTER_GOAL;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {/* Name */}
      <span style={{ color: "#94a3b8", fontSize: 12, minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      {/* Count */}
      <span style={{ color: hitGoal ? "#22c55e" : "#e2e8f0", fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "right" }}>
        {weeklyCount}
      </span>
      {/* Bar + dotted goal line */}
      <div style={{ flex: 1, height: 26, position: "relative" }}>
        {/* Track */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.04)", borderRadius: 5 }} />
        {/* Fill */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${fillPct}%`,
          background: hitGoal ? "#22c55e" : "#3b82f6",
          borderRadius: 5, opacity: 0.85, transition: "width 0.4s ease",
        }} />
        {/* Goal dotted line at 75% */}
        <div style={{
          position: "absolute",
          left: `${goalLinePct}%`,
          top: -4, bottom: -4, width: 0,
          borderLeft: "2px dashed rgba(255,255,255,0.4)",
          zIndex: 2,
        }} />
      </div>
      {/* Goal number */}
      <span style={{ color: "#1e3a5f", fontSize: 11, minWidth: 20, textAlign: "right" }}>
        {WEEKLY_SETTER_GOAL}
      </span>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function SetterView({ calls }: { calls: Call[] }) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Week starts Monday
  const dow       = now.getDay(); // 0=Sun
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Attach parsed dates
  const withDates = calls
    .map((c) => ({ ...c, _d: parseSheetDate(c.bookedDate) }))
    .filter((c): c is typeof c & { _d: Date } => c._d !== null);

  const monthCalls = withDates.filter((c) => c._d >= monthStart);
  const weekCalls  = withDates.filter((c) => c._d >= weekStart);
  const todayCalls = withDates.filter((c) =>
    c._d.getFullYear() === today.getFullYear() &&
    c._d.getMonth()    === today.getMonth()    &&
    c._d.getDate()     === today.getDate()
  );

  // Per-setter weekly counts — seed from month so 0-this-week setters appear
  const setterCounts = new Map<string, number>();
  for (const c of monthCalls) {
    const n = (c.setter || "").trim();
    if (n) setterCounts.set(n, setterCounts.get(n) ?? 0);
  }
  for (const c of weekCalls) {
    const n = (c.setter || "").trim();
    if (n) setterCounts.set(n, (setterCounts.get(n) ?? 0) + 1);
  }

  const setters = [...setterCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Team Goals ── */}
      <div style={{ background: BG, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 24px" }}>
        <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Team Booked Call Goals
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Column headers */}
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ minWidth: 56 }} /><span style={{ minWidth: 24 }} /><span style={{ flex: 1 }} />
            <span style={{ color: "#1e3a5f", fontSize: 10, minWidth: 36, textAlign: "right" }}>Goal</span>
            <span style={{ color: "#1e3a5f", fontSize: 10, minWidth: 40, textAlign: "right" }}>%</span>
          </div>
          <GoalBarRow label="Monthly" value={monthCalls.length} goal={TEAM_GOALS.monthly} color="#3b82f6" />
          <GoalBarRow label="Weekly"  value={weekCalls.length}  goal={TEAM_GOALS.weekly}  color="#6366f1" />
          <GoalBarRow label="Daily"   value={todayCalls.length} goal={TEAM_GOALS.daily}   color="#8b5cf6" />
        </div>
      </div>

      {/* ── Individual Weekly Tracker ── */}
      <div style={{ background: BG, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Individual Weekly Tracker
          </p>
          <span style={{ fontSize: 11, color: MUTED }}>
            Goal <span style={{ color: "#94a3b8", fontWeight: 600 }}>{WEEKLY_SETTER_GOAL}</span>/week · bar max {CHART_MAX}
          </span>
        </div>

        {setters.length > 0 ? (
          <>
            {/* Column headers */}
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <span style={{ minWidth: 120 }} /><span style={{ minWidth: 20 }} />
              <span style={{ flex: 1 }} />
              <span style={{ color: "#1e3a5f", fontSize: 10, minWidth: 20, textAlign: "right" }}>Goal</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {setters.map(([name, count]) => (
                <SetterBar key={name} name={name} weeklyCount={count} />
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>No setter data for the current week.</p>
        )}

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ width: 16, height: 0, borderTop: "2px dashed rgba(255,255,255,0.4)" }} />
          <span style={{ fontSize: 10, color: "#334155" }}>Weekly goal ({WEEKLY_SETTER_GOAL} calls) — bar extends to {CHART_MAX} max</span>
        </div>
      </div>

    </div>
  );
}
