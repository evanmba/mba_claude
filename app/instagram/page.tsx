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
} from "lucide-react";

const placeholderPosts = [
  { type: "Reel", status: "Scheduled", time: "Tomorrow, 10:00 AM", likes: "—", comments: "—" },
  { type: "Image", status: "Published", time: "Yesterday, 2:30 PM", likes: "1,284", comments: "47" },
  { type: "Carousel", status: "Published", time: "3 days ago", likes: "943", comments: "31" },
  { type: "Story", status: "Expired", time: "5 days ago", likes: "—", comments: "—" },
];

export default function InstagramPage() {
  return (
    <DashboardLayout>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Followers" value="87.4K" change="+2.1K" trend="up" icon={Users} />
        <StatCard title="Avg. Likes" value="1.3K" change="+8.4%" trend="up" icon={Heart} />
        <StatCard title="Avg. Comments" value="48" change="+3.2%" trend="up" icon={MessageCircle} />
        <StatCard title="Reach (7d)" value="214K" change="-1.2%" trend="down" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Queue */}
        <div className="lg:col-span-2">
          <PlaceholderCard title="Post Queue" description="Upcoming and recent posts across Instagram.">
            <div className="mt-4 space-y-0">
              {placeholderPosts.map((post, i) => (
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
                    style={{
                      background: "var(--secondary)",
                      color: "var(--foreground)",
                    }}
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
