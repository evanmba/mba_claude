"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Clock, Users, RotateCcw, GripVertical } from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const SETTERS = [
  { id: "gabriana-brown",       name: "Gabriana Brown",       short: "Gabriana",  color: "#d946ef" },
  { id: "daneile-brown",        name: "Daneile Brown",        short: "Daneile",   color: "#3b82f6" },
  { id: "julio-capellan",       name: "Julio Capellan",       short: "Julio",     color: "#f59e0b" },
  { id: "allieandra-alexander", name: "Allieandra Alexander", short: "Allie",     color: "#22c55e" },
  { id: "teagan-brown",         name: "Teagan Brown",         short: "Teagan",    color: "#ef4444" },
];

const DAYS = [
  { label: "Mon", short: "M", weekend: false },
  { label: "Tue", short: "T", weekend: false },
  { label: "Wed", short: "W", weekend: false },
  { label: "Thu", short: "T", weekend: false },
  { label: "Fri", short: "F", weekend: false },
  { label: "Sat", short: "S", weekend: true  },
  { label: "Sun", short: "S", weekend: true  },
];

const SLOTS = [
  { label: "8am – 11am",  start: 8,  end: 11 },
  { label: "11am – 2pm",  start: 11, end: 14 },
  { label: "2pm – 5pm",   start: 14, end: 17 },
  { label: "5pm – 8pm",   start: 17, end: 20 },
  { label: "8pm – 11pm",  start: 20, end: 23 },
];

const STORAGE_KEY = "mba-coverage-blocks-v1";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Block = {
  id: string;
  setterId: string;
  day: number;  // 0 = Mon … 6 = Sun
  slot: number; // 0 = 8–11am … 4 = 8–11pm
};

