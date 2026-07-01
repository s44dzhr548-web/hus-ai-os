import { RiskClient } from "@/components/risk-client";

export default function RiskPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Risk Management</h1>
      <p className="mt-1 text-sm text-zinc-500">Stop loss · Take profit · Position sizing · Capital protection</p>
      <div className="mt-8">
        <RiskClient />
      </div>
    </div>
  );
}
