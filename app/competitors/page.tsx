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
    handle: "@ianjenkins_hitting",
    platform: "Both",
    niche: "Exit velo / rotational hitting / Freak Athlete Protocol",
    ytUrl: "https://www.youtube.com/@ianjenkins_hitting",
    igUrl: "https://www.instagram.com/ianjenkins_hitting",
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
// URLs: paste the direct video link when you find the video. Channel links are defaults.
const VIRAL_LOG: ViralEntry[] = [
  {
    date: "3/15/26",
    creator: "Ian Jenkins Hitting",
    platform: "YT",
    title: "I went from 0 D1 offers to a full ride — here's exactly what happened",
    views: "UPDATE",
    hook: "Story / Case Study",
    topic: "Recruiting / Origin Story",
    notes: "His personal story (no offers → USC viral home run clip) is the hook. High share/save from parents and players. Origin story format gets emotional buy-in fast. We have a similar story to tell.",
    url: "https://www.youtube.com/@ianjenkins_hitting",
  },
  {
    date: "3/12/26",
    creator: "Ian Jenkins Hitting",
    platform: "IG",
    title: "92 mph → 103 mph exit velocity. Here's the only thing that changed.",
    views: "UPDATE",
    hook: "Transformation",
    topic: "Exit Velo / Development",
    notes: "Specific numbers in the hook do the heavy lifting. Before/after with a single clear lesson = high share rate. Parents tag their kids. Reel format, 30–45s, overlay text.",
    url: "https://www.instagram.com/ianjenkins_hitting",
  },
  {
    date: "3/10/26",
    creator: "Ian Jenkins Hitting",
    platform: "YT",
    title: "The Freak Athlete Protocol: Why Small Hitters Hit the Ball the Hardest",
    views: "UPDATE",
    hook: "Myth Bust",
    topic: "Exit Velo / Mechanics",
    notes: "Counter-intuitive premise (small = hardest hitter). Ian positions himself as proof. His branding around 'freak athlete' gives the myth bust credibility. Steal for our niche: the 'overlooked' athlete angle.",
    url: "https://www.youtube.com/@ianjenkins_hitting",
  },
  {
    date: "3/8/26",
    creator: "AthletesU",
    platform: "IG",
    title: "UPDATE — paste title from their latest viral reel",
    views: "UPDATE",
    hook: "UPDATE",
    topic: "Athlete Development / Recruiting",
    notes: "Monitor @athletesu_ for reels. Note hook format, caption length, and whether they use a CTA. Update this row with real data.",
    url: "https://www.instagram.com/athletesu_",
  },
  {
    date: "3/5/26",
    creator: "Driveline Baseball",
    platform: "YT",
    title: "We Tested 500 Pitchers. Here's What Actually Adds Velocity.",
    views: "UPDATE",
    hook: "Data / Study",
    topic: "Velocity / Pitching",
    notes: "Data-backed authority is Driveline's whole brand. 'We tested X' opener = high credibility. Comments full of coaches and players debating. Works because it challenges conventional wisdom with real numbers.",
    url: "https://www.youtube.com/@DrivelineBaseball",
  },
  {
    date: "3/1/26",
    creator: "Baseball Rebellion",
    platform: "YT",
    title: "Stop Telling Kids to 'Keep Your Eye on the Ball' — Here's Why",
    views: "UPDATE",
    hook: "Myth Bust",
    topic: "Hitting / Youth Coaching",
    notes: "Challenging a thing every parent/coach says = instant controversy + shares. Chas Pippitt's Rebellion brand is built on this contrarian coaching angle. Comments blow up because coaches take sides.",
    url: "https://www.youtube.com/@BaseballRebellion",
  },
  {
    date: "2/24/26",
    creator: "Prep Baseball Report",
    platform: "YT",
    title: "Is Perfect Game Worth It? (We Asked 50 College Coaches)",
    views: "UPDATE",
    hook: "Exposé / Contrarian",
    topic: "Showcases / Recruiting",
    notes: "Naming a competitor (Perfect Game) in the title drives curiosity. Survey format adds credibility. Parents share because they're spending thousands on showcases and want validation. High comment engagement.",
    url: "https://www.youtube.com/@PrepBaseballReport",
  },
  {
    date: "2/20/26",
    creator: "Extra Innings Baseball",
    platform: "YT",
    title: "How a 2026 Grad Got 12 D1 Offers Without Playing Perfect Game",
    views: "UPDATE",
    hook: "Story / Case Study",
    topic: "Recruiting",
    notes: "Outcome-first title + challenges the dominant showcase belief = enormous CTR. Specific grad year makes it timely. Parents with 2026 kids will click immediately. Evergreen if you swap the year.",
    url: "https://www.youtube.com/@ExtraInningsBaseball",
  },
  {
    date: "2/15/26",
    creator: "Perfect Game USA",
    platform: "IG",
    title: "What coaches actually look at on a recruiting profile (it's not stats)",
    views: "UPDATE",
    hook: "Revelation / Talking Head",
    topic: "Recruiting / Profile",
    notes: "Parenthetical twist drives curiosity. Short talking-head format, coach on camera = authority. High save rate because parents screenshot for later. Easy to repurpose: 'What MBA Academy looks for in a prospect.'",
    url: "https://www.instagram.com/perfectgameusa",
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
