"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, DollarSign, Bot } from "lucide-react";

const navItems = [
  { label: "Funnel",  href: "/funnel",     icon: TrendingUp, color: "#22c55e" },
  { label: "Finance", href: "/financials", icon: DollarSign, color: "#3b82f6" },
  { label: "AI",      href: "/ai",         icon: Bot,        color: "#a78bfa" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 sm:hidden z-50 flex border-t"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-1 py-3"
            style={{ color: isActive ? item.color : "var(--muted-foreground)" }}
          >
            <item.icon size={20} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em" }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
