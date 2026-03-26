"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Overview of @mendoza.baseball.academy" },
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

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? { title: "Page", description: "" };

  return (
    <header
      className="flex items-center justify-between px-4 md:px-8 py-4 border-b"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        minHeight: "73px",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-colors"
          onClick={onMenuClick}
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
        >
          <Menu size={17} />
        </button>

        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold truncate" style={{ color: "var(--foreground)" }}>
            {page.title}
          </h1>
          <p className="text-xs md:text-sm truncate hidden sm:block" style={{ color: "var(--muted-foreground)" }}>
            {page.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Search — hidden on small screens */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--secondary)",
            color: "var(--muted-foreground)",
            minWidth: "200px",
          }}
        >
          <Search size={15} />
          <span>Search...</span>
          <span
            className="ml-auto text-xs px-1.5 py-0.5 rounded border"
            style={{ borderColor: "var(--border)", fontSize: "10px" }}
          >
            ⌘K
          </span>
        </div>

        {/* Search icon — small screens only */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
        >
          <Search size={17} />
        </button>

        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
        >
          <Bell size={17} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--primary)" }}
          />
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
          style={{ background: "var(--primary)" }}
        >
          M
        </div>
      </div>
    </header>
  );
}
