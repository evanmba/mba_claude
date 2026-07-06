import type { Metadata } from "next";
import Image from "next/image";
import { CheckInForm } from "@/components/athlete/CheckInForm";
import { EmbedResizer } from "@/components/athlete/EmbedResizer";

export const metadata: Metadata = {
  title: "Weekly Check-In — Mendoza Baseball Academy",
  description: "Log your weekly numbers and track your progress.",
};

export default function CheckInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ background: "var(--background)" }}
    >
      <EmbedResizer />
      <div className="w-full max-w-md" data-embed-content>
        {/* Brand */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Mendoza Baseball Academy"
            width={200}
            height={45}
            className="object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
            priority
          />
        </div>

        <div
          className="rounded-2xl border p-5 sm:p-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <CheckInForm />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--muted-foreground)" }}>
          Mendoza Baseball Academy · Athlete Progress Tracker
        </p>
      </div>
    </div>
  );
}
