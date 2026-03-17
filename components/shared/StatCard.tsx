import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
}

export function StatCard({ title, value, change, trend = "neutral", icon: Icon }: StatCardProps) {
  const trendColor =
    trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "var(--muted-foreground)";

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          {title}
        </p>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)" }}
          >
            <Icon size={15} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
        {value}
      </p>
      {change && (
        <div className="flex items-center gap-1 mt-2">
          {trend === "up" && <TrendingUp size={13} style={{ color: trendColor }} />}
          {trend === "down" && <TrendingDown size={13} style={{ color: trendColor }} />}
          <span className="text-xs font-medium" style={{ color: trendColor }}>
            {change}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            vs last month
          </span>
        </div>
      )}
    </div>
  );
}
