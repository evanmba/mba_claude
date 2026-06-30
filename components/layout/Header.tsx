"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/instagram": "Instagram",
  "/youtube": "YouTube",
  "/competitors": "Competitor Tracker",
  "/settings": "Settings",
  "/notifications": "Notifications",
  "/dialers": "Setter Dashboard",
  "/sales": "Sales Dashboard",
  "/ai-dm-setter": "AI DM Setter",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Page";

  return (
    <header
      className="flex items-center px-8 py-4 border-b"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        height: "73px",
      }}
    >
      <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
        {title}
      </h1>
    </header>
  );
}
