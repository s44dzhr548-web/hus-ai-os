"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui";
import { McCard } from "@/components/marketing-center/mc-shell";
import { formatCurrency } from "@/lib/utils";

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing-center/data")
      .then((r) => r.json())
      .then((d) => setDecisions(d.decisions || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">مركز قرارات AI</h1>
      <p className="mb-6 text-sm opacity-70">توصيات فقط — لا تنفيذ</p>
      <div className="space-y-4">
        {decisions.map((d) => (
          <McCard key={String(d.id)} glow>
            <p className="text-lg font-semibold">
              AI يوصي بنقل {formatCurrency(Number(d.amount))} من {String(d.fromPlatform)} إلى{" "}
              {String(d.toPlatform)}
            </p>
            <p className="mt-2 text-sm opacity-70">السبب: {String(d.reason)}</p>
            <p className="mt-2 text-amber-400">الربح المتوقع: +{String(d.expectedProfitPct)}%</p>
            <span className="mt-3 inline-block rounded bg-stone-800 px-2 py-1 text-xs">{String(d.status)}</span>
          </McCard>
        ))}
      </div>
    </div>
  );
}
