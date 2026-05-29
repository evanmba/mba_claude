"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdsAIChat } from "@/components/ads/AdsAIChat";
import { CodeAgentChat } from "@/components/CodeAgentChat";

type Mode = "data" | "code";

export default function AIPage() {
  const [mode, setMode] = useState<Mode>("code");

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
        <div className="mb-4 flex-shrink-0">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                AI Assistant
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
                {mode === "code"
                  ? "Modify the dashboard — read, explain, or edit any file"
                  : "Funnel, ad attribution, landing page split test, and sales"}
              </p>
            </div>

            {/* Mode toggle */}
            <div style={{
              display: "inline-flex", borderRadius: 8, overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
            }}>
              {(["code", "data"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "6px 16px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
                    background: mode === m ? "#3b82f6" : "transparent",
                    color: mode === m ? "#fff" : "#94a3b8",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {m === "code" ? "Code Agent" : "Data Assistant"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {mode === "code" ? <CodeAgentChat /> : <AdsAIChat />}
        </div>
      </div>
    </DashboardLayout>
  );
}
