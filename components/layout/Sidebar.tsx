"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Settings, Bell, Phone, CalendarDays, TrendingUp, Bot } from "lucide-react";

const mainItems = [
  { label: "Setter Dashboard", href: "/dialers",       icon: Phone,        color: "#3b82f6" },
  { label: "Sales Dashboard",  href: "/sales",         icon: TrendingUp,   color: "#10b981" },
  { label: "Coverage",         href: "/coverage",      icon: CalendarDays, color: "#22c55e" },
  { label: "AI DM Setter",     href: "/ai-dm-setter",  icon: Bot,          color: "#a855f7" },
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
      {/* Brand / Logo */}
      <div
        className="flex items-center justify-center px-6 py-5 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Image
          src="/logo.png"
          alt="Mendoza Baseball Academy"
          width={160}
          height={48}
          className="object-contain"
          style={{ maxHeight: 48 }}
          priority
        />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {mainItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href || pathname.startsWith(item.href)}
              accentColor={"color" in item ? item.color : undefined}
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
