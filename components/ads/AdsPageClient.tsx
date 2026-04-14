"use client";

import { useState } from "react";
import type { AdWindow } from "@/lib/attribution";
import { AdsAIChat } from "./AdsAIChat";
import { LandingPageView } from "./LandingPageView";

const BORDER = "rgba(255,255,255,0.07)";

interface Props {
  window: AdWindow;
  children: React.ReactNode; // the SpendCards (already rendered server-side)
}

type Tab = "overview" | "landing" | "ai";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview"               },
  { key: "landing",  label: "Landing Page Split Test" },
  { key: "ai",       label: "AI Chat"                },
];

export function AdsPageClient({ window, children }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "none",
              background: "transparent", cursor: "pointer",
              color: tab === t.key ? "#3b82f6" : "#475569",
              borderBottom: tab === t.key ? "2px solid #3b82f6" : "2px solid transparent",
              marginBottom: -1, transition: "color 0.15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && children}
      {tab === "landing"  && <LandingPageView />}
      {tab === "ai"       && <AdsAIChat window={window} />}
    </>
  );
}
