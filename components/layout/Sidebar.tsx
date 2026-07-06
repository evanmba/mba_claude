"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Bell,
  X,
  Trophy,
} from "lucide-react";

const mainItems = [
  { label: "Dashboard", href: "/",         icon: LayoutDashboard },
  { label: "Athletes",  href: "/athletes", icon: Trophy, color: "#22c55e" },
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
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  accentColor?: string;
  onClick?: () => void;
}) {
  const activeColor = accentColor ?? "var(--primary)";
  const activeBg = accentColor ? accentColor + "1a" : "rgba(59, 130, 246, 0.1)";
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
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

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col border-r z-30 sidebar-drawer"
      data-open={isOpen ? "true" : "false"}
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Link href="/" className="flex-1 min-w-0" onClick={onClose}>
          <Image
            src="/logo.png"
            alt="Mendoza Baseball Academy"
            width={200}
            height={45}
            className="object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
            priority
          />
        </Link>
        {/* Close button — mobile only */}
        <button
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 ml-2"
          onClick={onClose}
          style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}
        >
          <X size={15} />
        </button>
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
              isActive={pathname === item.href}
              accentColor={"color" in item ? item.color : undefined}
              onClick={onClose}
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
              onClick={onClose}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}
