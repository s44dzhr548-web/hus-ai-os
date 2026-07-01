import { AnalysisClient } from "@/components/analysis-client";

export default function AnalysisPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">AI Analysis Engine</h1>
      <p className="mt-1 text-sm text-zinc-500">Technical · News · Sector · Macro · Buy/Hold/Sell with explanations</p>
      <div className="mt-8">
        <AnalysisClient />
      </div>
    </div>
  );
}
