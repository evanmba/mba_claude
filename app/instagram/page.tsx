import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { Eye, Heart, Share2, UserPlus, AlertCircle } from "lucide-react";
import { fetchCSV, parseIGData, type IGMonthlyRow, type IGPost } from "@/lib/sheets";

const IG_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSt9HlvUd1055qAlYc_x-oflTe2quXENd-q8W6oV2-AOs3uGPumpmPgQZHCnZQaYFKU9QzKubHt-68v/pub?output=csv";

function pct(curr: number, prev: number): string {
  if (!prev) return "";
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
}

function trendDir(curr: number, prev: number | undefined): "up" | "down" | "neutral" {
  if (!prev) return "neutral";
  return curr >= prev ? "up" : "down";
}

// ─── Monthly table ─────────────────────────────────────────────────────────────

function MonthlyTable({ monthly, averages }: { monthly: IGMonthlyRow[]; averages: IGMonthlyRow | null }) {
  const filled = monthly.filter((m) => m.reach > 0);
  if (filled.length === 0) return null;

  const cols = [
    "Month", "Avg Reach", "Watch Time", "Avg Likes", "Avg Shares",
    "Avg Follows", "Reach:Like", "Reach:Shares", "Reach:Follows",
  ];

  const rows = averages ? [...filled, averages] : filled;

  return (
    <PlaceholderCard title="Monthly Performance" description="24-hour average metrics by month">
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {cols.map((c) => (
                <th
                  key={c}
                  className="text-left py-2 pr-5 text-xs font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const isAvg = m.month === "Average";
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: isAvg ? "rgba(217,70,239,0.04)" : undefined,
                  }}
                >
                  <td className="py-2.5 pr-5 whitespace-nowrap font-medium"
                    style={{ color: isAvg ? "#d946ef" : "var(--foreground)" }}>
                    {m.month}
                  </td>
                  <td className="py-2.5 pr-5 font-semibold" style={{ color: "#d946ef" }}>
                    {m.reach ? m.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
                    {m.watchTime ? `${m.watchTime.toFixed(2)}s` : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--foreground)" }}>
                    {m.likes ? m.likes.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--foreground)" }}>
                    {m.shares ? m.shares.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--foreground)" }}>
                    {m.follows ? m.follows.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
                    {m.reachLike || "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
                    {m.reachShares || "—"}
                  </td>
                  <td className="py-2.5 pr-5" style={{ color: "var(--muted-foreground)" }}>
                    {m.reachFollowers || "—"}
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

// ─── Who badge colour ──────────────────────────────────────────────────────────

function whoBadge(who: string): { bg: string; color: string } {
  switch (who.toLowerCase()) {
    case "evan":  return { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" };
    case "nate":  return { bg: "rgba(217,70,239,0.15)",  color: "#d946ef" };
    case "yasir": return { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" };
    default:      return { bg: "rgba(100,116,139,0.15)", color: "var(--muted-foreground)" };
  }
}

// ─── Post log table ────────────────────────────────────────────────────────────

function PostLog({ posts }: { posts: IGPost[] }) {
  if (posts.length === 0) return null;

  const headers = ["Date", "Title", "Reach", "Likes", "Shares", "Follows", "Reach:Like", "Who", "Type", "CTA"];

  return (
    <PlaceholderCard
      title={`Post Log — ${posts.length} posts`}
      description="Individual post performance at 24 hours"
    >
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className="text-left py-2 pr-4 font-semibold whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => {
              const { bg, color } = whoBadge(p.who);
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {p.date}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)", maxWidth: "240px" }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p.title}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: "#d946ef" }}>
                    {p.reach ? p.reach.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.likes || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.shares || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--foreground)" }}>{p.follows || "—"}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--muted-foreground)" }}>{p.reachLike || "—"}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>
                      {p.who || "—"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {p.type || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        background: p.cta === "Yes" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.12)",
                        color: p.cta === "Yes" ? "#22c55e" : "var(--muted-foreground)",
                      }}
                    >
                      {p.cta || "—"}
                    </span>
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

export default async function InstagramPage() {
  let monthly: IGMonthlyRow[] = [];
  let averages: IGMonthlyRow | null = null;
  let posts: IGPost[] = [];
  let fetchError = false;

  try {
    const rows = await fetchCSV(IG_CSV_URL);
    const data = parseIGData(rows);
    monthly = data.monthly;
    averages = data.averages;
    posts = data.posts;
  } catch {
    fetchError = true;
  }

  const filled = monthly.filter((m) => m.reach > 0);
  const latest = filled[filled.length - 1];
  const prev   = filled[filled.length - 2];
  // Stat cards show the latest month's value with MoM % change
  const mon = latest?.month ?? "";

  return (
    <DashboardLayout>
      {fetchError && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
        >
          <AlertCircle size={16} />
          <span>Could not load sheet data. Check that the CSV URL is still published.</span>
        </div>
      )}

      {/* Stat Cards — latest month value, MoM comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={`Avg Reach${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.reach.toLocaleString() : "—"}
          change={latest && prev ? pct(latest.reach, prev.reach) : ""}
          trend={latest && prev ? trendDir(latest.reach, prev.reach) : "neutral"}
          icon={Eye}
        />
        <StatCard
          title={`Avg Likes${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.likes.toFixed(1) : "—"}
          change={latest && prev ? pct(latest.likes, prev.likes) : ""}
          trend={latest && prev ? trendDir(latest.likes, prev.likes) : "neutral"}
          icon={Heart}
        />
        <StatCard
          title={`Avg Shares${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.shares.toFixed(1) : "—"}
          change={latest && prev ? pct(latest.shares, prev.shares) : ""}
          trend={latest && prev ? trendDir(latest.shares, prev.shares) : "neutral"}
          icon={Share2}
        />
        <StatCard
          title={`Avg Follows${mon ? ` · ${mon}` : ""}`}
          value={latest ? latest.follows.toFixed(2) : "—"}
          change={latest && prev ? pct(latest.follows, prev.follows) : ""}
          trend={latest && prev ? trendDir(latest.follows, prev.follows) : "neutral"}
          icon={UserPlus}
        />
      </div>

      {/* Monthly breakdown */}
      <div className="mb-6">
        <MonthlyTable monthly={monthly} averages={averages} />
      </div>

      {/* Post log */}
      <PostLog posts={posts} />

      {/* Empty state */}
      {!fetchError && filled.length === 0 && posts.length === 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}
        >
          <AlertCircle size={16} />
          <span>Sheet loaded but no data rows detected. Make sure the published tab contains IG tracker data.</span>
        </div>
      )}
    </DashboardLayout>
  );
}
