import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { ExternalLink, Youtube, Instagram, TrendingUp } from "lucide-react";

// ─── Data — add rows here to keep the tracker updated ────────────────────────

type Platform = "YT" | "IG" | "Both";

interface Competitor {
  name: string;
  handle: string;
  platform: Platform;
  niche: string;
  ytUrl?: string;
  igUrl?: string;
}

interface ViralEntry {
  date: string;
  creator: string;
  platform: "YT" | "IG";
  title: string;
  views: string;       // e.g. "1.2M" or "48K reach"
  hook: string;        // hook/format type
  topic: string;       // content topic
  notes: string;       // why it worked / what to steal
  url: string;
}

// Add competitor accounts here
const COMPETITORS: Competitor[] = [
  {
    name: "Ian Jenkins Hitting",
    handle: "@ianjenkinshitting",
    platform: "Both",
    niche: "Hitting instruction / development",
    ytUrl: "https://www.youtube.com/@ianjenkinshitting",
    igUrl: "https://www.instagram.com/ianjenkinshitting",
  },
  {
    name: "AthletesU",
    handle: "@athletesu_",
    platform: "IG",
    niche: "Athlete development / recruiting",
    igUrl: "https://www.instagram.com/athletesu_",
  },
  {
    name: "Driveline Baseball",
    handle: "@drivelinebaseball",
    platform: "Both",
    niche: "Player development / metrics",
    ytUrl: "https://www.youtube.com/@DrivelineBaseball",
    igUrl: "https://www.instagram.com/drivelinebaseball",
  },
  {
    name: "Baseball Rebellion",
    handle: "@baseballrebellion",
    platform: "Both",
    niche: "Hitting mechanics / development",
    ytUrl: "https://www.youtube.com/@BaseballRebellion",
    igUrl: "https://www.instagram.com/baseballrebellion",
  },
  {
    name: "Prep Baseball Report",
    handle: "@prepbaseballreport",
    platform: "Both",
    niche: "Recruiting / rankings / showcases",
    ytUrl: "https://www.youtube.com/@PrepBaseballReport",
    igUrl: "https://www.instagram.com/prepbaseballreport",
  },
  {
    name: "Perfect Game USA",
    handle: "@perfectgameusa",
    platform: "Both",
    niche: "Showcases / rankings / recruiting",
    ytUrl: "https://www.youtube.com/@perfectgameusa",
    igUrl: "https://www.instagram.com/perfectgameusa",
  },
  {
    name: "Extra Innings Baseball",
    handle: "@extrainningsbaseball",
    platform: "Both",
    niche: "College recruiting / player dev",
    ytUrl: "https://www.youtube.com/@ExtraInningsBaseball",
    igUrl: "https://www.instagram.com/extrainningsbaseball",
  },
];

// Add viral video/post entries here — newest at top
const VIRAL_LOG: ViralEntry[] = [
  {
    date: "3/15/26",
    creator: "Driveline Baseball",
    platform: "YT",
    title: "Why 90% of Pitchers Train Arm Velo Wrong",
    views: "220K",
    hook: "Myth Bust",
    topic: "Velocity",
    notes: "Strong counter-intuitive hook. Opens with a stat that shocks parents. Could repurpose angle for recruiting misconceptions.",
    url: "https://youtube.com",
  },
  {
    date: "3/12/26",
    creator: "Baseball Rebellion",
    platform: "IG",
    title: "Before & After swing in 6 weeks",
    views: "84K reach",
    hook: "Transformation",
    topic: "Hitting / Development",
    notes: "Side-by-side video clip. Simple edit. High share rate because parents tag their kids. Try this with exit velo or 60 time.",
    url: "https://instagram.com",
  },
  {
    date: "3/10/26",
    creator: "Prep Baseball Report",
    platform: "YT",
    title: "The Truth About Showcases Nobody Talks About",
    views: "95K",
    hook: "Exposé / Contrarian",
    topic: "Recruiting / Showcases",
    notes: "Title creates curiosity + mild controversy. Comments blew up with parents asking questions. Recruiting honesty angle works.",
    url: "https://youtube.com",
  },
  {
    date: "3/7/26",
    creator: "Extra Innings Baseball",
    platform: "YT",
    title: "D1 Offer at 15 — Here's What He Did Differently",
    views: "310K",
    hook: "Story / Case Study",
    topic: "Recruiting",
    notes: "Early success story format. Specific age + outcome in title crushes CTR. Strong call to action for free resource at end.",
    url: "https://youtube.com",
  },
  {
    date: "3/5/26",
    creator: "Perfect Game USA",
    platform: "IG",
    title: "Coaches are looking for THIS at showcases (not what you think)",
    views: "51K reach",
    hook: "Revelation / Talking Head",
    topic: "Showcases / Recruiting",
    notes: "Parenthetical adds curiosity. Short 30s clip. Coaches talking directly to camera = authority. High save rate.",
    url: "https://instagram.com",
  },
  {
    date: "2/28/26",
    creator: "Baseball Rebellion",
    platform: "YT",
    title: "This Drill Added 8mph of Exit Velo in 3 Weeks",
    views: "178K",
    hook: "Result-Led / Demo",
    topic: "Hitting / Exit Velo",
    notes: "Specific result + timeframe in title = very high CTR. Demo-style video with overlay graphics. Steal for arm velo / 60 time content.",
    url: "https://youtube.com",
  },
];

