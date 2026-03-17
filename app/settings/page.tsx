import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { isInstagramConnected } from "@/lib/social/instagram";
import { isYouTubeConnected } from "@/lib/social/youtube";
import {
  Instagram,
  Youtube,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Key,
  Info,
} from "lucide-react";

const platforms = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@mendoza.baseball.academy",
    icon: Instagram,
    color: "#d946ef",
    bg: "rgba(217, 70, 239, 0.15)",
    envVars: [
      { name: "INSTAGRAM_ACCESS_TOKEN", desc: "Long-lived User Access Token (60-day expiry)" },
      { name: "INSTAGRAM_BUSINESS_ACCOUNT_ID", desc: "Your Instagram Business Account numeric ID" },
    ],
    docsUrl: "https://developers.facebook.com/docs/instagram-api/getting-started",
    steps: [
      "Go to developers.facebook.com and create a Business App",
      'Add "Instagram Graph API" product to the app',
      "Link your Instagram Business/Creator account via a Facebook Page",
      "In Graph API Explorer, select your app → generate token with instagram_basic, instagram_manage_insights permissions",
      "Exchange for a long-lived token (60 days) and copy your Instagram Business Account ID",
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    handle: "UCjfSfoqQxbCLU6P6BKr8CdA",
    icon: Youtube,
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.15)",
    envVars: [
      { name: "YOUTUBE_API_KEY", desc: "YouTube Data API v3 key from Google Cloud Console" },
      { name: "YOUTUBE_CHANNEL_ID", desc: "Already set to your channel ID (UCjfSfoqQ…)" },
    ],
    docsUrl: "https://developers.google.com/youtube/v3/getting-started",
    steps: [
      "Go to console.cloud.google.com and create a project",
      'Enable "YouTube Data API v3" in APIs & Services → Library',
      "Go to APIs & Services → Credentials → Create API Key",
      "(Optional) Restrict key to YouTube Data API v3 for security",
      "Copy the API key into .env.local",
    ],
  },
];

export default function SettingsPage() {
  const connected = {
    instagram: isInstagramConnected(),
    youtube: isYouTubeConnected(),
  };

  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <DashboardLayout>
      {/* Header summary */}
      <div
        className="flex items-center justify-between px-5 py-4 rounded-xl border mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Connected Accounts
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {connectedCount} of {platforms.length} platforms connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          {platforms.map((p) => {
            const Icon = p.icon;
            const isConn = connected[p.id as keyof typeof connected];
            return (
              <div
                key={p.id}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: isConn ? p.bg : "var(--secondary)" }}
                title={`${p.label}: ${isConn ? "connected" : "not connected"}`}
              >
                <Icon size={16} style={{ color: isConn ? p.color : "var(--muted-foreground)" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup instructions banner */}
      <div
        className="flex gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
        style={{
          background: "rgba(59, 130, 246, 0.06)",
          borderColor: "rgba(59, 130, 246, 0.2)",
          color: "var(--muted-foreground)",
        }}
      >
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
        <div>
          <p className="font-medium mb-1" style={{ color: "var(--foreground)" }}>
            How to connect your accounts
          </p>
          <p>
            Follow the steps for each platform below to get your API credentials. Once you have them,
            copy <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--secondary)" }}>.env.local.example</code> to{" "}
            <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--secondary)" }}>.env.local</code> in the project root and fill in your values.
            Restart the dev server after saving.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="space-y-4">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isConn = connected[platform.id as keyof typeof connected];

          return (
            <div
              key={platform.id}
              className="rounded-xl border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              {/* Platform header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: platform.bg, color: platform.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {platform.label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {platform.handle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isConn ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#22c55e" }}>
                      <CheckCircle2 size={14} /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                      <XCircle size={14} /> Not connected
                    </span>
                  )}
                  <a
                    href={platform.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                  >
                    <ExternalLink size={11} /> Docs
                  </a>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Env vars */}
                <div>
                  <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--foreground)" }}>
                    <Key size={12} /> Required environment variables
                  </p>
                  <div className="space-y-2">
                    {platform.envVars.map((ev) => (
                      <div key={ev.name}>
                        <code
                          className="text-xs px-2 py-1 rounded block mb-0.5"
                          style={{ background: "var(--secondary)", color: platform.color }}
                        >
                          {ev.name}
                        </code>
                        <p className="text-xs pl-1" style={{ color: "var(--muted-foreground)" }}>
                          {ev.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setup steps */}
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                    Setup steps
                  </p>
                  <ol className="space-y-1.5">
                    {platform.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        <span
                          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5"
                          style={{ background: platform.bg, color: platform.color, fontSize: "10px" }}
                        >
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
