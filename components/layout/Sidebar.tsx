"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Instagram,
  Youtube,
  Mail,
  Users,
  LayoutDashboard,
  Settings,
  Bell,
} from "lucide-react";

const socialItems = [
  { label: "Dashboard",  href: "/",          icon: LayoutDashboard },
  { label: "Instagram",  href: "/instagram", icon: Instagram, color: "#d946ef" },
  { label: "YouTube",    href: "/youtube",   icon: Youtube,   color: "#ef4444" },
  { label: "Email",      href: "/email",     icon: Mail,      color: "#22c55e" },
];

const toolsItems = [
  { label: "Competitor Tracker", href: "/competitors", icon: Users },
];

const bottomNavItems = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  accentColor,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  accentColor?: string;
}) {
  const activeColor = accentColor ?? "var(--primary)";
  const activeBg = accentColor ? accentColor + "1a" : "rgba(59, 130, 246, 0.1)";
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
        style={{
          color: isActive ? activeColor : "var(--muted-foreground)",
          background: isActive ? activeBg : "transparent",
          borderLeft: isActive ? `2px solid ${activeColor}` : "2px solid transparent",
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
        <Icon size={18} style={isActive && accentColor ? { color: accentColor } : undefined} />
        {label}
      </Link>
    </li>
  );
}

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
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-6 py-5 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: "var(--primary)" }}
        >
          M
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
            Mendoza Baseball
          </p>
          <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
            @mendoza.baseball.academy
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p
          className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Social Platforms
        </p>
        <ul className="space-y-1 mb-5">
          {socialItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
              accentColor={"color" in item ? item.color : undefined}
            />
          ))}
        </ul>

        <p
          className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Tools
        </p>
        <ul className="space-y-1">
          {toolsItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
            />
          ))}
        </ul>
      </nav>

      {/* Bottom */}
      <div
        className="px-3 py-4 border-t"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}
