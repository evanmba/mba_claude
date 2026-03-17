"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Instagram,
  BarChart3,
  CalendarDays,
  Users,
  Newspaper,
  LayoutDashboard,
  Settings,
  Bell,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Instagram Manager",
    href: "/instagram",
    icon: Instagram,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Content Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Competitor Tracker",
    href: "/competitors",
    icon: Users,
  },
  {
    label: "News Consolidator",
    href: "/news",
    icon: Newspaper,
  },
];

const bottomNavItems = [
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col border-r"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      {/* Logo / Brand */}
      <div
        className="flex items-center gap-3 px-6 py-5 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{ background: "var(--primary)" }}
        >
          C
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            CMS Dashboard
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Content Management
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p
          className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Main Menu
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                    background: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--accent)";
                      e.currentTarget.style.color = "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div
        className="px-3 py-4 border-t"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                    background: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--accent)";
                      e.currentTarget.style.color = "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
