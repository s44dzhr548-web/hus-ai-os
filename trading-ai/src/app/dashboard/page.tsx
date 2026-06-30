import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { DashboardClient } from "@/components/dashboard-client";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <DisclaimerBanner />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Trading Dashboard</h1>
        <p className="mt-2 text-zinc-400">Paper mode · signals and backtests</p>
        <DashboardClient />
      </div>
    </div>
  );
}
