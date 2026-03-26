"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Clock, Users, RotateCcw, GripVertical, Ban } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTERS = [
  { id: "gabriana-brown",       name: "Gabriana Brown",       short: "Gabriana", color: "#d946ef" },
  { id: "daneile-brown",        name: "Daneile Brown",        short: "Daneile",  color: "#3b82f6" },
  { id: "julio-capellan",       name: "Julio Capellan",       short: "Julio",    color: "#f59e0b" },
  { id: "allieandra-alexander", name: "Allieandra Alexander", short: "Allie",    color: "#22c55e" },
  { id: "teagan-brown",         name: "Teagan Brown",         short: "Teagan",   color: "#ef4444" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const START_HOUR   = 9;   // 9am ET
const END_HOUR     = 18;  // 6pm ET
const TOTAL_HOURS  = END_HOUR - START_HOUR; // 9

// Sunday no-call block: 9am–2pm
const SUN_IDX        = 6;
const SUN_BLOCK_END  = 14; // 2pm

const ROW_H        = 64;   // px per hour
const CAL_HEIGHT   = TOTAL_HOURS * ROW_H;

const STORAGE_KEY = "mba-coverage-v2";

// ─── Types ────────────────────────────────────────────────────────────────────

type Block = {
  id: string;
  setterId: string;
  day: number;       // 0=Mon…6=Sun
  startHour: number; // 9–17
  duration: number;  // hours, min 1
};

type DragPayload =
  | { type: "new";  setterId: string }
  | { type: "move"; blockId: string };

type HoverCell = { day: number; hour: number } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

function fmtHour(h: number) {
  if (h === 0)  return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

/** For blocks that overlap in the same day column, assign equal fractional widths. */
function overlap(block: Block, all: Block[]) {
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

function isSunBlocked(day: number, hour: number) {
  return day === SUN_IDX && hour >= START_HOUR && hour < SUN_BLOCK_END;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CoverageCalendar() {
  const [blocks,    setBlocks]    = useState<Block[]>([]);
  const [hover,     setHover]     = useState<HoverCell>(null);
  const [dragging,  setDragging]  = useState<string | null>(null);
  const [hydrated,  setHydrated]  = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBlocks(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks, hydrated]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onPaletteDragStart = useCallback((e: React.DragEvent, setterId: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "new", setterId } as DragPayload));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onBlockDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "move", blockId } as DragPayload));
    e.dataTransfer.effectAllowed = "move";
    setDragging(blockId);
  }, []);

  const onColDragOver = useCallback((e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const y    = e.clientY - rect.top;
    const hour = Math.max(START_HOUR, Math.min(START_HOUR + Math.floor(y / ROW_H), END_HOUR - 1));
    setHover({ day, hour });
  }, []);

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

    const rect      = e.currentTarget.getBoundingClientRect();
    const y         = e.clientY - rect.top;
    const startHour = Math.max(START_HOUR, Math.min(START_HOUR + Math.floor(y / ROW_H), END_HOUR - 1));

    // Block Sunday 9am–2pm
    if (isSunBlocked(day, startHour)) return;

    try {
      const payload: DragPayload = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (payload.type === "new") {
        setBlocks(prev => {
          const maxDur = END_HOUR - startHour;
          const dur    = Math.min(3, maxDur);
          return [...prev, { id: uid(), setterId: payload.setterId, day, startHour, duration: dur }];
        });
      } else {
        setBlocks(prev => {
          const block = prev.find(b => b.id === payload.blockId);
          if (!block) return prev;
          const maxDur = END_HOUR - startHour;
          const dur    = Math.min(block.duration, maxDur);
          return prev.map(b =>
            b.id === payload.blockId ? { ...b, day, startHour, duration: dur } : b
          );
        });
      }
    } catch {}
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const setDuration = useCallback((id: string, duration: number) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, duration } : b));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="space-y-4">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            <Clock size={12} />
            Eastern Time (ET) · 9am – 6pm
          </div>
          <span className="text-xs hidden sm:block" style={{ color: "var(--muted-foreground)" }}>
            Drag setters onto the grid · Drag blocks to move · Slider adjusts duration
          </span>
        </div>
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

      {/* ── Setter Palette ───────────────────────────────────────────── */}
      <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none"
              style={{ background: s.color + "20", border: `1px solid ${s.color}50`, color: s.color }}
            >
              <GripVertical size={13} className="opacity-50" />
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {/* ── Calendar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>

        {/* Day header row */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `56px repeat(7, 1fr)`,
            borderBottom: "1px solid var(--border)",
            background: "rgba(10,15,30,0.6)",
          }}
        >
          <div
            className="flex items-end justify-center pb-2 pt-3 text-xs font-bold"
            style={{ borderRight: "1px solid var(--border)", color: "var(--muted-foreground)" }}
          >
            ET
          </div>
          {DAYS.map((d, i) => (
            <div
              key={d}
              className="py-3 text-center text-xs font-bold uppercase tracking-widest"
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

        {/* Calendar body */}
        <div className="flex overflow-x-auto">

          {/* Time axis */}
          <div className="flex-shrink-0 border-r" style={{ width: 56, borderColor: "var(--border)" }}>
            <div style={{ height: CAL_HEIGHT, position: "relative", background: "rgba(10,15,30,0.4)" }}>
              {hourLabels.map((h, i) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    top: i * ROW_H - 8,
                    width: "100%",
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: 600,
                    color: h === 12 ? "#3b82f6" : "var(--muted-foreground)",
                  }}
                >
                  {fmtHour(h)}
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          <div className="flex flex-1 min-w-0">
            {DAYS.map((day, dayIdx) => {
              const dayBlocks = blocks.filter(b => b.day === dayIdx);
              const isWeekend = dayIdx >= 5;
              const hoveringHere = hover?.day === dayIdx;

              return (
                <div
                  key={day}
                  className="flex-1 relative"
                  style={{
                    borderRight: dayIdx < 6 ? "1px solid var(--border)" : undefined,
                    background: isWeekend ? "rgba(245,158,11,0.025)" : undefined,
                    minWidth: 80,
                  }}
                  onDragOver={e => onColDragOver(e, dayIdx)}
                  onDragLeave={onColDragLeave}
                  onDrop={e => onColDrop(e, dayIdx)}
                >
                  {/* Hour grid lines */}
                  <div style={{ height: CAL_HEIGHT, position: "relative" }}>
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          top: i * ROW_H,
                          left: 0,
                          right: 0,
                          height: ROW_H,
                          borderBottom: "1px solid var(--border)",
                          opacity: 0.5,
                        }}
                      />
                    ))}

                    {/* Half-hour tick marks */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        style={{
                          position: "absolute",
                          top: i * ROW_H + ROW_H / 2,
                          left: 0,
                          right: 0,
                          borderBottom: "1px dashed rgba(255,255,255,0.06)",
                        }}
                      />
                    ))}

                    {/* Drop hover highlight */}
                    {hoveringHere && hover && !isSunBlocked(dayIdx, hover.hour) && (
                      <div
                        style={{
                          position: "absolute",
                          top: (hover.hour - START_HOUR) * ROW_H,
                          left: 0,
                          right: 0,
                          height: ROW_H,
                          background: "rgba(59,130,246,0.18)",
                          borderTop: "2px solid #3b82f6",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      />
                    )}

                    {/* Sunday 9am–2pm blocked zone */}
                    {dayIdx === SUN_IDX && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: (SUN_BLOCK_END - START_HOUR) * ROW_H,
                          background:
                            "repeating-linear-gradient(135deg, rgba(239,68,68,0.07) 0px, rgba(239,68,68,0.07) 8px, rgba(239,68,68,0.02) 8px, rgba(239,68,68,0.02) 16px)",
                          borderBottom: "2px solid rgba(239,68,68,0.5)",
                          zIndex: 3,
                          pointerEvents: "none",
                        }}
                      >
                        {/* Big X */}
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          <Ban size={28} style={{ color: "rgba(239,68,68,0.55)", strokeWidth: 2.5 }} />
                          <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                            color: "rgba(239,68,68,0.7)",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}>
                            No Calls
                          </span>
                          <span style={{ fontSize: 9, color: "rgba(239,68,68,0.5)", whiteSpace: "nowrap" }}>
                            9am – 2pm
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Blocks */}
                    {dayBlocks.map(block => {
                      const setter  = SETTERS.find(s => s.id === block.setterId);
                      if (!setter) return null;
                      const { left, width } = overlap(block, dayBlocks);
                      const top    = (block.startHour - START_HOUR) * ROW_H;
                      const height = block.duration * ROW_H - 3;
                      const maxDur = END_HOUR - block.startHour;
                      const isDragging = dragging === block.id;
                      const endHour = block.startHour + block.duration;

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
                            border:     `1px solid ${setter.color}60`,
                            borderLeft: `3px solid ${setter.color}`,
                            borderRadius: 6,
                            overflow: "hidden",
                            zIndex: isDragging ? 0 : 4,
                            opacity: isDragging ? 0.3 : 1,
                            cursor: "grab",
                            display: "flex",
                            flexDirection: "column",
                            transition: "opacity 0.15s",
                            boxShadow: `0 2px 8px ${setter.color}18`,
                          }}
                        >
                          {/* Block header */}
                          <div
                            style={{
                              padding: "3px 5px 2px",
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 2,
                              flex: "0 0 auto",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: setter.color, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {setter.short}
                              </div>
                              {height >= 50 && (
                                <div style={{ fontSize: 9, color: setter.color, opacity: 0.75, whiteSpace: "nowrap" }}>
                                  {fmtHour(block.startHour)}–{fmtHour(endHour)}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                              style={{ color: setter.color, opacity: 0.7, flexShrink: 0, lineHeight: 1, marginTop: 1 }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; }}
                            >
                              <X size={10} />
                            </button>
                          </div>

                          {/* Spacer */}
                          <div style={{ flex: 1 }} />

                          {/* Duration slider */}
                          <div
                            style={{ padding: "2px 5px 4px", flex: "0 0 auto" }}
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            <input
                              type="range"
                              min={1}
                              max={maxDur}
                              value={block.duration}
                              onChange={e => {
                                e.stopPropagation();
                                setDuration(block.id, Number(e.target.value));
                              }}
                              onDragStart={e => e.stopPropagation()}
                              style={{
                                width: "100%",
                                accentColor: setter.color,
                                cursor: "ew-resize",
                                height: 12,
                                display: "block",
                              }}
                              title={`${block.duration}h shift`}
                            />
                            {height >= 80 && (
                              <div style={{ textAlign: "center", fontSize: 9, color: setter.color, opacity: 0.8, marginTop: 1 }}>
                                {block.duration}h shift
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Coverage Summary ─────────────────────────────────────────── */}
      {blocks.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
            Coverage Summary
          </p>
          <div className="flex gap-5 flex-wrap">
            {SETTERS.map(setter => {
              const setterBlocks = blocks.filter(b => b.setterId === setter.id);
              if (!setterBlocks.length) return null;
              const totalHours = setterBlocks.reduce((s, b) => s + b.duration, 0);
              return (
                <div key={setter.id} className="flex items-center gap-2 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: setter.color }} />
                  <span style={{ color: "var(--foreground)" }}>{setter.short}</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: setter.color + "20", color: setter.color }}>
                    {setterBlocks.length} shift{setterBlocks.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {totalHours}h / wk
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
