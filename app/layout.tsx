import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBA Dashboard",
  description: "Mendoza Baseball Academy — Social & Funnel Dashboard",
  appleWebApp: {
    capable: true,
    title: "MBA",
    statusBarStyle: "black-translucent",
  },
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
