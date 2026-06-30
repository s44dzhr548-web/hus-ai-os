import Link from "next/link";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <DisclaimerBanner />
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm uppercase tracking-widest text-emerald-400">
          HUSAI-OS · Trading AI
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Paper trading research platform
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-400">
          Auditable signals, reproducible backtests, and risk-managed paper
          trading. Live trading disabled in MVP.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Open dashboard
          </Link>
          <Link
            href="/api/health"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm hover:border-zinc-500"
          >
            Health check
          </Link>
        </div>
        <ul className="mt-10 space-y-2 text-sm text-zinc-500">
          <li>✓ SMA crossover strategy engine</li>
          <li>✓ Reproducible backtest with hash verification</li>
          <li>✓ Mock data when Alpaca keys not configured</li>
          <li>✓ Time-series schema ready for Supabase</li>
        </ul>
      </main>
    </div>
  );
}
