"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Overview of @mendoza.baseball.academy" },
  "/funnel": { title: "Funnel Dashboard", description: "" },
  "/financials": { title: "Financials", description: "" },
  "/instagram": { title: "Instagram", description: "@mendoza.baseball.academy · Instagram" },
  "/youtube": { title: "YouTube", description: "Mendoza Baseball Academy · YouTube Channel" },
  "/facebook": { title: "Facebook", description: "Mendoza Baseball Academy · Facebook Page" },
  "/tiktok": { title: "TikTok", description: "@mendoza.baseball.academy · TikTok" },
  "/analytics": { title: "Analytics", description: "Cross-platform performance and engagement" },
  "/calendar": { title: "Content Calendar", description: "Plan and schedule content across all platforms" },
  "/competitors": { title: "Competitor Tracker", description: "Monitor competitor activity and trends" },
  "/news": { title: "News Consolidator", description: "Aggregated news and industry updates" },
  "/notifications": { title: "Notifications", description: "Your latest alerts and updates" },
  "/settings": { title: "Settings", description: "Connect and manage your social media accounts" },
};

export function Header() {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? { title: pathname.replace("/", "").replace(/-/g, " "), description: "" };

  return (
    <header
      className="flex items-center px-6 sm:px-8 py-4 border-b"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        height: "64px",
      }}
    >
      <div>
        <h1 className="text-base sm:text-lg font-semibold capitalize" style={{ color: "var(--foreground)" }}>
          {page.title}
        </h1>
        {page.description && (
          <p className="text-xs sm:text-sm" style={{ color: "var(--muted-foreground)" }}>
            {page.description}
          </p>
        )}
      </div>
    </header>
  );
}
