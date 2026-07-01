import { OverviewClient } from "@/components/overview-client";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Trading Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">AI-powered market overview · Mock data · Paper trading only</p>
      <div className="mt-8">
        <OverviewClient />
      </div>
    </div>
  );
}
