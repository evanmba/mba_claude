"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send } from "lucide-react";
import type { AdWindow } from "@/lib/attribution";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const BG     = "#0b1628";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED  = "#475569";

const SUGGESTIONS = [
  "Which creative has the best cost per lead?",
  "Compare book-to-take rates across creatives",
  "Which ad is most efficient overall?",
  "What's the cost per deal for each creative?",
];

export function AdsAIChat({ window: windowProp }: { window?: AdWindow }) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [window, setWindow]       = useState<AdWindow>(windowProp ?? "7d");
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    // Placeholder assistant message to stream into
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ads/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, window }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((m) => [
          ...m.slice(0, -1),
          { role: "assistant", content: `Error: ${err.error ?? "request failed"}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshot = accumulated;
        setMessages((m) => [
          ...m.slice(0, -1),
          { role: "assistant", content: snapshot },
        ]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "calc(100vh - 180px)",
      minHeight: 400, background: BG, borderRadius: 16, border: `1px solid ${BORDER}`,
      overflow: "hidden",
    }}>
      {/* Period selector (shown when used standalone, i.e. no windowProp) */}
      {!windowProp && (
        <div style={{ display: "flex", gap: 0, padding: "10px 16px 0", borderBottom: `1px solid ${BORDER}` }}>
          {(["7d", "14d", "month"] as AdWindow[]).map((w) => (
            <button key={w} onClick={() => setWindow(w)}
              style={{
                padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none",
                background: "transparent", cursor: "pointer",
                color: window === w ? "#3b82f6" : MUTED,
                borderBottom: window === w ? "2px solid #3b82f6" : "2px solid transparent",
                marginBottom: -1,
              }}>
              {w === "7d" ? "7 Days" : w === "14d" ? "14 Days" : "30 Days"}
            </button>
          ))}
        </div>
      )}
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", paddingBottom: 16 }}>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>
              Ask anything about your ad creative data.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, margin: "0 auto" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    textAlign: "left", padding: "10px 14px", borderRadius: 8, fontSize: 13,
                    background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
                    color: "#94a3b8", cursor: "pointer",
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
            <div style={{
              maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
              background: m.role === "user"
                ? "rgba(59,130,246,0.2)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.3)" : BORDER}`,
              color: m.role === "user" ? "#bfdbfe" : "#e2e8f0",
            }}>
              {m.content}
              {streaming && i === messages.length - 1 && m.role === "assistant" && (
                <span style={{ display: "inline-block", width: 8, height: 14, marginLeft: 2, verticalAlign: "middle", background: "#3b82f6", borderRadius: 2, animation: "blink 1s step-end infinite" }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 16px", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, width: "100%", alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about leads, cost per deal, conversion rates…"
            rows={1}
            disabled={streaming}
            style={{
              flex: 1, resize: "none", overflow: "hidden", borderRadius: 8, padding: "10px 12px",
              fontSize: 14, lineHeight: 1.5, background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BORDER}`, color: "#e2e8f0", outline: "none",
              fontFamily: "inherit", minHeight: 40,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            style={{
              width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              background: input.trim() && !streaming ? "#3b82f6" : "rgba(59,130,246,0.2)",
              border: "none", cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
              color: input.trim() && !streaming ? "#fff" : "#475569",
              transition: "background 0.15s",
            }}>
            <Send size={15} />
          </button>
        </form>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
