"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Overview of your content operations" },
  "/instagram": { title: "Instagram Manager", description: "Manage your Instagram content and posts" },
  "/analytics": { title: "Analytics", description: "Track performance and engagement metrics" },
  "/calendar": { title: "Content Calendar", description: "Plan and schedule your content" },
  "/competitors": { title: "Competitor Tracker", description: "Monitor competitor activity and trends" },
  "/news": { title: "News Consolidator", description: "Aggregated news and industry updates" },
  "/notifications": { title: "Notifications", description: "Your latest alerts and updates" },
  "/settings": { title: "Settings", description: "Configure your dashboard preferences" },
};

export function Header() {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? { title: "Page", description: "" };

  return (
    <header
      className="flex items-center justify-between px-8 py-4 border-b"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        height: "73px",
      }}
    >
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
          {page.title}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {page.description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
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
          U
        </div>
      </div>
    </header>
  );
}
