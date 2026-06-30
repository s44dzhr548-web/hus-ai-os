import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { DashboardShell } from "@/components/dashboard-shell";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HUSAI-OS Dashboard",
  description: "Unified control plane for HUSAI-OS projects and platform integrations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
