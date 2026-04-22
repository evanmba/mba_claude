import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Sales Script",
  description: "Closer call script — Mendoza Baseball Academy",
};

export default function SalesScriptLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
