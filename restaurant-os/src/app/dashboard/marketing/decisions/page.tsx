"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

interface Decision {
  decision: string;
  reason: string;
  dataUsed: string;
  expectedImpact: string;
  risk: string;
  confidence: number;
  needsApproval: boolean;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);

  useEffect(() => {
    fetch("/api/marketing/data?section=decisions")
      .then((r) => r.json())
      .then((d) => setDecisions(d.decisions ?? []));
  }, []);

  if (!decisions.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="قرار الذكاء الاصطناعي" desc="توصيات قابلة للتفسير — لا تنفيذ فعلي" />
      <div className="space-y-4">
        {decisions.map((d, i) => (
          <MkCard key={i}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">{d.decision}</h3>
              <MkBadge type="simulation" />
            </div>
            <dl className="grid gap-1 text-sm sm:grid-cols-2">
              <div><dt className="opacity-60">السبب</dt><dd>{d.reason}</dd></div>
              <div><dt className="opacity-60">البيانات</dt><dd>{d.dataUsed}</dd></div>
              <div><dt className="opacity-60">التأثير المتوقع</dt><dd>{d.expectedImpact}</dd></div>
              <div><dt className="opacity-60">المخاطرة</dt><dd>{d.risk}</dd></div>
              <div><dt className="opacity-60">الثقة</dt><dd>{d.confidence}%</dd></div>
              <div><dt className="opacity-60">موافقة المالك؟</dt><dd>{d.needsApproval ? "نعم" : "لا"}</dd></div>
            </dl>
          </MkCard>
        ))}
      </div>
    </div>
  );
}
