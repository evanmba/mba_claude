"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, FileCode, Loader2 } from "lucide-react";
import type Anthropic from "@anthropic-ai/sdk";

type MessageParam = Anthropic.Messages.MessageParam;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  filesChanged?: string[];
}

const BG     = "#0b1628";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED  = "#475569";

const SUGGESTIONS = [
  "What does the ad attribution table show?",
  "Add a column for Show Rate (takenCalls/bookedCalls)",
  "Remove the Rev ROAS column from the table",
  "Change the 7 day default window to 14 days",
];

export function CodeAgentChat() {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [history, setHistory]     = useState<MessageParam[]>([]);
  const [input, setInput]         = useState("");
  const [working, setWorking]     = useState(false);
  const [statusLine, setStatusLine] = useState("");
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, working]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  async function send(text: string) {
    if (!text.trim() || working) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setWorking(true);
    setStatusLine("");

    let assistantText = "";
    let assistantFilesChanged: string[] = [];

    try {
      const res = await fetch("/api/ai/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${err.error ?? "request failed"}` },
        ]);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(trimmed);
          } catch {
            continue;
          }

          if (event.type === "status") {
            setStatusLine(event.text as string);
          } else if (event.type === "delta") {
            assistantText += event.text as string;
            const snapshot = assistantText;
            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.role === "assistant") {
                return [...m.slice(0, -1), { ...last, content: snapshot }];
              }
              return [...m, { role: "assistant", content: snapshot }];
            });
          } else if (event.type === "done") {
            assistantFilesChanged = (event.filesChanged as string[]) ?? [];
            // Finalize assistant message with filesChanged
            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.role === "assistant") {
                return [
                  ...m.slice(0, -1),
                  { ...last, content: assistantText, filesChanged: assistantFilesChanged },
                ];
              }
              return [
                ...m,
                { role: "assistant", content: assistantText, filesChanged: assistantFilesChanged },
              ];
            });

            // Update multi-turn history
            setHistory((h) => [
              ...h,
              { role: "user", content: text.trim() },
              { role: "assistant", content: assistantText },
            ]);
          }
        }
      }

      // Handle any remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim()) as Record<string, unknown>;
          if (event.type === "done") {
            assistantFilesChanged = (event.filesChanged as string[]) ?? [];
            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.role === "assistant") {
                return [
                  ...m.slice(0, -1),
                  { ...last, content: assistantText, filesChanged: assistantFilesChanged },
                ];
              }
              return [...m];
            });
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setWorking(false);
      setStatusLine("");
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
      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {messages.length === 0 && !working && (
          <div style={{ margin: "auto", textAlign: "center", paddingBottom: 16 }}>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>
              Ask me to read, explain, or modify any file in this Next.js project.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420, margin: "0 auto" }}>
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
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
              background: m.role === "user"
                ? "rgba(59,130,246,0.2)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.3)" : BORDER}`,
              color: m.role === "user" ? "#bfdbfe" : "#e2e8f0",
            }}>
              {m.content || (m.role === "assistant" && working && i === messages.length - 1 ? "" : m.content)}
              {working && i === messages.length - 1 && m.role === "assistant" && (
                <span style={{
                  display: "inline-block", width: 8, height: 14, marginLeft: 2,
                  verticalAlign: "middle", background: "#3b82f6", borderRadius: 2,
                  animation: "blink 1s step-end infinite",
                }} />
              )}
            </div>

            {/* Files changed chips */}
            {m.filesChanged && m.filesChanged.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, maxWidth: "82%" }}>
                {m.filesChanged.map((f) => (
                  <span key={f} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 6, fontSize: 11,
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
                    color: "#93c5fd",
                  }}>
                    <FileCode size={11} />
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Working indicator */}
        {working && (messages.length === 0 || messages[messages.length - 1]?.role !== "assistant") && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
            }}>
              <Loader2 size={14} style={{ color: "#3b82f6", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 14, color: "#e2e8f0" }}>Working…</span>
            </div>
            {statusLine && (
              <span style={{ fontSize: 11, color: MUTED, paddingLeft: 4 }}>{statusLine}</span>
            )}
          </div>
        )}

        {/* Status line below last assistant message while still working */}
        {working && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && statusLine && (
          <div style={{ paddingLeft: 4 }}>
            <span style={{ fontSize: 11, color: MUTED }}>{statusLine}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "12px 16px" }}>
        <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='e.g. "Remove the Rev ROAS column from the table"'
            rows={1}
            disabled={working}
            style={{
              flex: 1, resize: "none", overflow: "hidden", borderRadius: 8,
              padding: "10px 12px", fontSize: 14, lineHeight: 1.5,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
              color: "#e2e8f0", outline: "none", fontFamily: "inherit", minHeight: 40,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || working}
            style={{
              width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              background: input.trim() && !working ? "#3b82f6" : "rgba(59,130,246,0.2)",
              border: "none", cursor: input.trim() && !working ? "pointer" : "not-allowed",
              color: input.trim() && !working ? "#fff" : "#475569",
              transition: "background 0.15s",
            }}>
            <Send size={15} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
