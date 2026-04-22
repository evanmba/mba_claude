import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBA Sales Script",
  description: "Closer call script — Mendoza Baseball Academy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
