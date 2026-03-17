import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatCard } from "@/components/shared/StatCard";
import {
  Youtube,
  Eye,
  ThumbsUp,
  MessageSquare,
  Users,
  AlertCircle,
  Play,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  getYouTubeChannel,
  getYouTubeVideos,
  isYouTubeConnected,
  formatDuration,
  formatCount,
} from "@/lib/social/youtube";
import Link from "next/link";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const CHANNEL_URL = "https://www.youtube.com/channel/UCjfSfoqQxbCLU6P6BKr8CdA";

export default async function YouTubePage() {
  const connected = isYouTubeConnected();
  const [channel, videos] = connected
    ? await Promise.all([getYouTubeChannel(), getYouTubeVideos(8)])
    : [null, []];

  const subscribers = channel ? formatCount(channel.subscriberCount) : "—";
  const totalViews = channel ? formatCount(channel.viewCount) : "—";
  const videoCount = channel ? String(channel.videoCount) : "—";

  return (
    <DashboardLayout>
      {/* Not-connected banner */}
      {!connected && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
          }}
        >
          <AlertCircle size={16} />
          <span>
            YouTube API key not configured — showing channel info only.{" "}
            <Link href="/settings" className="underline underline-offset-2 font-medium">
              Add your API key →
            </Link>
          </span>
        </div>
      )}

      {/* Channel banner */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl border mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
        >
          {channel?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.thumbnailUrl} alt={channel.title} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <Youtube size={22} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {channel?.title ?? "Mendoza Baseball Academy"}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
            {channel?.customUrl ?? "@mendoza.baseball.academy"}
            {channel?.description && ` · ${channel.description.slice(0, 60)}…`}
          </p>
        </div>
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
        >
          <ExternalLink size={12} /> View Channel
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Subscribers" value={subscribers} change="" trend="neutral" icon={Users} />
        <StatCard title="Total Views" value={totalViews} change="" trend="neutral" icon={Eye} />
        <StatCard title="Videos" value={videoCount} change="" trend="neutral" icon={Play} />
        <StatCard title="Avg. Likes" value="—" change="" trend="neutral" icon={ThumbsUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Videos */}
        <div className="lg:col-span-2">
          <PlaceholderCard
            title="Recent Videos"
            description={
              connected && videos.length > 0
                ? "Latest uploads from the channel"
                : "Connect YouTube API to see recent videos"
            }
            icon={Youtube}
          >
            {connected && videos.length > 0 ? (
              <div className="mt-4 space-y-0">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 py-3 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ background: "var(--secondary)" }}
                    >
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play size={16} style={{ color: "var(--muted-foreground)" }} />
                        </div>
                      )}
                      <span
                        className="absolute bottom-0.5 right-0.5 text-white text-xs px-1 rounded"
                        style={{ background: "rgba(0,0,0,0.7)", fontSize: "10px" }}
                      >
                        {formatDuration(video.duration)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {video.title}
                      </p>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        <Clock size={11} /> {formatRelativeTime(video.publishedAt)}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {formatCount(video.viewCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={12} /> {formatCount(video.likeCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} /> {formatCount(video.commentCount)}
                      </span>
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                      >
                        Watch
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
                <Youtube size={32} style={{ color: "var(--muted-foreground)" }} className="mb-3 opacity-40" />
                <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
                  No videos loaded
                </p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Add your YouTube API key in Settings to load videos automatically.
                </p>
                <Link
                  href="/settings"
                  className="mt-4 text-xs px-4 py-2 rounded-lg font-medium"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                >
                  Go to Settings
                </Link>
              </div>
            )}
          </PlaceholderCard>
        </div>

        {/* Channel Quick Stats */}
        <div className="space-y-4">
          <PlaceholderCard title="Channel Info" icon={Youtube}>
            <div className="mt-4 space-y-3">
              {[
                { label: "Subscribers", value: subscribers, color: "#ef4444" },
                { label: "Total Views", value: totalViews, color: "#3b82f6" },
                { label: "Total Videos", value: videoCount, color: "#22c55e" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {stat.label}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
            >
              <ExternalLink size={14} /> Open YouTube Channel
            </a>
          </PlaceholderCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
