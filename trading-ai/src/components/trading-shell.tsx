"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/watchlist", label: "Watchlist" },
  { href: "/dashboard/analysis", label: "AI Analysis" },
  { href: "/dashboard/backtest", label: "Backtest" },
  { href: "/dashboard/risk", label: "Risk" },
  { href: "/dashboard/learning", label: "Learning" },
  { href: "/dashboard/alerts", label: "Alerts" },
];

export function TradingShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <Link href="/" className="text-xs uppercase tracking-widest text-emerald-400">
              HUSAI-OS · Trading AI
            </Link>
            <p className="text-sm text-zinc-500">Paper trading · Mock data · No real execution</p>
          </div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
            DEMO MODE
          </span>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                path === item.href
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "buy" | "sell" | "hold" | "neutral" | "risk";
}) {
  const colors = {
    buy: "bg-emerald-500/20 text-emerald-300",
    sell: "bg-red-500/20 text-red-300",
    hold: "bg-amber-500/20 text-amber-300",
    neutral: "bg-zinc-800 text-zinc-300",
    risk: "bg-orange-500/20 text-orange-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs uppercase ${colors[tone]}`}>{children}</span>
  );
}

export function RecommendationBadge({ rec }: { rec: string }) {
  const tone = rec === "buy" ? "buy" : rec === "sell" ? "sell" : "hold";
  return <Badge tone={tone}>{rec}</Badge>;
}

export function RiskBadge({ level }: { level: string }) {
  return <Badge tone="risk">{level}</Badge>;
}
