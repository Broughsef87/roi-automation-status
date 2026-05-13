import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROI Metal Buildings — Automation Status",
  description: "Live status of automated workflows for ROI Metal Buildings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
