"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton({ action }: { action: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => action())}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: isPending ? "var(--muted-foreground)" : "var(--foreground)",
        cursor: isPending ? "not-allowed" : "pointer",
      }}>
      <RefreshCw size={13} style={{ color: "#3b82f6", animation: isPending ? "spin 0.8s linear infinite" : "none" }} />
      {isPending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
