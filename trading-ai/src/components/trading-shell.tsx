"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { DataModeBadge } from "./data-mode-badge";
import { useI18n, useRecommendationLabel, useRiskLabel } from "@/lib/i18n/context";

const NAV_KEYS = [
  { href: "/dashboard", key: "overview" as const },
  { href: "/dashboard/ceo", key: "ceoDashboard" as const },
  { href: "/dashboard/auto-bot", key: "autoBot" as const },
  { href: "/dashboard/portfolio-manager", key: "portfolioManager" as const },
  { href: "/dashboard/market-brain", key: "marketBrain" as const },
  { href: "/dashboard/research", key: "researchAgent" as const },
  { href: "/dashboard/strategy-marketplace", key: "strategyMarketplace" as const },
  { href: "/dashboard/consensus", key: "consensus" as const },
  { href: "/dashboard/improvement", key: "improvement" as const },
  { href: "/dashboard/analysis", key: "analysis" as const },
  { href: "/dashboard/why-now", key: "whyNow" as const },
  { href: "/dashboard/what-must-change", key: "whatMustChange" as const },
  { href: "/dashboard/ai-debate", key: "aiDebate" as const },
  { href: "/dashboard/event-impact", key: "eventImpact" as const },
  { href: "/dashboard/market-health", key: "marketHealth" as const },
  { href: "/dashboard/money-flow", key: "moneyFlow" as const },
  { href: "/dashboard/scenarios", key: "scenarios" as const },
  { href: "/dashboard/opportunities", key: "opportunities" as const },
  { href: "/dashboard/risk-guardian", key: "riskGuardian" as const },
  { href: "/dashboard/alerts", key: "alerts" as const },
  { href: "/dashboard/ai-memory", key: "aiMemory" as const },
  { href: "/dashboard/journal", key: "journal" as const },
  { href: "/dashboard/arabic-intelligence", key: "arabicIntel" as const },
  { href: "/dashboard/strategy-lab", key: "strategyLab" as const },
  { href: "/dashboard/cross-market", key: "crossMarket" as const },
  { href: "/dashboard/providers", key: "providers" as const },
  { href: "/dashboard/paper", key: "paper" as const },
  { href: "/dashboard/performance", key: "performance" as const },
  { href: "/dashboard/simulation", key: "simulation" as const },
  { href: "/competitors", key: "competitors" as const },
  { href: "/dashboard/settings", key: "settings" as const },
];

export function TradingShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t, dir } = useI18n();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50" dir={dir}>
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="text-start">
            <Link href="/" className="text-xs uppercase tracking-widest text-emerald-400">
              {t.brand}
            </Link>
            <p className="text-sm text-zinc-500">{t.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <DataModeBadge />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {NAV_KEYS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                path === item.href
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {t.nav[item.key]}
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-start">
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
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[tone]}`}>{children}</span>
  );
}

export function RecommendationBadge({ rec }: { rec: string }) {
  const label = useRecommendationLabel(rec);
  const tone = rec === "buy" ? "buy" : rec === "sell" ? "sell" : "hold";
  return <Badge tone={tone}>{label}</Badge>;
}

export function RiskBadge({ level }: { level: string }) {
  const label = useRiskLabel(level);
  return <Badge tone="risk">{label}</Badge>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 text-start">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
    </div>
  );
}
