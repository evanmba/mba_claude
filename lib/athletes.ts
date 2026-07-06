// Client-safe shared module: metric definitions, entry/history types, and pure
// helpers used by both the browser UI and the server-only storage layer
// (`lib/athletes-store.ts`). Keep this file free of Node-only imports (fs,
// crypto, path) so client components can import METRICS / types / formatters.

// ─── Metric definitions ─────────────────────────────────────────────────────
//
// Four weekly check-in metrics. `higherIsBetter` drives whether the progress
// chart treats an increase or a decrease as improvement:
//   • Arm & exit velo are measured in mph  → higher is better
//   • 60-yard dash & 5-10-5 are timed drills in seconds → lower is better

export type MetricKey = "armVelo" | "exitVelo" | "sixtyYard" | "fiveTenFive" | "bodyWeight";

export interface MetricDef {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  higherIsBetter: boolean;
  /** Neutral metrics (e.g. body weight) have no "good" direction — deltas are shown without up/down judgment. */
  neutral?: boolean;
  /** Optional fields may be left blank on the form (stored as 0 = "no reading"). */
  optional?: boolean;
  color: string;
  /** Loose sanity bounds used for input validation (not hard limits). */
  min: number;
  max: number;
  step: number;
  placeholder: string;
}

export const METRICS: MetricDef[] = [
  {
    key: "armVelo",
    label: "Arm Velocity",
    shortLabel: "Arm Velo",
    unit: "mph",
    higherIsBetter: true,
    optional: true,
    color: "#3b82f6", // blue
    min: 30,
    max: 110,
    step: 0.1,
    placeholder: "e.g. 78",
  },
  {
    key: "exitVelo",
    label: "Exit Velocity",
    shortLabel: "Exit Velo",
    unit: "mph",
    higherIsBetter: true,
    optional: true,
    color: "#22c55e", // green
    min: 40,
    max: 120,
    step: 0.1,
    placeholder: "e.g. 88",
  },
  {
    key: "sixtyYard",
    label: "60-Yard Dash",
    shortLabel: "60-Yard",
    unit: "sec",
    higherIsBetter: false,
    optional: true,
    color: "#f59e0b", // amber
    min: 5,
    max: 12,
    step: 0.01,
    placeholder: "e.g. 6.9",
  },
  {
    key: "fiveTenFive",
    label: "5-10-5 Shuttle",
    shortLabel: "5-10-5",
    unit: "sec",
    higherIsBetter: false,
    color: "#d946ef", // fuchsia
    min: 3.5,
    max: 8,
    step: 0.01,
    placeholder: "e.g. 4.4",
  },
  {
    key: "bodyWeight",
    label: "Body Weight",
    shortLabel: "Weight",
    unit: "lbs",
    higherIsBetter: true, // unused — neutral
    neutral: true,
    color: "#06b6d4", // cyan
    min: 60,
    max: 350,
    step: 0.1,
    placeholder: "e.g. 165",
  },
];

export const METRIC_MAP: Record<MetricKey, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
) as Record<MetricKey, MetricDef>;

// ─── Entry shape ────────────────────────────────────────────────────────────

export interface AthleteEntry {
  submittedAt: string; // ISO timestamp
  phone: string; // normalized (digits only)
  name: string; // optional first name / label ("" if not given)
  // Metric values. 0 means "no reading" (an optional field left blank).
  armVelo: number;
  exitVelo: number;
  sixtyYard: number;
  fiveTenFive: number;
  bodyWeight: number;
}

/** True when a metric value represents a real reading (not a blank/absent field). */
export function hasReading(v: number): boolean {
  return typeof v === "number" && isFinite(v) && v > 0;
}

/** An entry decorated with the program week (computed from the first entry). */
export interface AthleteEntryWithWeek extends AthleteEntry {
  week: number;
}

export interface AthleteHistory {
  phone: string;
  name: string;
  entries: AthleteEntryWithWeek[]; // sorted oldest → newest
}

// ─── Phone normalization ────────────────────────────────────────────────────

/** Reduce a phone to comparable digits (last 10 for US-style numbers). */
export function normalizePhone(raw: string | number): string {
  // Coerce to string first — sheet/web-app reads can hand back a number.
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Pretty-print a normalized 10-digit phone as (xxx) xxx-xxxx. */
export function formatPhone(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

// ─── Week computation ───────────────────────────────────────────────────────
//
// The athlete never tells us "what week they're on". We derive the program
// week from the date of their FIRST entry: week 1 begins on the first check-in,
// and each subsequent 7-day span is the next week.

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function computeWeeks(entries: AthleteEntry[]): AthleteEntryWithWeek[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
  const firstTime = new Date(sorted[0].submittedAt).getTime();
  return sorted.map((e) => {
    const diff = new Date(e.submittedAt).getTime() - firstTime;
    const week = Math.floor(diff / MS_PER_WEEK) + 1;
    return { ...e, week };
  });
}
