import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatCard } from "@/components/shared/StatCard";
import {
  Image as ImageIcon,
  Video,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Users,
  TrendingUp,
  Plus,
  Clock,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import {
  getInstagramProfile,
  getInstagramMedia,
  isInstagramConnected,
} from "@/lib/social/instagram";
import Link from "next/link";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const placeholderPosts = [
  { type: "Reel", status: "Scheduled", time: "Tomorrow, 10:00 AM", likes: "—", comments: "—" },
  { type: "Image", status: "Published", time: "Yesterday, 2:30 PM", likes: "1,284", comments: "47" },
  { type: "Carousel", status: "Published", time: "3 days ago", likes: "943", comments: "31" },
  { type: "Story", status: "Expired", time: "5 days ago", likes: "—", comments: "—" },
];

export default async function InstagramPage() {
  const connected = isInstagramConnected();
  const [profile, media] = connected
    ? await Promise.all([getInstagramProfile(), getInstagramMedia(6)])
    : [null, []];

  const followers = profile ? formatCount(profile.followers_count) : "87.4K";
  const avgLikes =
    media.length > 0
      ? formatCount(Math.round(media.reduce((s, m) => s + m.like_count, 0) / media.length))
      : "1.3K";
  const avgComments =
    media.length > 0
      ? formatCount(Math.round(media.reduce((s, m) => s + m.comments_count, 0) / media.length))
      : "48";

  return (
    <DashboardLayout>
      {/* Not-connected banner */}
      {!connected && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            borderColor: "rgba(245, 158, 11, 0.3)",
            color: "#f59e0b",
          }}
        >
          <AlertCircle size={16} />
          <span>
            Instagram is not connected — showing placeholder data.{" "}
            <Link href="/settings" className="underline underline-offset-2 font-medium">
              Connect your account →
            </Link>
          </span>
        </div>
      )}

      {/* Profile banner (when connected) */}
      {connected && profile && (
        <div
          className="flex items-center gap-4 px-5 py-4 rounded-xl border mb-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          {profile.profile_picture_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_picture_url}
              alt={profile.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              @{profile.username}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
              {profile.biography}
            </p>
          </div>
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--primary)" }}
            >
              <LinkIcon size={12} /> {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Followers" value={followers} change="+2.1K" trend="up" icon={Users} />
        <StatCard title="Avg. Likes" value={avgLikes} change="+8.4%" trend="up" icon={Heart} />
        <StatCard title="Avg. Comments" value={avgComments} change="+3.2%" trend="up" icon={MessageCircle} />
        <StatCard title="Reach (7d)" value={connected ? "—" : "214K"} change={connected ? "" : "-1.2%"} trend={connected ? "neutral" : "down"} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Queue / Recent Media */}
        <div className="lg:col-span-2">
          <PlaceholderCard
            title={connected && media.length > 0 ? "Recent Posts" : "Post Queue"}
            description={
              connected && media.length > 0
                ? "Latest published content from @mendoza.baseball.academy"
                : "Upcoming and recent posts across Instagram."
            }
          >
            <div className="mt-4 space-y-0">
              {connected && media.length > 0
                ? media.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between py-3 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ background: "rgba(217, 70, 239, 0.15)", color: "#d946ef" }}
                        >
                          {post.thumbnail_url || post.media_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.thumbnail_url ?? post.media_url}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : post.media_type === "VIDEO" ? (
                            <Video size={16} />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            {post.media_type === "CAROUSEL_ALBUM"
                              ? "Carousel"
                              : post.media_type === "VIDEO"
                              ? "Reel / Video"
                              : "Image"}
                          </p>
                          <p
                            className="text-xs flex items-center gap-1"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            <Clock size={11} /> {formatRelativeTime(post.timestamp)}
                            {post.caption && ` · ${post.caption.slice(0, 40)}…`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        <span className="flex items-center gap-1">
                          <Heart size={12} /> {formatCount(post.like_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} /> {formatCount(post.comments_count)}
                        </span>
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))
                : placeholderPosts.map((post, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(217, 70, 239, 0.15)", color: "#d946ef" }}
                        >
                          {post.type === "Reel" || post.type === "Story" ? (
                            <Video size={16} />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            {post.type}
                          </p>
                          <p className="text-xs flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                            <Clock size={11} /> {post.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {post.likes !== "—" && (
                          <span className="flex items-center gap-1">
                            <Heart size={12} /> {post.likes}
                          </span>
                        )}
                        {post.comments !== "—" && (
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} /> {post.comments}
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background:
                              post.status === "Scheduled"
                                ? "rgba(59,130,246,0.15)"
                                : post.status === "Published"
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(100,116,139,0.15)",
                            color:
                              post.status === "Scheduled"
                                ? "#3b82f6"
                                : post.status === "Published"
                                ? "#22c55e"
                                : "var(--muted-foreground)",
                          }}
                        >
                          {post.status}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </PlaceholderCard>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <PlaceholderCard title="Quick Actions">
            <div className="mt-4 space-y-2">
              {[
                { label: "Create New Post", icon: Plus, color: "#3b82f6" },
                { label: "Schedule Content", icon: Clock, color: "#22c55e" },
                { label: "View Insights", icon: TrendingUp, color: "#d946ef" },
                { label: "Manage Stories", icon: Bookmark, color: "#f59e0b" },
                { label: "Direct Messages", icon: Send, color: "#ef4444" },
              ].map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                    style={{ background: "var(--secondary)", color: "var(--foreground)" }}
                  >
                    <Icon size={16} style={{ color: action.color }} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </PlaceholderCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
