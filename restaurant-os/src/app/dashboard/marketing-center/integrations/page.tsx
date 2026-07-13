"use client";

import { McCard } from "@/components/marketing-center/mc-shell";
import { FUTURE_PLATFORMS } from "@/lib/marketing-center/constants";
import { Badge } from "@/components/ui";

export default function IntegrationsPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">التكاملات المستقبلية</h1>
      <p className="mb-6 text-sm opacity-70">Phase 2 — لا OAuth · لا API · Coming Soon</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FUTURE_PLATFORMS.map((p) => (
          <McCard key={p.key}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{p.labelAr}</p>
                <p className="text-xs opacity-50">{p.category}</p>
              </div>
              <Badge className="bg-stone-800 text-amber-400/90">Not Connected</Badge>
            </div>
            <p className="mt-3 text-xs text-amber-600/80">Coming Soon · Phase 2</p>
          </McCard>
        ))}
      </div>
    </div>
  );
}
