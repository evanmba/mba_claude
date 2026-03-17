import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { StatCard } from "@/components/shared/StatCard";
import {
  Facebook,
  Users,
  ThumbsUp,
  MessageSquare,
  Share2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  getFacebookPage,
  getFacebookPosts,
  isFacebookConnected,
} from "@/lib/social/facebook";
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

export default async function FacebookPage() {
  const connected = isFacebookConnected();
  const [page, posts] = connected
    ? await Promise.all([getFacebookPage(), getFacebookPosts(8)])
    : [null, []];

  const fans = page ? formatCount(page.fan_count) : "—";
  const followers = page ? formatCount(page.followers_count) : "—";

  return (
    <DashboardLayout>
      {!connected && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{
            background: "rgba(59, 130, 246, 0.08)",
            borderColor: "rgba(59, 130, 246, 0.3)",
            color: "#3b82f6",
          }}
        >
          <AlertCircle size={16} />
          <span>
            Facebook is not connected — showing placeholder data.{" "}
            <Link href="/settings" className="underline underline-offset-2 font-medium">
              Connect your Page →
            </Link>
          </span>
        </div>
      )}

      {/* Page banner */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl border mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}
        >
          {page?.picture?.data?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={page.picture.data.url} alt={page.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <Facebook size={22} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {page?.name ?? "Mendoza Baseball Academy"}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {page?.about ?? "Facebook Page"}
          </p>
        </div>
        <a
          href="https://www.facebook.com/mendoza.baseball.academy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
        >
          <ExternalLink size={12} /> View Page
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Page Likes" value={connected ? fans : "12.3K"} change="+1.2%" trend="up" icon={ThumbsUp} />
        <StatCard title="Followers" value={connected ? followers : "13.1K"} change="+0.9%" trend="up" icon={Users} />
        <StatCard title="Post Reach" value="—" change="" trend="neutral" icon={Share2} />
        <StatCard title="Engagement" value="—" change="" trend="neutral" icon={MessageSquare} />
      </div>

      {/* Posts */}
      <PlaceholderCard
        title={connected && posts.length > 0 ? "Recent Posts" : "Recent Posts"}
        description={connected && posts.length > 0 ? "Latest posts from your Facebook Page" : "Connect Facebook to see your posts"}
        icon={Facebook}
      >
        {connected && posts.length > 0 ? (
          <div className="mt-4 space-y-0">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-3 py-3 border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "var(--foreground)" }}>
                    {(post.message ?? post.story ?? "").slice(0, 120)}
                    {(post.message ?? post.story ?? "").length > 120 && "…"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {formatRelativeTime(post.created_time)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={12} /> {post.likes?.summary?.total_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} /> {post.comments?.summary?.total_count ?? 0}
                  </span>
                  <a
                    href={post.permalink_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
            <Facebook size={32} style={{ color: "var(--muted-foreground)" }} className="mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              No posts loaded
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Add your Facebook Page credentials in Settings to load posts.
            </p>
            <Link
              href="/settings"
              className="mt-4 text-xs px-4 py-2 rounded-lg font-medium"
              style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
            >
              Go to Settings
            </Link>
          </div>
        )}
      </PlaceholderCard>
    </DashboardLayout>
  );
}
