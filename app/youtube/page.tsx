import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { SortableVideoLog } from "@/components/youtube/SortableVideoLog";
import { Youtube, Eye, MousePointerClick, Clock, AlertCircle } from "lucide-react";
import { fetchCSV, parseYTData, type YTMonthlyRow, type YTVideo } from "@/lib/sheets";

const YT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS66XUTykWwbUBp6i7hZlbt6uFlleXnCXHhrlAVBM82kf0iTV4N_AjwRsx_NIJBmmU-AYmnssuZvKX/pub?output=csv";

function pct(curr: number, prev: number): string {
  if (!prev) return "";
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
}

function trendDir(curr: number, prev: number | undefined): "up" | "down" | "neutral" {
  if (!prev) return "neutral";
  return curr >= prev ? "up" : "down";
}

// ─── Heat scale (red→amber→yellow→grey→green) ────────────────────────────────

const HEAT_STOPS: [number, number, number][] = [
  [255,  30,   0],
  [255, 140,   0],
  [255, 220,   0],
  [120, 120, 120],
  [ 22, 101,  52],
  [ 74, 222, 128],
  [ 57, 255,  20],
];
function heatColor(val: number, min: number, max: number): string {
  if (max <= min || isNaN(val)) return "var(--muted-foreground)";
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
  const scaled = t * (HEAT_STOPS.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(lo + 1, HEAT_STOPS.length - 1);
  const u = scaled - lo;
  const [r1, g1, b1] = HEAT_STOPS[lo];
  const [r2, g2, b2] = HEAT_STOPS[hi];
  return `rgb(${Math.round(r1+(r2-r1)*u)},${Math.round(g1+(g2-g1)*u)},${Math.round(b1+(b2-b1)*u)})`;
}
function heatWeight(val: number, min: number, max: number): number {
  if (max <= min || isNaN(val)) return 400;
  return Math.round(400 + Math.max(0, Math.min(1, (val - min) / (max - min))) * 500);
}
function heatStats(vals: number[]) {
  const nums = vals.filter((v) => !isNaN(v) && v > 0);
  if (!nums.length) return { min: 0, max: 0 };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}
function parsePct(s: string): number {
  return parseFloat((s ?? "").replace(/%/g, "")) || 0;
}

// ─── Monthly table ─────────────────────────────────────────────────────────────

function MonthlyTable({ monthly, averages }: { monthly: YTMonthlyRow[]; averages: YTMonthlyRow | null }) {
  const filled = monthly.filter((m) => m.impressions > 0);
  if (filled.length === 0) return null;

  const cols = ["Month", "CTR @ 24h", "Watch Time (min)", "Impressions", "Watch:Impressions"];
  const rows = averages ? [...filled, averages] : filled;

  const heat = {
    ctr:           heatStats(filled.map((m) => parsePct(m.ctr))),
    watchTime:     heatStats(filled.map((m) => m.watchTime)),
    impressions:   heatStats(filled.map((m) => m.impressions)),
    wtImpressions: heatStats(filled.map((m) => parsePct(m.wtImpressions))),
  };

  const white = "#ffffff";

  return (
    <PlaceholderCard title="Monthly Performance" description="YouTube 24-hour averages by month">
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {cols.map((c) => (
                <th
                  key={c}
                  className="text-left py-2 pr-6 text-xs font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const isAvg = m.month === "Monthly Avg";
              const cc  = isAvg ? white : heatColor(parsePct(m.ctr),             heat.ctr.min,           heat.ctr.max);
              const wc  = isAvg ? white : heatColor(m.watchTime,                  heat.watchTime.min,     heat.watchTime.max);
              const ic  = isAvg ? white : heatColor(m.impressions,                heat.impressions.min,   heat.impressions.max);
              const wtc = isAvg ? white : heatColor(parsePct(m.wtImpressions),    heat.wtImpressions.min, heat.wtImpressions.max);
              return (
                <tr
                  key={i}
                  className="hoverable"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: isAvg ? "rgba(255,255,255,0.04)" : undefined,
                  }}
                >
                  <td className="py-2.5 pr-6 whitespace-nowrap font-medium"
                    style={{ color: isAvg ? white : "var(--foreground)" }}>
                    {m.month}
                  </td>
                  <td className="py-2.5 pr-6" style={{ color: cc, fontWeight: isAvg ? 700 : heatWeight(parsePct(m.ctr), heat.ctr.min, heat.ctr.max) }}>
                    {m.ctr || "—"}
                  </td>
                  <td className="py-2.5 pr-6" style={{ color: wc, fontWeight: isAvg ? 700 : heatWeight(m.watchTime, heat.watchTime.min, heat.watchTime.max) }}>
                    {m.watchTime ? m.watchTime.toFixed(1) : "—"}
                  </td>
                  <td className="py-2.5 pr-6" style={{ color: ic, fontWeight: isAvg ? 700 : heatWeight(m.impressions, heat.impressions.min, heat.impressions.max) }}>
                    {m.impressions ? m.impressions.toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 pr-6" style={{ color: wtc, fontWeight: isAvg ? 700 : heatWeight(parsePct(m.wtImpressions), heat.wtImpressions.min, heat.wtImpressions.max) }}>
                    {m.wtImpressions || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PlaceholderCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function YouTubePage() {
  let monthly: YTMonthlyRow[] = [];
  let averages: YTMonthlyRow | null = null;
  let videos: YTVideo[] = [];
  let fetchError = false;

  try {
    const rows = await fetchCSV(YT_CSV_URL);
    const data = parseYTData(rows);
    monthly = data.monthly;
    averages = data.averages;
    videos = data.videos;
  } catch {
    fetchError = true;
  }

  const filled = monthly.filter((m) => m.impressions > 0);
  const latest = filled[filled.length - 1];
  const prev   = filled[filled.length - 2];
  const monthLabel = latest?.month ?? "";

  return (
    <DashboardLayout>
      {fetchError && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
        >
          <AlertCircle size={16} />
          <span>Could not load YouTube sheet data. Check that the CSV URL is still published.</span>
        </div>
      )}

      {/* Channel banner */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl border mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
        >
          <Youtube size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Mendoza Baseball Academy
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            @mendoza.baseball.academy
          </p>
        </div>
        <a
          href="https://www.youtube.com/channel/UCjfSfoqQxbCLU6P6BKr8CdA"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
        >
          <Youtube size={12} /> View Channel
        </a>
      </div>

      {/* Stat Cards — latest month value, MoM comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={`Avg CTR${monthLabel ? ` · ${monthLabel}` : ""}`}
          value={latest ? latest.ctr : "—"}
          change={latest && prev ? pct(parseFloat(latest.ctr), parseFloat(prev.ctr)) : ""}
          trend={latest && prev ? trendDir(parseFloat(latest.ctr), parseFloat(prev.ctr)) : "neutral"}
          icon={MousePointerClick}
        />
        <StatCard
          title={`Watch Time (min)${monthLabel ? ` · ${monthLabel}` : ""}`}
          value={latest ? latest.watchTime.toFixed(1) : "—"}
          change={latest && prev ? pct(latest.watchTime, prev.watchTime) : ""}
          trend={latest && prev ? trendDir(latest.watchTime, prev.watchTime) : "neutral"}
          icon={Clock}
        />
        <StatCard
          title={`Impressions${monthLabel ? ` · ${monthLabel}` : ""}`}
          value={latest ? latest.impressions.toLocaleString() : "—"}
          change={latest && prev ? pct(latest.impressions, prev.impressions) : ""}
          trend={latest && prev ? trendDir(latest.impressions, prev.impressions) : "neutral"}
          icon={Eye}
        />
        <StatCard
          title={`Watch:Impressions${monthLabel ? ` · ${monthLabel}` : ""}`}
          value={latest ? latest.wtImpressions : "—"}
          change={latest && prev ? pct(parseFloat(latest.wtImpressions), parseFloat(prev.wtImpressions)) : ""}
          trend={latest && prev ? trendDir(parseFloat(latest.wtImpressions), parseFloat(prev.wtImpressions)) : "neutral"}
          icon={Youtube}
        />
      </div>

      {/* Monthly breakdown */}
      <div className="mb-6">
        <MonthlyTable monthly={monthly} averages={averages} />
      </div>

      {/* Video log */}
      <SortableVideoLog videos={videos} />
    </DashboardLayout>
  );
}
