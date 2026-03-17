import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatCard } from "@/components/shared/StatCard";
import { BarChart3, TrendingUp, Users, Eye, MousePointerClick, Share2 } from "lucide-react";

const metrics = [
  { label: "Mon", reach: 12400, engagement: 840 },
  { label: "Tue", reach: 18200, engagement: 1120 },
  { label: "Wed", reach: 15800, engagement: 960 },
  { label: "Thu", reach: 22100, engagement: 1480 },
  { label: "Fri", reach: 19600, engagement: 1340 },
  { label: "Sat", reach: 26300, engagement: 1820 },
  { label: "Sun", reach: 21000, engagement: 1540 },
];

const maxReach = Math.max(...metrics.map((m) => m.reach));

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Reach" value="135K" change="+18.2%" trend="up" icon={Eye} />
        <StatCard title="Impressions" value="2.1M" change="+11.4%" trend="up" icon={TrendingUp} />
        <StatCard title="Link Clicks" value="8,342" change="+6.1%" trend="up" icon={MousePointerClick} />
        <StatCard title="Shares" value="1,284" change="-2.3%" trend="down" icon={Share2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Reach Chart Placeholder */}
        <div className="lg:col-span-2">
          <PlaceholderCard title="Weekly Reach Overview" description="Reach and engagement over the past 7 days." icon={BarChart3}>
            <div className="mt-6 flex items-end gap-3 h-40">
              {metrics.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t-sm opacity-40"
                      style={{
                        background: "var(--primary)",
                        height: `${(m.reach / maxReach) * 120}px`,
                      }}
                    />
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        background: "var(--primary)",
                        height: `${(m.engagement / maxReach) * 120}px`,
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm opacity-40"
                  style={{ background: "var(--primary)" }}
                />
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Reach
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: "var(--primary)" }} />
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Engagement
                </span>
              </div>
            </div>
          </PlaceholderCard>
        </div>

        {/* Audience Breakdown */}
        <PlaceholderCard title="Audience Breakdown" icon={Users}>
          <div className="mt-4 space-y-3">
            {[
              { label: "18–24", pct: 32 },
              { label: "25–34", pct: 41 },
              { label: "35–44", pct: 18 },
              { label: "45+", pct: 9 },
            ].map((g, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--foreground)" }}>{g.label}</span>
                  <span style={{ color: "var(--muted-foreground)" }}>{g.pct}%</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--secondary)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.pct}%`, background: "var(--primary)" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-4 pt-4 border-t text-xs"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Top locations: New York, Los Angeles, London
          </div>
        </PlaceholderCard>
      </div>

      {/* Top Posts */}
      <div className="mt-6">
        <PlaceholderCard title="Top Performing Content" description="Your best performing posts this month.">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: "Reel", reach: "42.1K", eng: "6.2%", rank: 1 },
              { type: "Carousel", reach: "28.4K", eng: "4.8%", rank: 2 },
              { type: "Image", reach: "21.9K", eng: "3.9%", rank: 3 },
            ].map((post, i) => (
              <div
                key={i}
                className="rounded-lg p-4 border"
                style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                    #{post.rank}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                  >
                    {post.type}
                  </span>
                </div>
                <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                  {post.reach}
                </p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Reach · {post.eng} engagement
                </p>
              </div>
            ))}
          </div>
        </PlaceholderCard>
      </div>
    </DashboardLayout>
  );
}
