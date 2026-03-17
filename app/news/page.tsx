import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { Newspaper, Rss, Tag, ExternalLink, Clock } from "lucide-react";

const newsItems = [
  {
    source: "TechCrunch",
    category: "Tech",
    title: "Meta announces new creator monetization tools for Instagram Reels",
    time: "2 hours ago",
    tags: ["Instagram", "Monetization"],
    relevance: "high",
  },
  {
    source: "Social Media Today",
    category: "Social",
    title: "TikTok tests longer video format as competition with YouTube intensifies",
    time: "4 hours ago",
    tags: ["TikTok", "Video"],
    relevance: "medium",
  },
  {
    source: "Marketing Week",
    category: "Marketing",
    title: "Influencer marketing spend projected to grow 15% in 2026",
    time: "6 hours ago",
    tags: ["Influencer", "Trends"],
    relevance: "high",
  },
  {
    source: "The Verge",
    category: "Tech",
    title: "X introduces new analytics dashboard for business accounts",
    time: "8 hours ago",
    tags: ["X/Twitter", "Analytics"],
    relevance: "medium",
  },
  {
    source: "Adweek",
    category: "Advertising",
    title: "Short-form video continues to dominate ad spend allocation",
    time: "10 hours ago",
    tags: ["Video", "Advertising"],
    relevance: "low",
  },
  {
    source: "Digiday",
    category: "Marketing",
    title: "Brands shift budgets towards community-led growth strategies",
    time: "12 hours ago",
    tags: ["Strategy", "Community"],
    relevance: "medium",
  },
];

const relevanceColor: Record<string, string> = {
  high: "#22c55e",
  medium: "#f59e0b",
  low: "var(--muted-foreground)",
};

const relevanceBg: Record<string, string> = {
  high: "rgba(34,197,94,0.12)",
  medium: "rgba(245,158,11,0.12)",
  low: "rgba(100,116,139,0.12)",
};

export default function NewsPage() {
  return (
    <DashboardLayout>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {["All", "Tech", "Social", "Marketing", "Advertising"].map((cat, i) => (
          <button
            key={cat}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: i === 0 ? "var(--primary)" : "var(--secondary)",
              color: i === 0 ? "white" : "var(--muted-foreground)",
            }}
          >
            {cat}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            <Rss size={14} /> Manage Sources
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-4">
          {newsItems.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border p-5 transition-colors hover:border-blue-500/30"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(59,130,246,0.12)",
                        color: "var(--primary)",
                      }}
                    >
                      {item.source}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--secondary)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {item.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
                      <Clock size={11} /> {item.time}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium leading-snug mb-3" style={{ color: "var(--foreground)" }}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                      >
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: relevanceBg[item.relevance],
                      color: relevanceColor[item.relevance],
                    }}
                  >
                    {item.relevance}
                  </div>
                  <button style={{ color: "var(--muted-foreground)" }}>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Trending Topics */}
          <PlaceholderCard title="Trending Topics" icon={Newspaper}>
            <div className="mt-4 space-y-2">
              {[
                { topic: "#InstagramReels", count: "142K posts" },
                { topic: "#ContentMarketing", count: "89K posts" },
                { topic: "#SocialMediaTips", count: "67K posts" },
                { topic: "#CreatorEconomy", count: "54K posts" },
                { topic: "#VideoMarketing", count: "43K posts" },
              ].map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-sm" style={{ color: "var(--primary)" }}>
                    {t.topic}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </PlaceholderCard>

          {/* Sources */}
          <PlaceholderCard title="Active Sources" description="News feeds being monitored.">
            <div className="mt-3 space-y-2">
              {[
                { name: "TechCrunch", status: "active" },
                { name: "Social Media Today", status: "active" },
                { name: "Marketing Week", status: "active" },
                { name: "The Verge", status: "active" },
                { name: "Digiday", status: "active" },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--foreground)" }}>{s.name}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#22c55e" }}
                  />
                </div>
              ))}
            </div>
          </PlaceholderCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
