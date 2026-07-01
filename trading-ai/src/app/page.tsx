import Link from "next/link";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <DisclaimerBanner />
      <main className="mx-auto flex max-w-4xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm uppercase tracking-widest text-emerald-400">HUSAI-OS · Trading AI</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Professional AI trading analysis platform
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-400">
          Market overview, AI signals, backtesting, risk management, and learning — all on mock data.
          Paper trading only. No real money execution.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Open Trading Dashboard
          </Link>
          <Link
            href="/api/health"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm hover:border-zinc-500"
          >
            Health check
          </Link>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {[
            "Market overview & watchlist (US, Crypto, Forex, Saudi)",
            "AI analysis with Buy/Hold/Sell + explanations",
            "Backtesting with strategy comparison",
            "Risk management & capital protection",
            "Learning system — prediction tracking",
            "Alerts (dashboard, email & WhatsApp-ready)",
            "Compliance mode — no financial advice",
            "Mock data first — live adapters when approved",
          ].map((f) => (
            <p key={f} className="text-sm text-zinc-500">✓ {f}</p>
          ))}
        </div>
      </main>
    </div>
  );
}