type DragPayload =
  | { type: "new"; setterId: string }
  | { type: "move"; blockId: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtHour(h: number): string {
  if (h === 0)  return "12am";
  if (h === 12) return "12pm";
  if (h > 12)   return `${h - 12}pm`;
  return `${h}am`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoverageCalendar() {
  const [blocks, setBlocks]           = useState<Block[]>([]);
  const [dragOver, setDragOver]       = useState<string | null>(null);
  const [dragging, setDragging]       = useState<string | null>(null);
  const [hydrated, setHydrated]       = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBlocks(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks, hydrated]);

  const onDragStart = useCallback((e: React.DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    if (payload.type === "move") setDragging(payload.blockId);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(key);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the cell entirely (not into a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent, day: number, slot: number) => {
    e.preventDefault();
    setDragOver(null);
    setDragging(null);
    try {
      const payload: DragPayload = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (payload.type === "new") {
        setBlocks(prev => {
          // Prevent duplicate setter in same cell
          if (prev.some(b => b.setterId === payload.setterId && b.day === day && b.slot === slot)) return prev;
          return [...prev, { id: uid(), setterId: payload.setterId, day, slot }];
        });
      } else {
        setBlocks(prev => {
          const block = prev.find(b => b.id === payload.blockId);
          if (!block) return prev;
          // If same setter already exists in target cell, just remove original
          if (prev.some(b => b.id !== payload.blockId && b.setterId === block.setterId && b.day === day && b.slot === slot)) {
            return prev.filter(b => b.id !== payload.blockId);
          }
          return prev.map(b => b.id === payload.blockId ? { ...b, day, slot } : b);
        });
      }
    } catch {}
  }, []);

  const onDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(null);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  return (
    <div className="space-y-4">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
            <Clock size={12} />
            All times Eastern (ET)
          </div>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            — drag setters onto the grid, drag blocks to move
          </span>
        </div>
        <button
          onClick={() => setBlocks([])}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "var(--secondary)"; }}
        >
          <RotateCcw size={12} />
          Clear all
        </button>
      </div>

      {/* ── Setter Palette ──────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} style={{ color: "var(--muted-foreground)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Setters
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SETTERS.map(s => (
            <div
              key={s.id}
              draggable
              onDragStart={e => onDragStart(e, { type: "new", setterId: s.id })}
              onDragEnd={onDragEnd}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none transition-opacity"
              style={{
                background: s.color + "20",
                border: `1px solid ${s.color}50`,
                color: s.color,
              }}
            >
              <GripVertical size={13} className="opacity-50" />
              {s.name}
            </div>
          ))}
        </div>
      </div>

      {/* ── Calendar Grid ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Day headers */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "72px repeat(7, 1fr)",
            borderBottom: "1px solid var(--border)",
            background: "rgba(15,23,42,0.6)",
          }}
        >
          {/* Corner */}
          <div
            className="px-2 py-3 flex items-end justify-center"
            style={{ borderRight: "1px solid var(--border)" }}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>ET</span>
          </div>
          {DAYS.map((d, i) => (
            <div
              key={d.label}
              className="py-3 text-center text-xs font-bold uppercase tracking-widest"
              style={{
                borderRight: i < 6 ? "1px solid var(--border)" : undefined,
                color: d.weekend ? "#f59e0b" : "var(--foreground)",
                background: d.weekend ? "rgba(245,158,11,0.05)" : undefined,
              }}
            >
              {d.label}
              {d.weekend && (
                <div className="text-xs font-normal mt-0.5" style={{ color: "#f59e0b", opacity: 0.6 }}>WE</div>
              )}
            </div>
          ))}
        </div>

        {/* Time slot rows */}
        {SLOTS.map((slot, slotIdx) => (
          <div
            key={slotIdx}
            className="grid"
            style={{
              gridTemplateColumns: "72px repeat(7, 1fr)",
              borderBottom: slotIdx < SLOTS.length - 1 ? "1px solid var(--border)" : undefined,
            }}
          >
            {/* Time label */}
            <div
              className="flex flex-col items-center justify-center py-3 px-1 gap-0.5"
              style={{
                borderRight: "1px solid var(--border)",
                background: "rgba(15,23,42,0.4)",
                minHeight: 80,
              }}
            >
              <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
                {fmtHour(slot.start)}
              </span>
              <span className="text-xs leading-none" style={{ color: "var(--muted-foreground)" }}>–</span>
              <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>
                {fmtHour(slot.end)}
              </span>
            </div>

            {/* Day cells */}
            {DAYS.map((day, dayIdx) => {
              const key = `${dayIdx}-${slotIdx}`;
              const cellBlocks = blocks.filter(b => b.day === dayIdx && b.slot === slotIdx);
              const isOver = dragOver === key;

              return (
                <div
                  key={dayIdx}
                  onDragOver={e => onDragOver(e, key)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, dayIdx, slotIdx)}
                  className="p-1.5 transition-all"
                  style={{
                    borderRight: dayIdx < 6 ? "1px solid var(--border)" : undefined,
                    minHeight: 80,
                    background: isOver
                      ? "rgba(59,130,246,0.18)"
                      : day.weekend
                        ? "rgba(245,158,11,0.03)"
                        : undefined,
                    outline: isOver ? "2px solid #3b82f6" : undefined,
                    outlineOffset: "-2px",
                    borderRadius: isOver ? 6 : undefined,
                  }}
                >
                  <div className="flex flex-col gap-1 h-full">
                    {cellBlocks.map(block => {
                      const setter = SETTERS.find(s => s.id === block.setterId);
                      if (!setter) return null;
                      const isDragging = dragging === block.id;
                      return (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={e => onDragStart(e, { type: "move", blockId: block.id })}
                          onDragEnd={onDragEnd}
                          className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-grab active:cursor-grabbing select-none group"
                          style={{
                            background: setter.color + "25",
                            border: `1px solid ${setter.color}60`,
                            color: setter.color,
                            opacity: isDragging ? 0.35 : 1,
                            transition: "opacity 0.15s, transform 0.1s",
                            boxShadow: `0 1px 4px ${setter.color}20`,
                          }}
                          onMouseEnter={e => { if (!isDragging) e.currentTarget.style.transform = "scale(1.02)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: setter.color }}
                            />
                            <span className="truncate">{setter.short}</span>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                            style={{ color: setter.color }}
                            title="Remove"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Drop hint when empty + hovering */}
                    {isOver && cellBlocks.length === 0 && (
                      <div
                        className="flex items-center justify-center h-full rounded-lg text-xs font-medium"
                        style={{
                          border: "1.5px dashed rgba(59,130,246,0.6)",
                          color: "rgba(59,130,246,0.7)",
                          minHeight: 44,
                        }}
                      >
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      {blocks.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
            Coverage Summary
          </p>
          <div className="flex gap-4 flex-wrap">
            {SETTERS.map(setter => {
              const count = blocks.filter(b => b.setterId === setter.id).length;
              if (!count) return null;
              return (
                <div key={setter.id} className="flex items-center gap-2 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: setter.color }} />
                  <span style={{ color: "var(--foreground)" }}>{setter.short}</span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: setter.color + "20", color: setter.color }}
                  >
                    {count} {count === 1 ? "block" : "blocks"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    ({count * 3}h / wk)
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
