"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { CAMPAIGN_WORKFLOW_STATUSES } from "@/lib/marketing/nav";

const GOALS = [
  { id: "INCREASE_SALES", label: "زيادة المبيعات" },
  { id: "INCREASE_RESERVATIONS", label: "زيادة الحجوزات" },
  { id: "PROMOTE_OFFER", label: "ترويج عرض" },
  { id: "INCREASE_FOLLOWERS", label: "زيادة المتابعين" },
];

const OBJECTIVES = [
  { id: "AWARENESS", label: "الوعي بالعلامة" },
  { id: "TRAFFIC", label: "زيارات الموقع" },
  { id: "CONVERSIONS", label: "التحويلات" },
  { id: "LEADS", label: "العملاء المحتملين" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Array<{ key: string; labelAr: string; status: string; accountName?: string | null }>>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ headline?: string; primaryText?: string; cta?: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    goal: "INCREASE_SALES",
    objective: "CONVERSIONS",
    platform: "META",
    budget: "500",
    durationDays: "7",
    audience: "الرياض — محبي المطاعم",
    headline: "",
    primaryText: "",
    cta: "اطلب الآن",
    status: "DRAFT",
  });

  useEffect(() => {
    fetch("/api/marketing/platforms")
      .then((r) => r.json())
      .then((d) => {
        const connected = (d.platforms || []).filter(
          (p: { status: string; connectionState?: string }) =>
            p.connectionState === "CONNECTED" || p.status === "CONNECTED"
        );
        setPlatforms(connected);
      });
  }, []);

  async function generateAi(field: "all" | "headline" | "description") {
    setBusy(true);
    const res = await fetch("/api/marketing/ai/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: form.goal, context: form.audience, platform: form.platform }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setForm((f) => ({
        ...f,
        headline: data.headline || f.headline,
        primaryText: data.primaryText || f.primaryText,
        cta: data.cta || f.cta,
      }));
      setPreview({ headline: data.headline, primaryText: data.primaryText, cta: data.cta });
    }
  }

  async function save(publish = false) {
    setBusy(true);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + Number(form.durationDays || 7));

    const res = await fetch("/api/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || "حملة جديدة",
        goal: form.goal,
        platform: form.platform,
        budget: Number(form.budget),
        scheduleStart: start.toISOString(),
        scheduleEnd: end.toISOString(),
        audience: { description: form.audience, objective: form.objective },
        headline: form.headline,
        primaryText: form.primaryText,
        cta: form.cta,
        status: publish ? "PENDING_REVIEW" : form.status,
      }),
    });
    setBusy(false);
    if (res.ok) router.push("/dashboard/marketing/campaigns");
  }

  return (
    <div className="space-y-6 pb-16">
      <MkPageHeader title="Campaign Builder" desc="Create · Preview · Publish — powered by AI" />
      <Link href="/dashboard/marketing/platforms" className="text-sm text-emerald-400">← المنصات</Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <MkCard className="space-y-4">
          <h2 className="font-semibold text-white">1. Choose Platform</h2>
          <select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2"
          >
            {platforms.length === 0 && <option value="">— اربط منصة أولاً —</option>}
            {platforms.map((p) => (
              <option key={p.key} value={p.key}>
                {p.labelAr}{p.accountName ? ` — ${p.accountName}` : ""}
              </option>
            ))}
          </select>

          <h2 className="font-semibold text-white">2. Objective & Budget</h2>
          <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2">
            {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <select value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2">
            {OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="Budget (SAR)" className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2" />
          <input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder="Duration (days)" className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2" />

          <h2 className="font-semibold text-white">3. Audience</h2>
          <textarea value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} rows={2} className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2" />

          <h2 className="font-semibold text-white">4. Creative (AI)</h2>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2" />
          <input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Headline" className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2" />
          <textarea value={form.primaryText} onChange={(e) => setForm({ ...form, primaryText: e.target.value })} placeholder="Description" rows={3} className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2" />
          <input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="CTA" className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2" />

          <div className="flex flex-wrap gap-2">
            <Button loading={busy} onClick={() => generateAi("all")}>AI Write Copy</Button>
            <Button variant="outline" loading={busy} onClick={() => save(false)}>Save Draft</Button>
            <Button loading={busy} onClick={() => save(true)} disabled={!platforms.length}>Publish</Button>
          </div>
        </MkCard>

        <MkCard className="space-y-4">
          <h2 className="font-semibold text-white">Preview</h2>
          <div className="rounded-xl border border-stone-700 bg-stone-950 p-4">
            <p className="text-xs text-stone-500">{form.platform} · {form.objective}</p>
            <p className="mt-2 text-lg font-bold text-white">{preview?.headline || form.headline || "Headline preview"}</p>
            <p className="mt-2 text-sm text-stone-300">{preview?.primaryText || form.primaryText || "Description preview..."}</p>
            <span className="mt-4 inline-block rounded bg-emerald-700 px-3 py-1 text-sm">{preview?.cta || form.cta}</span>
          </div>
          <p className="text-xs text-stone-500">AI can recommend budget, audience, and predict performance after save.</p>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2">
            {CAMPAIGN_WORKFLOW_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.labelAr}</option>)}
          </select>
        </MkCard>
      </div>
    </div>
  );
}
