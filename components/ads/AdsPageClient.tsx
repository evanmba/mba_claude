"use client";

import { useState } from "react";
import type { AdWindow } from "@/lib/attribution";
import { AdsAIChat } from "./AdsAIChat";

const BORDER = "rgba(255,255,255,0.07)";

interface Props {
  window: AdWindow;
  children: React.ReactNode; // the SpendCards (already rendered server-side)
}

export function AdsPageClient({ window, children }: Props) {
  const [tab, setTab] = useState<"overview" | "ai">("overview");

  const tabs: { key: "overview" | "ai"; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "ai",       label: "AI Chat"  },
  ];

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        {tabs.map((t) => (
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
      {tab === "ai"       && <AdsAIChat window={window} />}
    </>
  );
}
