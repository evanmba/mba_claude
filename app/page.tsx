import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import {
  Instagram,
  BarChart3,
  CalendarDays,
  Users,
  Newspaper,
  TrendingUp,
  Eye,
  Heart,
} from "lucide-react";
import Link from "next/link";

const sections = [
  {
    label: "Instagram Manager",
    href: "/instagram",
    icon: Instagram,
    description: "Schedule posts, manage stories, track engagement across your Instagram presence.",
    bg: "rgba(217, 70, 239, 0.15)",
    color: "#d946ef",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Deep dive into performance metrics, audience insights, and growth trends.",
    bg: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  {
    label: "Content Calendar",
    href: "/calendar",
    icon: CalendarDays,
    description: "Plan, organize, and schedule content across all platforms in one view.",
    bg: "rgba(34, 197, 94, 0.15)",
    color: "#22c55e",
  },
  {
    label: "Competitor Tracker",
    href: "/competitors",
    icon: Users,
    description: "Monitor competitor activity, benchmark performance, and spot opportunities.",
    bg: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
  },
  {
    label: "News Consolidator",
    href: "/news",
    icon: Newspaper,
    description: "Stay up to date with aggregated news, trends, and industry updates.",
    bg: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
  },
];

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Followers" value="124.5K" change="+12.3%" trend="up" icon={Users} />
        <StatCard title="Post Impressions" value="2.1M" change="+8.7%" trend="up" icon={Eye} />
        <StatCard title="Engagement Rate" value="4.8%" change="-0.3%" trend="down" icon={Heart} />
        <StatCard title="Content Published" value="38" change="+5" trend="up" icon={TrendingUp} />
      </div>

      {/* Section Tiles */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          Quick Navigation
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
          Jump to any section of your content management suite.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href} className="block group">
                <div
                  className="rounded-xl border p-5 h-full transition-all duration-200 group-hover:border-blue-500/40"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: section.bg, color: section.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                    {section.label}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                    {section.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <PlaceholderCard title="Recent Activity" description="Your latest content actions and updates.">
        <div className="mt-4 space-y-0">
          {[
            { action: "Post scheduled", detail: "Instagram reel for tomorrow 10:00 AM", time: "2 min ago" },
            { action: "Competitor update", detail: "BrandX published 3 new posts", time: "15 min ago" },
            { action: "Analytics report", detail: "Weekly report ready to view", time: "1 hr ago" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start justify-between py-3 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {item.action}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {item.detail}
                </p>
              </div>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </PlaceholderCard>
    </DashboardLayout>
  );
}
