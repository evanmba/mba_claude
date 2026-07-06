"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

const pageTitles: Record<string, string> = {
  "/":             "Dashboard",
  "/instagram":    "Instagram",
  "/youtube":      "YouTube",
  "/email":        "Email",
  "/facebook":     "Facebook",
  "/tiktok":       "TikTok",
  "/analytics":    "Analytics",
  "/calendar":     "Content Calendar",
  "/athletes":     "Athletes",
  "/competitors":  "Competitor Tracker",
  "/news":         "News Consolidator",
  "/notifications":"Notifications",
  "/settings":     "Settings",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="sidebar-offset flex flex-col flex-1 min-w-0">
        {/* Mobile top bar — always visible, logo + hamburger */}
        <div
          className="md:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
          style={{
            background: "var(--sidebar-bg)",
            borderColor: "var(--sidebar-border)",
          }}
        >
          <Image
            src="/logo.png"
            alt="Mendoza Baseball Academy"
            width={140}
            height={32}
            className="object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
            priority
          />
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            onClick={() => setSidebarOpen(true)}
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            <Menu size={18} />
          </button>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {title && (
            <h1
              className="text-xl font-semibold mb-6"
              style={{ color: "var(--foreground)" }}
            >
              {title}
            </h1>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
