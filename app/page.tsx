import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/shared/StatCard";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import {
  Instagram,
  Youtube,
  Users,
  TrendingUp,
  Eye,
  Heart,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { isInstagramConnected } from "@/lib/social/instagram";
import { isYouTubeConnected } from "@/lib/social/youtube";

const sections = [
  {
    label: "Instagram",
    href: "/instagram",
    icon: Instagram,
    description: "Posts, reels, and engagement metrics for @mendoza.baseball.academy.",
    bg: "rgba(217, 70, 239, 0.15)",
    color: "#d946ef",
  },
  {
    label: "YouTube",
    href: "/youtube",
    icon: Youtube,
    description: "Channel stats, recent videos, CTR, and watch time.",
    bg: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
  },
  {
    label: "Competitor Tracker",
    href: "/competitors",
    icon: Users,
    description: "Track viral baseball content and spot what's working in the niche.",
    bg: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
  },
];

export default function DashboardPage() {
  const platforms = [
    { label: "Instagram", icon: Instagram, color: "#d946ef", bg: "rgba(217,70,239,0.15)", connected: isInstagramConnected() },
    { label: "YouTube", icon: Youtube, color: "#ef4444", bg: "rgba(239,68,68,0.15)", connected: isYouTubeConnected() },
  ];
  const connectedCount = platforms.filter((p) => p.connected).length;

  return (
    <DashboardLayout>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Followers" value="—" change="" trend="neutral" icon={Users} />
        <StatCard title="Post Impressions" value="—" change="" trend="neutral" icon={Eye} />
        <StatCard title="Engagement Rate" value="—" change="" trend="neutral" icon={Heart} />
        <StatCard title="Content Published" value="—" change="" trend="neutral" icon={TrendingUp} />
      </div>

      {/* Platform connection status */}
      <div
        className="flex items-center justify-between px-5 py-4 rounded-xl border mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Connected Platforms
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {connectedCount === 0
              ? "No platforms connected yet"
              : `${connectedCount} of ${platforms.length} platforms connected`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {platforms.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.label}
                className="flex items-center gap-1.5 text-xs"
                title={`${p.label}: ${p.connected ? "connected" : "not connected"}`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: p.connected ? p.bg : "var(--secondary)" }}
                >
                  <Icon size={14} style={{ color: p.connected ? p.color : "var(--muted-foreground)" }} />
                </div>
              </div>
            );
          })}
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ml-2"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            <Settings size={13} /> Connect
          </Link>
        </div>
      </div>

      {/* Section Tiles */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          Quick Navigation
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
          Jump to any section of your dashboard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            { action: "Dashboard ready", detail: "Connect your social accounts to start pulling live data", time: "Now" },
            { action: "Instagram", detail: "Add INSTAGRAM_ACCESS_TOKEN to .env.local to connect", time: "" },
            { action: "YouTube", detail: "Add YOUTUBE_API_KEY to .env.local to connect", time: "" },
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
              {item.time && (
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {item.time}
                </span>
              )}
            </div>
          ))}
        </div>
      </PlaceholderCard>
    </DashboardLayout>
  );
}
