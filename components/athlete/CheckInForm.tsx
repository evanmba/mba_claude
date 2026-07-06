"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import {
  METRICS,
  METRIC_MAP,
  formatPhone,
  type MetricKey,
  type AthleteHistory,
} from "@/lib/athletes";
import { MetricLineChart } from "./MetricLineChart";

type FormValues = Record<MetricKey, string>;

const EMPTY: FormValues = { armVelo: "", exitVelo: "", sixtyYard: "", fiveTenFive: "" };

// ─── Delta helper ───────────────────────────────────────────────────────────

function delta(history: AthleteHistory, key: MetricKey) {
  const { entries } = history;
  if (entries.length < 2) return null;
  const first = entries[0][key];
  const last = entries[entries.length - 1][key];
  const diff = last - first;
  if (diff === 0) return { diff: 0, improved: null as boolean | null };
  const improved = METRIC_MAP[key].higherIsBetter ? diff > 0 : diff < 0;
  return { diff, improved };
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

// ─── Results view ───────────────────────────────────────────────────────────

function Results({
  history,
  onLogAnother,
  justSubmitted,
}: {
  history: AthleteHistory;
  onLogAnother: () => void;
  justSubmitted: boolean;
}) {
  const [selected, setSelected] = useState<MetricKey>("armVelo");
  const { entries } = history;
  const latest = entries[entries.length - 1];
  const metric = METRIC_MAP[selected];

  const chartPoints = entries.map((e) => ({
    week: e.week,
    value: e[selected],
    date: e.submittedAt,
  }));

  return (
    <div className="space-y-5">
      {justSubmitted && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#22c55e",
          }}
        >
          <CheckCircle2 size={16} />
          <span>Check-in saved! Here&apos;s your progress.</span>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
          {history.name ? `${history.name}` : formatPhone(history.phone)}
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          You&apos;re on{" "}
          <span style={{ color: "var(--primary)", fontWeight: 600 }}>Week {latest.week}</span> ·{" "}
          {entries.length} check-in{entries.length === 1 ? "" : "s"} logged
        </p>
      </div>

      {/* Current stats + change since week 1 */}
      <div className="grid grid-cols-2 gap-3">
        {METRICS.map((m) => {
          const d = delta(history, m.key);
          return (
            <div
              key={m.key}
              className="rounded-xl border p-4"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
                {m.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                {fmt(latest[m.key])}
                <span className="text-sm font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>
                  {m.unit}
                </span>
              </p>
              {d && (
                <div className="flex items-center gap-1 mt-1.5">
                  {d.improved === null ? (
                    <Minus size={12} style={{ color: "var(--muted-foreground)" }} />
                  ) : d.improved ? (
                    <TrendingUp size={12} style={{ color: "#22c55e" }} />
                  ) : (
                    <TrendingDown size={12} style={{ color: "#ef4444" }} />
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        d.improved === null
                          ? "var(--muted-foreground)"
                          : d.improved
                            ? "#22c55e"
                            : "#ef4444",
                    }}
                  >
                    {d.diff > 0 ? "+" : ""}
                    {fmt(d.diff)} {m.unit} since Wk 1
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Metric selector + chart */}
      <div
        className="rounded-2xl border p-4"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {METRICS.map((m) => {
            const isSel = selected === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setSelected(m.key)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: isSel ? m.color : "var(--secondary)",
                  color: isSel ? "#fff" : "var(--muted-foreground)",
                }}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-baseline justify-between mb-1">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {metric.label}{" "}
            <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>
              ({metric.unit})
            </span>
          </p>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {metric.higherIsBetter ? "higher is better" : "lower is better"}
          </span>
        </div>

        <MetricLineChart
          points={chartPoints}
          color={metric.color}
          unit={metric.unit}
          label={metric.label}
        />

        {entries.length === 1 && (
          <p className="text-xs text-center mt-2" style={{ color: "var(--muted-foreground)" }}>
            Check in again next week to start building your progress line.
          </p>
        )}
      </div>

      <button
        onClick={onLogAnother}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium active:scale-[0.99] transition-transform"
        style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
      >
        <ArrowLeft size={15} /> Log another check-in
      </button>
    </div>
  );
}

// ─── Main form ──────────────────────────────────────────────────────────────

export function CheckInForm() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AthleteHistory | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const setValue = (key: MetricKey, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/athlete/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, ...values }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setHistory(json.history as AthleteHistory);
      setJustSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setValues(EMPTY);
    setHistory(null);
    setJustSubmitted(false);
    setError(null);
  }

  if (history) {
    return <Results history={history} onLogAnother={reset} justSubmitted={justSubmitted} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
          Weekly Check-In
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Enter this week&apos;s numbers to see your progress.
        </p>
      </div>

      {/* Name (optional) */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          First name <span style={{ color: "var(--muted-foreground)" }}>(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan"
          autoComplete="given-name"
          className="w-full px-4 py-3 rounded-xl text-base outline-none focus:ring-2"
          style={{
            background: "var(--secondary)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          Phone number
        </label>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          autoComplete="tel"
          required
          className="w-full px-4 py-3 rounded-xl text-base outline-none focus:ring-2"
          style={{
            background: "var(--secondary)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        />
        <p className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>
          Use the same phone number every week so we can track your progress over time.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {METRICS.map((m) => (
          <div key={m.key}>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
              {m.label}
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step={m.step}
                min={0}
                value={values[m.key]}
                onChange={(e) => setValue(m.key, e.target.value)}
                placeholder={m.placeholder}
                required
                className="w-full pl-4 pr-12 py-3 rounded-xl text-base outline-none focus:ring-2"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                  border: `1px solid var(--border)`,
                }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
                style={{ color: "var(--muted-foreground)" }}
              >
                {m.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold active:scale-[0.99] transition-transform disabled:opacity-60"
        style={{ background: "var(--primary)", color: "#fff" }}
      >
        {submitting ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Saving…
          </>
        ) : (
          "Submit & see my progress"
        )}
      </button>
    </form>
  );
}
