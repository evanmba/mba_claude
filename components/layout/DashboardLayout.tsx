"use client";

import { useState } from "react";
import Image from "next/image";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Menu, X } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          style={{ background: "rgba(0,0,0,0.6)" }}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className="fixed top-0 left-0 h-screen z-50 md:hidden transition-transform duration-300"
        style={{
          width: "var(--sidebar-width)",
          transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div
        className="flex flex-col flex-1 min-w-0 md:ml-[var(--sidebar-width)]"
      >
        {/* Mobile top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b md:hidden"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            <Menu size={18} />
          </button>
          <Image
            src="/logo.png"
            alt="Mendoza Baseball Academy"
            width={120}
            height={36}
            className="object-contain"
            style={{ maxHeight: 36 }}
            priority
          />
          {mobileSidebarOpen && (
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="ml-auto w-8 h-8 rounded flex items-center justify-center"
              style={{ color: "var(--muted-foreground)" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Desktop header */}
        <div className="hidden md:block">
          <Header />
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
