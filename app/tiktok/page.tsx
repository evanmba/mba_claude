import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatCard } from "@/components/shared/StatCard";
import {
  Music2,
  Users,
  Heart,
  MessageSquare,
  Share2,
  AlertCircle,
  Play,
  Eye,
  Clock,
  ExternalLink,
} from "lucide-react";
import { getTikTokUser, getTikTokVideos, isTikTokConnected } from "@/lib/social/tiktok";
import Link from "next/link";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeTime(unixSec: number): string {
  const diff = Date.now() - unixSec * 1000;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default async function TikTokPage() {
  const connected = isTikTokConnected();
  const [user, videos] = connected
    ? await Promise.all([getTikTokUser(), getTikTokVideos(8)])
    : [null, []];

  const followers = user ? formatCount(user.follower_count) : "—";
  const likes = user ? formatCount(user.likes_count) : "—";
  const videoCount = user ? String(user.video_count) : "—";

  return (
    <DashboardLayout>
      {!connected && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{
            background: "rgba(148, 163, 184, 0.08)",
            borderColor: "rgba(148, 163, 184, 0.2)",
            color: "var(--muted-foreground)",
          }}
        >
          <AlertCircle size={16} />
          <span>
            TikTok is not connected — requires business verification.{" "}
            <Link href="/settings" className="underline underline-offset-2 font-medium" style={{ color: "var(--foreground)" }}>
              See setup instructions →
            </Link>
          </span>
        </div>
      )}

      {/* Profile banner */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl border mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" }}
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt={user.display_name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <Music2 size={22} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {user?.display_name ?? "Mendoza Baseball Academy"}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            @mendoza.baseball.academy
          </p>
        </div>
        <a
          href={user?.profile_deep_link ?? "https://www.tiktok.com/@mendoza.baseball.academy"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}
        >
          <ExternalLink size={12} /> View Profile
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Followers" value={connected ? followers : "—"} change="" trend="neutral" icon={Users} />
        <StatCard title="Total Likes" value={connected ? likes : "—"} change="" trend="neutral" icon={Heart} />
        <StatCard title="Videos" value={connected ? videoCount : "—"} change="" trend="neutral" icon={Play} />
        <StatCard title="Following" value={connected && user ? String(user.following_count) : "—"} change="" trend="neutral" icon={Share2} />
      </div>

      {/* Videos */}
      <PlaceholderCard
        title="Recent Videos"
        description={connected && videos.length > 0 ? "Latest TikTok videos" : "Connect TikTok to see your videos"}
        icon={Music2}
      >
        {connected && videos.length > 0 ? (
          <div className="mt-4 space-y-0">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-3 py-3 border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="relative w-10 h-14 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ background: "var(--secondary)" }}
                >
                  {video.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.cover_image_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={12} style={{ color: "var(--muted-foreground)" }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {video.title || "Untitled"}
                  </p>
                  <p className="text-xs flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                    <Clock size={11} /> {formatRelativeTime(video.create_time)}
                    {" · "}{video.duration}s
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>
                  <span className="flex items-center gap-1">
                    <Eye size={12} /> {formatCount(video.view_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {formatCount(video.like_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} /> {formatCount(video.comment_count)}
                  </span>
                  <a
                    href={video.share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}
                  >
                    Watch
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
            <Music2 size={32} style={{ color: "var(--muted-foreground)" }} className="mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              TikTok not connected
            </p>
            <p className="text-xs max-w-xs" style={{ color: "var(--muted-foreground)" }}>
              TikTok API requires business verification and app review. See Settings for step-by-step instructions.
            </p>
            <Link
              href="/settings"
              className="mt-4 text-xs px-4 py-2 rounded-lg font-medium"
              style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}
            >
              View Setup Instructions
            </Link>
          </div>
        )}
      </PlaceholderCard>
    </DashboardLayout>
  );
}
