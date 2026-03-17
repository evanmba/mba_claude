import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlaceholderCard } from "@/components/shared/PlaceholderCard";
import { CalendarDays, Plus, Instagram, Twitter, Youtube } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = "March 2026";

// Build a 5-week grid starting March 1 (Sunday)
const weeks: (number | null)[][] = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30, 31, null, null, null, null],
];

const scheduledContent: Record<number, { platform: string; label: string }[]> = {
  17: [{ platform: "instagram", label: "Product shot" }],
  18: [{ platform: "twitter", label: "Thread" }],
  20: [{ platform: "instagram", label: "Reel" }],
  23: [{ platform: "youtube", label: "Tutorial" }],
  25: [{ platform: "instagram", label: "Story Q&A" }],
  27: [{ platform: "instagram", label: "Carousel" }],
};

const platformIcon: Record<string, React.ReactNode> = {
  instagram: <Instagram size={10} />,
  twitter: <Twitter size={10} />,
  youtube: <Youtube size={10} />,
};

const platformColor: Record<string, string> = {
  instagram: "#d946ef",
  twitter: "#3b82f6",
  youtube: "#ef4444",
};

export default function CalendarPage() {
  const today = 17; // March 17, 2026

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            {MONTH}
          </h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {Object.values(scheduledContent).flat().length} items scheduled this month
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          <Plus size={15} /> Schedule Content
        </button>
      </div>

      {/* Calendar Grid */}
      <PlaceholderCard title="" icon={CalendarDays}>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2 mt-2">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold py-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                const events = day ? scheduledContent[day] ?? [] : [];
                const isToday = day === today;
                return (
                  <div
                    key={di}
                    className="min-h-[80px] rounded-lg p-2 border transition-colors"
                    style={{
                      background: isToday ? "rgba(59,130,246,0.08)" : "var(--secondary)",
                      borderColor: isToday ? "var(--primary)" : "var(--border)",
                      opacity: day ? 1 : 0.3,
                    }}
                  >
                    {day && (
                      <>
                        <span
                          className={`text-xs font-medium block mb-1 ${isToday ? "w-5 h-5 rounded-full flex items-center justify-center text-white" : ""}`}
                          style={{
                            color: isToday ? "white" : "var(--foreground)",
                            background: isToday ? "var(--primary)" : "transparent",
                            width: isToday ? "20px" : "auto",
                            height: isToday ? "20px" : "auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: isToday ? "50%" : "0",
                          }}
                        >
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {events.map((ev, ei) => (
                            <div
                              key={ei}
                              className="flex items-center gap-1 rounded px-1 py-0.5 text-xs truncate"
                              style={{
                                background: `${platformColor[ev.platform]}22`,
                                color: platformColor[ev.platform],
                              }}
                            >
                              {platformIcon[ev.platform]}
                              <span className="truncate">{ev.label}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          {Object.entries(platformColor).map(([platform, color]) => (
            <div key={platform} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>
                {platform}
              </span>
            </div>
          ))}
        </div>
      </PlaceholderCard>
    </DashboardLayout>
  );
}
