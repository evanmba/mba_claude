"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Clock, Users, RotateCcw, GripVertical, Ban, Cloud, CloudOff, Check } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTERS = [
  { id: "gabriana-brown",       name: "Gabriana Brown",       short: "Gabriana", color: "#d946ef" },
  { id: "daneile-brown",        name: "Daneile Brown",        short: "Daneile",  color: "#3b82f6" },
  { id: "julio-capellan",       name: "Julio Capellan",       short: "Julio",    color: "#f59e0b" },
  { id: "allieandra-alexander", name: "Allieandra Alexander", short: "Allie",    color: "#22c55e" },
  { id: "teagan-brown",         name: "Teagan Brown",         short: "Teagan",   color: "#ef4444" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const START_HOUR  = 8;
const END_HOUR    = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 12

const SUN_IDX    = 6;
const STORAGE_KEY = "mba-coverage-v2";

// ─── Types ────────────────────────────────────────────────────────────────────

type Block = {
  id: string;
  setterId: string;
  day: number;
  startHour: number;
  duration: number;
};

type DragPayload =
  | { type: "new";  setterId: string }
  | { type: "move"; blockId: string };

type ResizeState = {
  blockId: string;
  startY: number;
  startDuration: number;
  maxDur: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

function fmtHour(h: number) {
  if (h === 0)  return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function overlapLayout(block: Block, all: Block[]) {
  const peers = all.filter(
    b => b.id !== block.id &&
      b.startHour < block.startHour + block.duration &&
      block.startHour < b.startHour + b.duration
  );
  const total = peers.length + 1;
  const group = [...peers, block].sort((a, b) => a.id < b.id ? -1 : 1);
  const idx   = group.findIndex(b => b.id === block.id);
  return { left: (idx / total) * 100, width: (1 / total) * 100 };
}

/**
 * Returns true if the given day/hour slot is a no-calls zone:
 *   - All of Sunday (any hour)
 *   - 8am–9am on Mon–Sat  (hour === START_HOUR)
 *   - 7pm–8pm on Mon–Sat  (hour === END_HOUR - 1)
 */
function isBlocked(day: number, hour: number): boolean {
  if (day === SUN_IDX) return true;
  return hour === START_HOUR || hour === END_HOUR - 1;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoverageCalendar() {
  type SaveStatus = "idle" | "saving" | "saved" | "error";

  const [blocks,     setBlocks]     = useState<Block[]>([]);
  const [hover,      setHover]      = useState<{ day: number; hour: number } | null>(null);
  const [dragging,   setDragging]   = useState<string | null>(null);
  const [resizing,   setResizing]   = useState<ResizeState | null>(null);
  const [hydrated,   setHydrated]   = useState(false);
  const [mobileDay,  setMobileDay]  = useState(0);
  const [isMobile,   setIsMobile]   = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dynamic row height ─────────────────────────────────────────────────────
  // Measures the calendar body container and fills it exactly, with a half-row
  // of padding above 9am and below 6pm so nothing gets clipped.

  const bodyRef  = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState(52);

  // TOTAL_HOURS + 1 slots: the extra slot provides the top+bottom half-row padding
  const pad       = Math.round(rowH * 0.5);
  const calHeight = pad * 2 + TOTAL_HOURS * rowH;

  useEffect(() => {
    if (!bodyRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) setRowH(Math.max(28, Math.floor(h / (TOTAL_HOURS + 1))));
    });
    ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, []);

  // Detect mobile breakpoint from outer container width
  useEffect(() => {
    if (!outerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setIsMobile(entry.contentRect.width < 640);
    });
    ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Touch swipe for mobile day navigation ──────────────────────────────────
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    setMobileDay(d => delta < 0
      ? Math.min(d + 1, DAYS.length - 1)
      : Math.max(d - 1, 0)
    );
  }, []);

  // ── Load (API first, localStorage fallback) ───────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/coverage");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setBlocks(data);
            setHydrated(true);
            return;
          }
        }
      } catch {}
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setBlocks(JSON.parse(raw));
      } catch {}
      setHydrated(true);
    }
    load();
  }, []);

  // ── Autosave (debounced 1s → API + localStorage) ───────────────────────────

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks)); } catch {}
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/coverage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(blocks),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2500);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, 1000);
  }, [blocks, hydrated]);

  // ── Vertical resize (mouse events on document) ─────────────────────────────

  useEffect(() => {
    if (!resizing) return;

    document.body.style.cursor    = "ns-resize";
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent) => {
      const delta    = e.clientY - resizing.startY;
      const deltaDur = Math.round(delta / rowH);
      const newDur   = Math.max(1, Math.min(resizing.startDuration + deltaDur, resizing.maxDur));
      setBlocks(prev => prev.map(b =>
        b.id === resizing.blockId ? { ...b, duration: newDur } : b
      ));
    };

    const onUp = () => setResizing(null);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.body.style.cursor    = "";
      document.body.style.userSelect = "";
    };
  }, [resizing, rowH]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const isResizingRef = useRef(false);
  useEffect(() => { isResizingRef.current = !!resizing; }, [resizing]);

  const onPaletteDragStart = useCallback((e: React.DragEvent, setterId: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "new", setterId } as DragPayload));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onBlockDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    if (isResizingRef.current) { e.preventDefault(); return; }
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "move", blockId } as DragPayload));
    e.dataTransfer.effectAllowed = "move";
    setDragging(blockId);
  }, []);

  const onColDragOver = useCallback((e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const y    = e.clientY - e.currentTarget.getBoundingClientRect().top - pad;
    const hour = Math.max(START_HOUR, Math.min(START_HOUR + Math.floor(y / rowH), END_HOUR - 1));
    setHover({ day, hour });
  }, [pad, rowH]);

  const onColDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(null);
  }, []);

  const onDragEnd = useCallback(() => {
    setDragging(null);
    setHover(null);
  }, []);

  const onColDrop = useCallback((e: React.DragEvent, day: number) => {
    e.preventDefault();
    setHover(null);
    setDragging(null);
    const y         = e.clientY - e.currentTarget.getBoundingClientRect().top - pad;
    const startHour = Math.max(START_HOUR, Math.min(START_HOUR + Math.floor(y / rowH), END_HOUR - 1));
    if (isBlocked(day, startHour)) return;
    try {
      const payload: DragPayload = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (payload.type === "new") {
        setBlocks(prev => {
          const dur = Math.min(3, END_HOUR - startHour);
          return [...prev, { id: uid(), setterId: payload.setterId, day, startHour, duration: dur }];
        });
      } else {
        setBlocks(prev => {
          const block = prev.find(b => b.id === payload.blockId);
          if (!block) return prev;
          const dur = Math.min(block.duration, END_HOUR - startHour);
          return prev.map(b =>
            b.id === payload.blockId ? { ...b, day, startHour, duration: dur } : b
          );
        });
      }
    } catch {}
  }, [pad, rowH]);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div ref={outerRef} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 145px)", minHeight: 380, gap: 12 }}>

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            <Clock size={12} />
            Eastern Time (ET) · 8am – 8pm
          </div>
          <span className="text-xs hidden sm:block" style={{ color: "var(--muted-foreground)" }}>
            Drag setters onto grid · Drag blocks to move · Pull bottom edge to resize
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Save status */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <Cloud size={12} className="animate-pulse" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
              <Check size={12} /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#ef4444" }}>
              <CloudOff size={12} /> Save failed
            </span>
          )}
          <button
            onClick={() => setBlocks([])}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "var(--secondary)"; }}
          >
            <RotateCcw size={12} /> Clear all
          </button>
        </div>
      </div>

      {/* Setter Palette */}
      <div className="rounded-xl border p-3" style={{ background: "var(--card)", borderColor: "var(--border)", flexShrink: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} style={{ color: "var(--muted-foreground)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Setters — drag onto calendar to schedule
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SETTERS.map(s => (
            <div
              key={s.id}
              draggable
              onDragStart={e => onPaletteDragStart(e, s.id)}
              onDragEnd={onDragEnd}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none"
              style={{ background: s.color + "20", border: `1px solid ${s.color}50`, color: s.color }}
            >
              <GripVertical size={13} className="opacity-50" />
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar — fills all remaining height */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >

        {/* Day headers */}
        {isMobile ? (
          <>
            {/* Day nav row */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: "1px solid var(--border)", background: "rgba(10,15,30,0.6)", flexShrink: 0 }}
            >
              <button
                onClick={() => setMobileDay(d => Math.max(d - 1, 0))}
                disabled={mobileDay === 0}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
                style={{ color: mobileDay === 0 ? "var(--muted-foreground)" : "var(--foreground)", background: "var(--secondary)", opacity: mobileDay === 0 ? 0.4 : 1 }}
              >
                ‹
              </button>
              <div
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: mobileDay >= 5 ? "#f59e0b" : "var(--foreground)" }}
              >
                {DAYS[mobileDay]}
              </div>
              <button
                onClick={() => setMobileDay(d => Math.min(d + 1, DAYS.length - 1))}
                disabled={mobileDay === DAYS.length - 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
                style={{ color: mobileDay === DAYS.length - 1 ? "var(--muted-foreground)" : "var(--foreground)", background: "var(--secondary)", opacity: mobileDay === DAYS.length - 1 ? 0.4 : 1 }}
              >
                ›
              </button>
            </div>

            {/* At-a-glance coverage strip — shows each setter's hours for the day */}
            {(() => {
              const dayBlocks = blocks.filter(b => b.day === mobileDay);
              if (!dayBlocks.length) return (
                <div className="px-4 py-2 text-xs" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                  No shifts scheduled
                </div>
              );
              return (
                <div
                  className="px-3 py-2"
                  style={{ borderBottom: "1px solid var(--border)", background: "rgba(10,15,30,0.35)", flexShrink: 0 }}
                >
                  {/* Mini horizontal timeline */}
                  <div className="relative" style={{ height: 6, marginBottom: 6, borderRadius: 3, background: "var(--secondary)" }}>
                    {dayBlocks.map(block => {
                      const setter = SETTERS.find(s => s.id === block.setterId);
                      if (!setter) return null;
                      const leftPct = ((block.startHour - START_HOUR) / TOTAL_HOURS) * 100;
                      const widthPct = (block.duration / TOTAL_HOURS) * 100;
                      return (
                        <div key={block.id} style={{
                          position: "absolute",
                          left: `${leftPct}%`, width: `${widthPct}%`,
                          top: 0, height: "100%",
                          background: setter.color,
                          borderRadius: 3,
                          opacity: 0.85,
                        }} />
                      );
                    })}
                    {/* Hour tick marks */}
                    {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                      <div key={i} style={{
                        position: "absolute",
                        left: `${(i / TOTAL_HOURS) * 100}%`,
                        top: "100%", marginTop: 2,
                        fontSize: 8,
                        color: "var(--muted-foreground)",
                        transform: "translateX(-50%)",
                        whiteSpace: "nowrap",
                      }}>
                        {i % 2 === 0 ? fmtHour(START_HOUR + i) : ""}
                      </div>
                    ))}
                  </div>
                  {/* Setter chips */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {SETTERS.map(setter => {
                      const sb = dayBlocks.filter(b => b.setterId === setter.id);
                      if (!sb.length) return null;
                      const totalH = sb.reduce((s, b) => s + b.duration, 0);
                      const earliest = Math.min(...sb.map(b => b.startHour));
                      const latest   = Math.max(...sb.map(b => b.startHour + b.duration));
                      return (
                        <div key={setter.id}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: setter.color + "20", border: `1px solid ${setter.color}40`, color: setter.color }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: setter.color }} />
                          {setter.short} · {fmtHour(earliest)}–{fmtHour(latest)} ({totalH}h)
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <div
            className="grid"
            style={{ gridTemplateColumns: "52px repeat(7, 1fr)", borderBottom: "1px solid var(--border)", background: "rgba(10,15,30,0.6)", flexShrink: 0 }}
          >
            <div
              className="flex items-end justify-center pb-2 pt-2 text-xs font-bold"
              style={{ borderRight: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            >
              ET
            </div>
            {DAYS.map((d, i) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-bold uppercase tracking-widest"
                style={{
                  borderRight: i < 6 ? "1px solid var(--border)" : undefined,
                  color: i >= 5 ? "#f59e0b" : "var(--foreground)",
                  background: i >= 5 ? "rgba(245,158,11,0.04)" : undefined,
                }}
              >
                {d}
              </div>
            ))}
          </div>
        )}

        {/* Body — measured by ResizeObserver to compute rowH */}
        <div
          ref={bodyRef}
          style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >

          {/* Time axis */}
          <div style={{ width: 52, flexShrink: 0, borderRight: "1px solid var(--border)", background: "rgba(10,15,30,0.4)", position: "relative", height: calHeight }}>
            {hourLabels.map((h, i) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: pad + i * rowH - 8,
                  width: "100%",
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  color: h === 12 ? "#3b82f6" : "var(--muted-foreground)",
                  pointerEvents: "none",
                }}
              >
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns — single day on mobile, all days on desktop */}
          <div style={{ flex: 1, display: "flex", overflowX: isMobile ? "hidden" : "auto", overflowY: "hidden" }}>
            {DAYS.map((day, dayIdx) => {
              if (isMobile && dayIdx !== mobileDay) return null;
              const dayBlocks    = blocks.filter(b => b.day === dayIdx);
              const isWeekend    = dayIdx >= 5;
              const hoveringHere = hover?.day === dayIdx;

              return (
                <div
                  key={day}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? 0 : 76,
                    borderRight: dayIdx < 6 ? "1px solid var(--border)" : undefined,
                    background:  isWeekend ? "rgba(245,158,11,0.025)" : undefined,
                    position: "relative",
                    height: calHeight,
                  }}
                  onDragOver={e => onColDragOver(e, dayIdx)}
                  onDragLeave={onColDragLeave}
                  onDrop={e => onColDrop(e, dayIdx)}
                >

                  {/* Hour grid lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} style={{ position: "absolute", top: pad + i * rowH, left: 0, right: 0, height: rowH, borderBottom: "1px solid var(--border)", opacity: 0.5, pointerEvents: "none" }} />
                  ))}

                  {/* Half-hour dashes */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={`h${i}`} style={{ position: "absolute", top: pad + i * rowH + rowH / 2, left: 0, right: 0, borderBottom: "1px dashed rgba(255,255,255,0.055)", pointerEvents: "none" }} />
                  ))}

                  {/* Drop hover band */}
                  {hoveringHere && hover && !isBlocked(dayIdx, hover.hour) && (
                    <div style={{ position: "absolute", top: pad + (hover.hour - START_HOUR) * rowH, left: 0, right: 0, height: rowH, background: "rgba(59,130,246,0.18)", borderTop: "2px solid #3b82f6", pointerEvents: "none", zIndex: 2 }} />
                  )}

                  {/* ── Blocked zones ── */}

                  {/* Sunday — entire column no-calls */}
                  {dayIdx === SUN_IDX && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      background: "repeating-linear-gradient(135deg, rgba(239,68,68,0.08) 0px, rgba(239,68,68,0.08) 8px, rgba(239,68,68,0.03) 8px, rgba(239,68,68,0.03) 16px)",
                      zIndex: 3, pointerEvents: "none",
                    }}>
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <Ban size={22} style={{ color: "rgba(239,68,68,0.6)", strokeWidth: 2.5 }} />
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(239,68,68,0.75)", textTransform: "uppercase", whiteSpace: "nowrap" }}>No Calls</span>
                        <span style={{ fontSize: 9, color: "rgba(239,68,68,0.55)", whiteSpace: "nowrap" }}>All Day</span>
                      </div>
                    </div>
                  )}

                  {/* Mon–Sat: 8am–9am blocked */}
                  {dayIdx !== SUN_IDX && (
                    <div style={{
                      position: "absolute",
                      top: pad,
                      left: 0, right: 0,
                      height: rowH,
                      background: "rgba(239,68,68,0.10)",
                      borderBottom: "1px solid rgba(239,68,68,0.25)",
                      zIndex: 3, pointerEvents: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(239,68,68,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>No Calls</span>
                    </div>
                  )}

                  {/* Mon–Sat: 7pm–8pm blocked */}
                  {dayIdx !== SUN_IDX && (
                    <div style={{
                      position: "absolute",
                      top: pad + (END_HOUR - 1 - START_HOUR) * rowH,
                      left: 0, right: 0,
                      height: rowH,
                      background: "rgba(239,68,68,0.10)",
                      borderTop: "1px solid rgba(239,68,68,0.25)",
                      zIndex: 3, pointerEvents: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(239,68,68,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>No Calls</span>
                    </div>
                  )}

                  {/* Shift blocks */}
                  {dayBlocks.map(block => {
                    const setter = SETTERS.find(s => s.id === block.setterId);
                    if (!setter) return null;

                    const { left, width } = overlapLayout(block, dayBlocks);
                    const top      = pad + (block.startHour - START_HOUR) * rowH;
                    const height   = block.duration * rowH - 3;
                    const endHour  = block.startHour + block.duration;
                    const isActive  = resizing?.blockId === block.id;
                    const isDragging = dragging === block.id;

                    return (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={e => onBlockDragStart(e, block.id)}
                        onDragEnd={onDragEnd}
                        style={{
                          position: "absolute",
                          top,
                          left:   `calc(${left}% + 2px)`,
                          width:  `calc(${width}% - 4px)`,
                          height,
                          background: setter.color + "22",
                          border:     `1px solid ${setter.color}55`,
                          borderLeft: `3px solid ${setter.color}`,
                          borderRadius: 6,
                          zIndex: isActive ? 10 : isDragging ? 0 : 4,
                          opacity: isDragging ? 0.3 : 1,
                          cursor: "grab",
                          display: "flex",
                          flexDirection: "column",
                          transition: isDragging ? "opacity 0.15s" : undefined,
                          boxShadow: isActive
                            ? `0 0 0 2px ${setter.color}80, 0 4px 16px ${setter.color}30`
                            : `0 1px 6px ${setter.color}15`,
                        }}
                      >
                        {/* Header: name + time + close */}
                        <div style={{ padding: "4px 4px 2px 6px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexShrink: 0 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: setter.color, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {setter.short}
                            </div>
                            {height >= 44 && (
                              <div style={{ fontSize: 9, color: setter.color, opacity: 0.75, whiteSpace: "nowrap" }}>
                                {fmtHour(block.startHour)}–{fmtHour(endHour)}
                              </div>
                            )}
                          </div>
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                            style={{ color: setter.color, opacity: 0.65, flexShrink: 0, lineHeight: 1, padding: 2 }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = "0.65"; }}
                          >
                            <X size={10} />
                          </button>
                        </div>

                        {/* Spacer */}
                        <div style={{ flex: 1 }} />

                        {/* End-time tooltip — shown while resizing */}
                        {isActive && (
                          <div style={{
                            position: "absolute",
                            bottom: 18,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: setter.color,
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            zIndex: 20,
                            boxShadow: `0 2px 6px rgba(0,0,0,0.35)`,
                          }}>
                            ends {fmtHour(endHour)}
                          </div>
                        )}

                        {/* Resize handle */}
                        <div
                          draggable={false}
                          onMouseDown={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizing({
                              blockId: block.id,
                              startY: e.clientY,
                              startDuration: block.duration,
                              maxDur: END_HOUR - block.startHour,
                            });
                          }}
                          title="Drag to resize shift"
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 14,
                            cursor: "ns-resize",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderBottomLeftRadius: 5,
                            borderBottomRightRadius: 5,
                            background: `linear-gradient(to top, ${setter.color}40, transparent)`,
                          }}
                        >
                          <div style={{ display: "flex", gap: 3 }}>
                            {[0, 1, 2].map(i => (
                              <div
                                key={i}
                                style={{ width: 4, height: 4, borderRadius: "50%", background: setter.color, opacity: isActive ? 1 : 0.55 }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Coverage Summary */}
      {blocks.length > 0 && (
        <div className="rounded-xl border p-3" style={{ background: "var(--card)", borderColor: "var(--border)", flexShrink: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
            Coverage Summary
          </p>
          <div className="flex gap-5 flex-wrap">
            {SETTERS.map(setter => {
              const sb = blocks.filter(b => b.setterId === setter.id);
              if (!sb.length) return null;
              const totalH = sb.reduce((s, b) => s + b.duration, 0);
              return (
                <div key={setter.id} className="flex items-center gap-2 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: setter.color }} />
                  <span style={{ color: "var(--foreground)" }}>{setter.short}</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: setter.color + "20", color: setter.color }}>
                    {sb.length} shift{sb.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{totalH}h / wk</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
