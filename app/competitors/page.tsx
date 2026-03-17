import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatCard } from "@/components/shared/StatCard";
import { Users, TrendingUp, BarChart3, Plus } from "lucide-react";

const competitors = [
  {
    name: "BrandX",
    handle: "@brandx",
    followers: "215K",
    posts: 12,
    engRate: "3.2%",
    trend: "up" as const,
    change: "+4.1K",
  },
  {
    name: "MediaCo",
    handle: "@mediaco",
    followers: "189K",
    posts: 8,
    engRate: "4.7%",
    trend: "up" as const,
    change: "+2.8K",
  },
  {
    name: "CreativeHub",
    handle: "@creativehub",
    followers: "143K",
    posts: 15,
    engRate: "2.9%",
    trend: "down" as const,
    change: "-1.2K",
  },
  {
    name: "StartupXYZ",
    handle: "@startupxyz",
    followers: "98K",
    posts: 6,
    engRate: "5.1%",
    trend: "up" as const,
    change: "+3.3K",
  },
];

export default function CompetitorsPage() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div />
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--primary)" }}
        >
          <Plus size={15} /> Add Competitor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Tracked Accounts" value="4" icon={Users} />
        <StatCard title="Avg. Their Eng." value="4.0%" change="+0.3%" trend="up" icon={TrendingUp} />
        <StatCard title="Your Eng. Rate" value="4.8%" change="+0.2%" trend="up" icon={BarChart3} />
        <StatCard title="Posts This Week" value="41" change="+7" trend="up" icon={TrendingUp} />
      </div>

      {/* Competitor Table */}
      <PlaceholderCard title="Tracked Competitors" description="Monitor follower growth, post frequency, and engagement.">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--border)` }}>
                {["Account", "Followers", "Posts (7d)", "Eng. Rate", "7d Change"].map((col) => (
                  <th
                    key={col}
                    className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitors.map((c, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid var(--border)` }}
                  className="transition-colors hover:bg-white/5"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "var(--primary)" }}
                      >
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: "var(--foreground)" }}>
                          {c.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {c.handle}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium" style={{ color: "var(--foreground)" }}>
                    {c.followers}
                  </td>
                  <td className="py-3 px-3" style={{ color: "var(--foreground)" }}>
                    {c.posts}
                  </td>
                  <td className="py-3 px-3" style={{ color: "var(--foreground)" }}>
                    {c.engRate}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className="text-xs font-medium"
                      style={{ color: c.trend === "up" ? "#22c55e" : "#ef4444" }}
                    >
                      {c.change}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlaceholderCard>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlaceholderCard
          title="Content Gap Analysis"
          description="Topics your competitors cover that you don't."
        >
          <div className="mt-4 space-y-2">
            {["Behind-the-scenes content", "User testimonials", "Product tutorials", "Industry news"].map(
              (topic, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--secondary)", color: "var(--foreground)" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--primary)" }}
                  />
                  {topic}
                </div>
              )
            )}
          </div>
        </PlaceholderCard>

        <PlaceholderCard
          title="Best Posting Times"
          description="When competitors get the most engagement."
        >
          <div className="mt-4 space-y-3">
            {[
              { day: "Tuesday", time: "10:00 AM", engBoost: "+28%" },
              { day: "Thursday", time: "6:00 PM", engBoost: "+22%" },
              { day: "Saturday", time: "12:00 PM", engBoost: "+19%" },
            ].map((slot, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: "var(--secondary)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {slot.day} · {slot.time}
                  </p>
                </div>
                <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>
                  {slot.engBoost}
                </span>
              </div>
            ))}
          </div>
        </PlaceholderCard>
      </div>
    </DashboardLayout>
  );
}
