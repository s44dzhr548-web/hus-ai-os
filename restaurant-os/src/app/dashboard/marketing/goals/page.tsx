"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetch("/api/marketing/command?section=goals").then((r) => r.json()).then((d) => setGoals(d.goals ?? []));
  }, []);

  if (!goals.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="أهداف المطعم" desc="Phase B — prioritize · track · budget limits" />
      <div className="space-y-3">
        {goals.map((g) => (
          <MkCard key={String(g.id)}>
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">{String(g.labelAr)}</h3>
              <MkBadge type="simulation" />
            </div>
            <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
              <div>Target: {String(g.targetValue)}</div>
              <div>Priority: {String(g.priority)}</div>
              <div>Progress: {String(g.progress)}%</div>
              <div>Status: {String(g.status)}</div>
              <div>Budget limit: {String(g.budgetLimit)} ر.س</div>
              <div>Approval: {String(g.approvalPolicy)}</div>
            </dl>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
