import { LucideIcon } from "lucide-react";

interface PlaceholderCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
}

export function PlaceholderCard({
  title,
  description,
  icon: Icon,
  className = "",
  children,
}: PlaceholderCardProps) {
  return (
    <div
      className={`rounded-xl border p-6 ${className}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {Icon && (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
          style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--primary)" }}
        >
          <Icon size={20} />
        </div>
      )}
      <h3
        className="text-base font-semibold mb-1"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
