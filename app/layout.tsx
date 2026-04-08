import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mendoza Baseball Academy — Social Dashboard",
  description: "Social media management dashboard for @mendoza.baseball.academy",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black",
    "apple-mobile-web-app-title": "MBA Dashboard",
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
