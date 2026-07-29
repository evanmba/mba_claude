"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, DollarSign } from "lucide-react";

const navItems = [
  { label: "Funnel Dashboard", href: "/funnel",     icon: TrendingUp, color: "#22c55e" },
  { label: "Financials",       href: "/financials", icon: DollarSign, color: "#3b82f6" },
];

const bottomNavItems: { label: string; href: string; icon: React.ElementType; color: string }[] = [];

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
      className="hidden sm:flex fixed left-0 top-0 h-screen flex-col border-r"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center px-5 py-4 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Mendoza Baseball Academy"
          style={{ height: 36, width: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href || pathname.startsWith(item.href)}
              accentColor={item.color}
            />
          ))}
        </ul>
      </nav>

      {bottomNavItems.length > 0 && (
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
                accentColor={item.color}
              />
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
