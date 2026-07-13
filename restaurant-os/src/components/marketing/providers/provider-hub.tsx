"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { STATUS_LABELS, type ProviderCategory } from "@/lib/marketing/providers/client-constants";

export interface ProviderPublic {
  key: string;
  nameAr: string;
  status: string;
  oauthSupported: boolean;
  apiKeySupported: boolean;
  developerSetupRequired: boolean;
  developerReady: boolean;
  models: { id: string; labelAr: string }[];
  modelId: string | null;
  isDefault: boolean;
  isBackup: boolean;
  roleAssignment?: string | null;
  taskAssignment?: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  hasSecret: boolean;
  meta?: Record<string, unknown>;
  requiresOrgId?: boolean;
  requiresProjectId?: boolean;
  requiresEndpoint?: boolean;
  costEstimate?: string | null;
}

function statusBadgeType(status: string): "simulation" | "demo" | "not_connected" | "real" {
  if (status === "HEALTHY" || status === "CONNECTED") return "real";
  if (status === "INVALID_KEY" || status === "EXPIRED" || status === "NEEDS_RECONNECT") return "demo";
  return "not_connected";
}

export function ProviderHub({
  title,
  desc,
  category,
  taskOptions,
  roleOptions,
}: {
  title: string;
  desc: string;
  category: ProviderCategory;
  taskOptions?: { id: string; labelAr: string }[];
  roleOptions?: { id: string; labelAr: string }[];
}) {
  const [providers, setProviders] = useState<ProviderPublic[]>([]);
  const [canManageSecrets, setCanManageSecrets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ProviderPublic | null>(null);
  const [form, setForm] = useState({ apiKey: "", orgId: "", projectId: "", endpointUrl: "", modelId: "", roleAssignment: "", taskAssignment: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch(`/api/marketing/providers?category=${category}`)
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers ?? []);
        setCanManageSecrets(Boolean(d.canManageSecrets));
      })
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(provider: ProviderPublic, act: string, extra?: object) {
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/marketing/providers/${provider.key.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, action: act, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "فشل");
      return;
    }
    setMsg(act === "test" ? (data.ok ? "✓ الاتصال ناجح" : data.error) : "تم");
    setModal(null);
    load();
  }

  if (loading) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title={title} desc={desc} />
      {!canManageSecrets && (
        <p className="mb-4 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
          مدير التسويق: يمكن استخدام المزودات — لا يمكن عرض أو تعديل المفاتيح السرية
        </p>
      )}
      {msg && <p className="mb-3 text-sm text-amber-400">{msg}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((p) => (
          <MkCard key={p.key}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">{p.nameAr}</h3>
                <p className="text-xs opacity-60">{STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status}</p>
              </div>
              <MkBadge type={statusBadgeType(p.status)} />
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {p.isDefault && <span className="rounded bg-emerald-900/40 px-2 py-0.5 text-[10px]">افتراضي</span>}
              {p.isBackup && <span className="rounded bg-blue-900/40 px-2 py-0.5 text-[10px]">احتياطي</span>}
              {p.developerSetupRequired && (
                <span className="rounded bg-stone-700 px-2 py-0.5 text-[10px]">يتطلب إعداد حساب المطور</span>
              )}
            </div>
            {p.lastError && <p className="mb-2 text-xs text-red-400">{p.lastError}</p>}
            {p.costEstimate && <p className="mb-2 text-xs opacity-60">تقدير التكلفة: {p.costEstimate}</p>}
            <div className="flex flex-wrap gap-2">
              {p.oauthSupported && p.developerReady && canManageSecrets && (
                <button type="button" disabled className="rounded border px-2 py-1 text-xs opacity-50" title="OAuth عند توفر credentials">
                  تسجيل الدخول والربط
                </button>
              )}
              {p.apiKeySupported && canManageSecrets && (
                <button type="button" onClick={() => { setModal(p); setForm({ ...form, modelId: p.modelId ?? "" }); }} className="rounded bg-amber-700 px-2 py-1 text-xs text-white">
                  الربط بالمفتاح
                </button>
              )}
              {p.hasSecret && (
                <>
                  <button type="button" disabled={busy} onClick={() => action(p, "test")} className="rounded border px-2 py-1 text-xs">اختبار الاتصال</button>
                  {canManageSecrets && (
                    <>
                      <button type="button" disabled={busy} onClick={() => action(p, "set_flags", { flags: { isDefault: true } })} className="rounded border px-2 py-1 text-xs">تعيين كافتراضي</button>
                      <button type="button" disabled={busy} onClick={() => action(p, "set_flags", { flags: { isBackup: true } })} className="rounded border px-2 py-1 text-xs">تعيين كاحتياطي</button>
                      <button type="button" disabled={busy} onClick={() => action(p, "disconnect")} className="rounded border border-red-800 px-2 py-1 text-xs text-red-400">قطع الاتصال</button>
                    </>
                  )}
                </>
              )}
            </div>
          </MkCard>
        ))}
      </div>

      {modal && canManageSecrets && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <MkCard className="max-h-[90vh] w-full max-w-md overflow-y-auto">
            <h3 className="mb-3 font-bold">الربط بالمفتاح — {modal.nameAr}</h3>
            <p className="mb-3 text-xs opacity-60">لا تُخزَّن كلمات المرور — API Key فقط · مشفّر على الخادم</p>
            <div className="space-y-2">
              <input type="password" placeholder="API Key" className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} autoComplete="off" />
              {modal.requiresOrgId && <input placeholder="Organization ID" className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.orgId} onChange={(e) => setForm({ ...form, orgId: e.target.value })} />}
              {modal.requiresProjectId && <input placeholder="Project ID" className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} />}
              {modal.requiresEndpoint && <input placeholder="Endpoint URL" className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.endpointUrl} onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })} />}
              {modal.models.length > 0 && (
                <select className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}>
                  {modal.models.map((m) => <option key={m.id} value={m.id}>{m.labelAr}</option>)}
                </select>
              )}
              {roleOptions && (
                <select className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.roleAssignment} onChange={(e) => setForm({ ...form, roleAssignment: e.target.value })}>
                  <option value="">— دور AI —</option>
                  {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.labelAr}</option>)}
                </select>
              )}
              {taskOptions && (
                <select className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.taskAssignment} onChange={(e) => setForm({ ...form, taskAssignment: e.target.value })}>
                  <option value="">— نوع المهمة —</option>
                  {taskOptions.map((t) => <option key={t.id} value={t.id}>{t.labelAr}</option>)}
                </select>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={() => action(modal, "connect_api_key", { ...form })} className="flex-1 rounded bg-amber-600 py-2 text-sm text-white">حفظ واختبار</button>
              <button type="button" onClick={() => setModal(null)} className="rounded border px-4 py-2 text-sm">إلغاء</button>
            </div>
          </MkCard>
        </div>
      )}
    </div>
  );
}

export function ConnectionCenterLinks() {
  const links = [
    { href: "/dashboard/marketing/ai-brain/providers", label: "Marketing Brain" },
    { href: "/dashboard/marketing/creative/images/providers", label: "توليد الصور" },
    { href: "/dashboard/marketing/creative/videos/providers", label: "توليد الفيديو" },
    { href: "/dashboard/marketing/creative/audio/providers", label: "الصوت والتعليق" },
    { href: "/dashboard/marketing/platforms/connect", label: "منصات الإعلان" },
    { href: "/dashboard/marketing/ai-brain/routing", label: "توجيه المزودات" },
    { href: "/dashboard/marketing/ai-costs", label: "التحكم بالتكلفة" },
    { href: "/dashboard/marketing/connections/wizard", label: "معالج الربط" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="rounded-xl border border-stone-700/50 bg-stone-900/40 p-4 text-sm transition hover:border-amber-600/50">
          {l.label}
        </Link>
      ))}
    </div>
  );
}