// ─── Hook type badge colours ──────────────────────────────────────────────────

const HOOK_COLORS: Record<string, { bg: string; color: string }> = {
  "Myth Bust":          { bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
  "Transformation":     { bg: "rgba(34,197,94,0.15)",   color: "#22c55e" },
  "Exposé / Contrarian":{ bg: "rgba(245,158,11,0.15)",  color: "#f59e0b" },
  "Story / Case Study": { bg: "rgba(217,70,239,0.15)",  color: "#d946ef" },
  "Revelation / Talking Head": { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  "Result-Led / Demo":  { bg: "rgba(20,184,166,0.15)",  color: "#14b8a6" },
};

function hookBadge(hook: string) {
  return HOOK_COLORS[hook] ?? { bg: "rgba(100,116,139,0.15)", color: "var(--muted-foreground)" };
}

// ─── Derived: topic frequency for gap analysis ────────────────────────────────

function topicFrequency(log: ViralEntry[]) {
  const counts: Record<string, number> = {};
  for (const e of log) {
    counts[e.topic] = (counts[e.topic] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const topics = topicFrequency(VIRAL_LOG);

  return (
    <DashboardLayout>

      {/* Competitor Accounts */}
      <div className="mb-6">
        <PlaceholderCard
          title="Tracked Accounts"
          description="Baseball creators and channels to monitor regularly."
        >
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {COMPETITORS.map((c, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 p-4 rounded-xl border"
                style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "var(--primary)" }}
                  >
                    {c.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                      {c.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                      {c.niche}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {(c.platform === "YT" || c.platform === "Both") && c.ytUrl && (
                        <a
                          href={c.ytUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                        >
                          <Youtube size={10} /> YT
                        </a>
                      )}
                      {(c.platform === "IG" || c.platform === "Both") && c.igUrl && (
                        <a
                          href={c.igUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(217,70,239,0.15)", color: "#d946ef" }}
                        >
                          <Instagram size={10} /> IG
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PlaceholderCard>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Viral Video Log — takes 3 cols */}
        <div className="lg:col-span-3">
          <PlaceholderCard
            title={`Viral Content Log — ${VIRAL_LOG.length} entries`}
            description="High-performing competitor content. Add new entries at the top of VIRAL_LOG in competitors/page.tsx."
          >
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Date", "Creator", "Plat.", "Title", "Views", "Hook", "Topic", "Notes", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 font-semibold whitespace-nowrap"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VIRAL_LOG.map((v, i) => {
                    const { bg, color } = hookBadge(v.hook);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="py-3 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                          {v.date}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap font-medium" style={{ color: "var(--foreground)" }}>
                          {v.creator}
                        </td>
                        <td className="py-3 pr-4">
                          {v.platform === "YT" ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                              <Youtube size={10} /> YT
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: "rgba(217,70,239,0.15)", color: "#d946ef" }}>
                              <Instagram size={10} /> IG
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4" style={{ color: "var(--foreground)", maxWidth: "220px" }}>
                          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {v.title}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-semibold whitespace-nowrap" style={{ color: "#f59e0b" }}>
                          {v.views}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                            style={{ background: bg, color }}>
                            {v.hook}
                          </span>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                          {v.topic}
                        </td>
                        <td className="py-3 pr-4" style={{ color: "var(--muted-foreground)", maxWidth: "260px" }}>
                          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {v.notes}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap"
                            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                          >
                            <ExternalLink size={11} /> Watch
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PlaceholderCard>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Topic frequency */}
          <PlaceholderCard title="Hot Topics" description="Most frequent in viral log">
            <div className="mt-4 space-y-2">
              {topics.map(([topic, count], i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <span className="text-xs truncate" style={{ color: "var(--foreground)" }}>{topic}</span>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
                  >
                    {count}x
                  </span>
                </div>
              ))}
            </div>
          </PlaceholderCard>

          {/* Hook type breakdown */}
          <PlaceholderCard title="Hook Types Winning" description="Formats driving views in the log">
            <div className="mt-4 space-y-2">
              {Array.from(new Set(VIRAL_LOG.map((v) => v.hook))).map((hook, i) => {
                const { bg, color } = hookBadge(hook);
                const count = VIRAL_LOG.filter((v) => v.hook === hook).length;
                return (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
                      {hook}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {count}x
                    </span>
                  </div>
                );
              })}
            </div>
          </PlaceholderCard>

        </div>
      </div>
    </DashboardLayout>
  );
}
