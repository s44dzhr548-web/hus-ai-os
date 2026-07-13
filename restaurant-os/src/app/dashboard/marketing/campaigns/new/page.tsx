"use client";

import { MkCard, MkPageHeader } from "@/components/marketing/marketing-shell";
import { CAMPAIGN_WORKFLOW_STATUSES } from "@/lib/marketing/nav";

export default function NewCampaignPage() {
  return (
    <div>
      <MkPageHeader title="حملة جديدة" desc="Campaign Builder — no publish until connected + approved" />
      <MkCard className="grid gap-3 sm:grid-cols-2">
        {["Campaign name", "Goal", "Branch", "City", "Audience", "Platform", "Budget", "Offer", "Schedule", "CTA", "Landing", "WhatsApp link"].map((f) => (
          <label key={f} className="text-sm">{f}<input className="mt-1 w-full rounded border bg-transparent px-2 py-1" /></label>
        ))}
        <label className="text-sm sm:col-span-2">Status
          <select className="mt-1 w-full rounded border bg-transparent px-2 py-1">
            {CAMPAIGN_WORKFLOW_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.labelAr}</option>)}
          </select>
        </label>
        <button type="button" disabled className="rounded bg-amber-600 px-4 py-2 text-sm text-white opacity-60 sm:col-span-2">حفظ مسودة</button>
      </MkCard>
    </div>
  );
}
