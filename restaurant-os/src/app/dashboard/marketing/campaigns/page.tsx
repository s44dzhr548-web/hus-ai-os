"use client";

import { useEffect, useState } from "react";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";

export default function CampaignBuilderPage() {
  const [campaigns, setCampaigns] = useState<Array<Record<string, string | number>>>([]);

  useEffect(() => {
    fetch("/api/marketing/command?section=campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []));
  }, []);

  if (!campaigns.length) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title="Campaign Builder" desc="UI only — no publishing · approval required" />
      <div className="space-y-3">
        {campaigns.map((c) => (
          <MkCard key={String(c.id)}>
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">{c.name}</h3>
              <div className="flex gap-2">
                <span className="text-xs">{c.status}</span>
                <MkBadge type="simulation" />
              </div>
            </div>
            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <div><dt className="opacity-60">Objective</dt><dd>{c.objective}</dd></div>
              <div><dt className="opacity-60">Audience</dt><dd>{c.audience}</dd></div>
              <div><dt className="opacity-60">Budget</dt><dd>{c.budget} ر.س</dd></div>
              <div><dt className="opacity-60">Platform</dt><dd>{c.platform}</dd></div>
              <div><dt className="opacity-60">Schedule</dt><dd>{c.schedule}</dd></div>
              <div><dt className="opacity-60">CTA</dt><dd>{c.cta}</dd></div>
              <div><dt className="opacity-60">Approval</dt><dd>{c.approval}</dd></div>
            </dl>
          </MkCard>
        ))}
      </div>
      <button type="button" disabled className="mt-4 rounded border px-4 py-2 text-sm opacity-60">+ حملة جديدة (Phase 2)</button>
    </div>
  );
}
