"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { STATUS_LABELS, type ProviderCategory } from "@/lib/marketing/providers/client-constants";

export interface ProviderPublic {
  key: string;
  nameAr: string;
  status: string;
  connected?: boolean;
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

function statusBadgeType(p: ProviderPublic): "simulation" | "demo" | "not_connected" | "real" {
  if (p.connected || p.status === "HEALTHY" || p.status === "CONNECTED") return "real";
  if (p.status === "INVALID_KEY" || p.status === "EXPIRED" || p.status === "NEEDS_RECONNECT") return "demo";
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
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);
  const [encryptionEnvHint, setEncryptionEnvHint] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ProviderPublic | null>(null);
  const [form, setForm] = useState({ apiKey: "", orgId: "", projectId: "", endpointUrl: "", modelId: "", roleAssignment: "", taskAssignment: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [modalMsg, setModalMsg] = useState("");
  const [modalOk, setModalOk] = useState<boolean | null>(null);

  const load = useCallback(() => {
    fetch(`/api/marketing/providers?category=${category}`)
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers ?? []);
        setCanManageSecrets(Boolean(d.canManageSecrets));
        setEncryptionConfigured(d.encryptionConfigured !== false);
        setEncryptionEnvHint(typeof d.encryptionEnvHint === "string" ? d.encryptionEnvHint : "");
      })
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(provider: ProviderPublic, act: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    setModalMsg("");
    setModalOk(null);

    const isRunwayConnect =
      provider.key === "RUNWAY" && act === "connect_api_key" && category === "VIDEO";

    if (isRunwayConnect) {
      const apiKey = String(extra?.apiKey ?? form.apiKey).trim();
      const usageType = String(extra?.taskAssignment ?? form.taskAssignment).trim();
      if (!apiKey || (taskOptions && !usageType)) {
        setBusy(false);
        setModalOk(false);
        setModalMsg("الحقول المطلوبة ناقصة");
        return;
      }
      if (!encryptionConfigured) {
        setBusy(false);
        setModalOk(false);
        setModalMsg(
          `مفتاح التشفير غير مضاف في Vercel — ${encryptionEnvHint || "INTEGRATION_ENCRYPTION_KEY (32+ حرفًا)"}`
        );
        return;
      }
    }

    try {
      let res: Response;
      if (isRunwayConnect) {
        res = await fetch("/api/marketing/video-providers/runway/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: String(extra?.apiKey ?? form.apiKey).trim(),
            usageType: String(extra?.taskAssignment ?? form.taskAssignment).trim(),
          }),
        });
      } else {
        res = await fetch(`/api/marketing/providers/${provider.key.toLowerCase()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, action: act, ...extra }),
        });
      }

      let data: { ok?: boolean; error?: string; status?: string; lastTestedAt?: string } = {};
      try {
        data = await res.json();
      } catch {
        setModalOk(false);
        setModalMsg("فشل الاتصال بالخادم — استجابة غير متوقعة");
        return;
      }

      if (!res.ok || data.ok === false) {
        const err =
          data.error ??
          (res.status === 401 || res.status === 403
            ? "المفتاح غير صالح"
            : res.status >= 500
              ? "فشل الاتصال بالخادم"
              : "فشل الطلب");
        if (act === "connect_api_key") {
          setModalOk(false);
          setModalMsg(err);
        } else {
          setMsg(err);
        }
        return;
      }

      if (act === "connect_api_key") {
        setModalOk(true);
        setModalMsg("تم الاتصال بنجاح");
        setForm((f) => ({ ...f, apiKey: "" }));
        setTimeout(() => {
          setModal(null);
          setModalMsg("");
          setModalOk(null);
          load();
        }, 600);
        setMsg(`تم الاتصال بنجاح — ${provider.nameAr}`);
        return;
      }

      setMsg(act === "test" ? (data.ok ? "✓ الاتصال ناجح" : (data.error ?? "فشل")) : "تم");
      load();
    } catch (e) {
      const text = e instanceof Error ? e.message : "فشل الاتصال بالخادم";
      if (act === "connect_api_key") {
        setModalOk(false);
        setModalMsg(text);
      } else {
        setMsg(text);
      }
    } finally {
      setBusy(false);
    }
  }

  function openConnectModal(p: ProviderPublic) {
    setModal(p);
    setModalMsg("");
    setModalOk(null);
    setForm({
      apiKey: "",
      orgId: "",
      projectId: "",
      endpointUrl: "",
      modelId: p.modelId ?? "",
      roleAssignment: p.roleAssignment ?? "",
      taskAssignment: p.taskAssignment ?? "",
    });
  }

  function formatLastSuccess(iso: string | null) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return iso;
    }
  }

  if (loading) return <MkLoading />;

  return (
    <div>
      <MkPageHeader title={title} desc={desc} />
      {!encryptionConfigured && canManageSecrets && (
        <p className="mb-4 rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          لا يمكن حفظ مفاتيح المزودات بدون تشفير — أضف{" "}
          <strong>INTEGRATION_ENCRYPTION_KEY</strong> (32+ حرفًا) في Vercel Production.
          {encryptionEnvHint ? ` (${encryptionEnvHint})` : null}
        </p>
      )}
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
                <p className="text-xs opacity-60">
                  {p.connected
                    ? STATUS_LABELS.CONNECTED
                    : STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status}
                </p>
              </div>
              <MkBadge type={statusBadgeType(p)} />
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {p.isDefault && <span className="rounded bg-emerald-900/40 px-2 py-0.5 text-[10px]">افتراضي</span>}
              {p.isBackup && <span className="rounded bg-blue-900/40 px-2 py-0.5 text-[10px]">احتياطي</span>}
              {p.developerSetupRequired && (
                <span className="rounded bg-stone-700 px-2 py-0.5 text-[10px]">يتطلب إعداد حساب المطور</span>
              )}
            </div>
            {p.connected && (
              <p className="mb-2 text-xs opacity-70">
                المفتاح المحفوظ: ****
                {p.lastSuccessAt && (
                  <span className="mr-2"> · آخر اختبار ناجح: {formatLastSuccess(p.lastSuccessAt)}</span>
                )}
              </p>
            )}
            {p.lastError && <p className="mb-2 text-xs text-red-400">{p.lastError}</p>}
            {p.costEstimate && <p className="mb-2 text-xs opacity-60">تقدير التكلفة: {p.costEstimate}</p>}
            <div className="flex flex-wrap gap-2">
              {p.oauthSupported && p.developerReady && canManageSecrets && (
                <button type="button" disabled className="rounded border px-2 py-1 text-xs opacity-50" title="OAuth عند توفر credentials">
                  تسجيل الدخول والربط
                </button>
              )}
              {p.apiKeySupported && canManageSecrets && (
                <button type="button" onClick={() => openConnectModal(p)} className="rounded bg-amber-700 px-2 py-1 text-xs text-white">
                  {p.hasSecret ? "تحديث المفتاح" : "الربط بالمفتاح"}
                </button>
              )}
              {p.connected && (
                <>
                  <button type="button" disabled={busy} onClick={() => action(p, "test")} className="rounded border px-2 py-1 text-xs">اختبار الاتصال</button>
                  {canManageSecrets && (
                    <>
                      <button type="button" disabled={busy} onClick={() => action(p, "set_flags", { flags: { isDefault: true } })} className="rounded border px-2 py-1 text-xs">تعيين كافتراضي</button>
                      <button type="button" disabled={busy} onClick={() => action(p, "set_flags", { flags: { isBackup: true } })} className="rounded border px-2 py-1 text-xs">تعيين كاحتياطي</button>
                      <button type="button" disabled={busy} onClick={() => action(p, "disconnect")} className="rounded border border-red-800 px-2 py-1 text-xs text-red-400">فصل الاتصال</button>
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
                <select className="w-full rounded border bg-transparent px-3 py-2 text-sm" value={form.taskAssignment} onChange={(e) => setForm({ ...form, taskAssignment: e.target.value })} required={modal.key === "RUNWAY"}>
                  <option value="">— نوع الاستخدام —</option>
                  {taskOptions.map((t) => <option key={t.id} value={t.id}>{t.labelAr}</option>)}
                </select>
              )}
            </div>
            {modalMsg && (
              <p
                className={`mt-3 text-sm ${modalOk === true ? "text-emerald-400" : modalOk === false ? "text-red-400" : "text-amber-300"}`}
                role="status"
              >
                {modalMsg}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => action(modal, "connect_api_key", { ...form })}
                className="flex-1 rounded bg-amber-600 py-2 text-sm text-white disabled:opacity-60"
              >
                {busy ? "جاري الحفظ والاختبار..." : "حفظ واختبار"}
              </button>
              <button type="button" disabled={busy} onClick={() => setModal(null)} className="rounded border px-4 py-2 text-sm">
                إلغاء
              </button>
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
