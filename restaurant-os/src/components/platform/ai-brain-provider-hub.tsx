"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { PLATFORM_BRAIN_ROLES } from "@/lib/platform/ai-providers-constants";

type ProviderRow = {
  key: string;
  nameAr: string;
  models: { id: string; labelAr: string }[];
  defaultModel: string;
  keyCreateUrl: string;
  modelId: string;
  cardStatus: "connected" | "disconnected" | "error" | "needs_test" | "missing_key";
  statusLabelAr: string;
  hasSecret: boolean;
  lastTestAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  roleAssignments: string[];
};

const CARD_STYLES: Record<ProviderRow["cardStatus"], string> = {
  connected: "border-emerald-600/50 bg-emerald-950/20",
  disconnected: "border-stone-700/50 bg-stone-900/40",
  error: "border-red-700/50 bg-red-950/20",
  needs_test: "border-amber-600/50 bg-amber-950/20",
  missing_key: "border-stone-700/50 bg-stone-900/40",
};

const BADGE_STYLES: Record<ProviderRow["cardStatus"], string> = {
  connected: "bg-emerald-700 text-white",
  disconnected: "bg-stone-600 text-stone-100",
  error: "bg-red-700 text-white",
  needs_test: "bg-amber-600 text-white",
  missing_key: "bg-stone-600 text-stone-200",
};

export function PlatformAiBrainHub() {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ProviderRow | null>(null);
  const [form, setForm] = useState({ apiKey: "", modelId: "", roleAssignments: [] as string[] });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/platform/ai-providers/status")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session?.user?.isPlatformAdmin) load();
    else setLoading(false);
  }, [session, load]);

  async function post(path: string, body: object) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل الطلب");
    return data;
  }

  async function handleTest(p: ProviderRow) {
    setBusy(`test-${p.key}`);
    setMsg("");
    try {
      await post("/api/platform/ai-providers/test", { providerKey: p.key });
      setMsg(`✓ اختبار ${p.nameAr} ناجح`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل الاختبار");
    } finally {
      setBusy("");
    }
  }

  async function handleDisconnect(p: ProviderRow) {
    if (!confirm(`فصل ${p.nameAr}؟`)) return;
    setBusy(`disc-${p.key}`);
    try {
      await post("/api/platform/ai-providers/disconnect", { providerKey: p.key });
      setMsg(`تم فصل ${p.nameAr}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل");
    } finally {
      setBusy("");
    }
  }

  async function handleSave(testOnly = false) {
    if (!modal) return;
    setBusy(testOnly ? "modal-test" : "modal-save");
    setMsg("");
    try {
      if (testOnly) {
        await post("/api/platform/ai-providers/test", {
          providerKey: modal.key,
          ...(form.apiKey ? { apiKey: form.apiKey } : {}),
        });
        setMsg("✓ اختبار الاتصال ناجح");
      } else {
        if (!form.apiKey.trim() && !modal.hasSecret) {
          throw new Error("API Key مطلوب");
        }
        await post("/api/platform/ai-providers/connect", {
          providerKey: modal.key,
          apiKey: form.apiKey.trim() || "KEEP",
          modelId: form.modelId,
          roleAssignments: form.roleAssignments,
          testAfterSave: Boolean(form.apiKey.trim()),
        });
        setMsg(`تم حفظ إعدادات ${modal.nameAr}`);
        setModal(null);
        setForm({ apiKey: "", modelId: "", roleAssignments: [] });
      }
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل");
    } finally {
      setBusy("");
    }
  }

  function openModal(p: ProviderRow) {
    setModal(p);
    setForm({
      apiKey: "",
      modelId: p.modelId || p.defaultModel,
      roleAssignments: p.roleAssignments ?? [],
    });
    setMsg("");
  }

  if (loading) return <MkLoading />;

  if (!session?.user?.isPlatformAdmin) {
    return (
      <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-6 text-center" dir="rtl">
        <p className="font-semibold">صلاحية مالك المنصة فقط</p>
        <p className="mt-2 text-sm opacity-70">لا يمكن لحساب المطعم العادي إدارة مفاتيح AI Brain</p>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <MkPageHeader
        title="AI Brain — مزودو الذكاء الاصطناعي"
        desc="ربط مزودي المنصة — المفاتيح مشفّرة على الخادم فقط · Platform Owner"
      />
      <p className="mb-4 text-xs text-stone-400">
        <Link href="/dashboard/marketing/ai-brain" className="underline">
          ← AI Marketing Brain
        </Link>
      </p>
      {msg && (
        <p className="mb-3 rounded-lg border border-stone-700 px-3 py-2 text-sm text-amber-300">{msg}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((p) => (
          <MkCard key={p.key} className={CARD_STYLES[p.cardStatus]}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">{p.nameAr}</h3>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs ${BADGE_STYLES[p.cardStatus]}`}>
                  {p.statusLabelAr}
                </span>
              </div>
            </div>
            <div className="mb-3 space-y-1 text-xs opacity-80">
              <p>الموديل: {p.modelId || p.defaultModel}</p>
              {p.lastSuccessAt && (
                <p>آخر اختبار ناجح: {new Date(p.lastSuccessAt).toLocaleString("ar-SA")}</p>
              )}
              {p.lastTestAt && !p.lastSuccessAt && (
                <p>آخر محاولة: {new Date(p.lastTestAt).toLocaleString("ar-SA")}</p>
              )}
              {p.lastError && <p className="text-red-400">{p.lastError}</p>}
              {p.roleAssignments.length > 0 && (
                <p>
                  مهام:{" "}
                  {p.roleAssignments
                    .map((id) => PLATFORM_BRAIN_ROLES.find((r) => r.id === id)?.labelAr ?? id)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openModal(p)}
                className="rounded bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-500"
              >
                {p.hasSecret ? "تحديث المفتاح" : "إعداد الربط"}
              </button>
              {p.hasSecret && (
                <>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => handleTest(p)}
                    className="rounded border border-stone-600 px-3 py-1.5 text-xs hover:bg-stone-800"
                  >
                    اختبار الاتصال
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => handleDisconnect(p)}
                    className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30"
                  >
                    فصل الاتصال
                  </button>
                </>
              )}
            </div>
          </MkCard>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <MkCard className="max-h-[90vh] w-full max-w-md overflow-y-auto">
            <h3 className="mb-1 text-lg font-bold">إعداد الربط — {modal.nameAr}</h3>
            <p className="mb-4 text-xs opacity-60">المفتاح يُحفظ مشفّراً — لا يُعرض بعد الحفظ</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">API Key</label>
                <input
                  type="password"
                  dir="ltr"
                  autoComplete="off"
                  placeholder={modal.hasSecret ? "•••••••• (اتركه فارغاً للإبقاء)" : "sk-..."}
                  className="w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-sm"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">الموديل</label>
                <select
                  className="w-full rounded border border-stone-600 bg-stone-950 px-3 py-2 text-sm"
                  value={form.modelId}
                  onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                >
                  {modal.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.labelAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">تفعيل للمهام</label>
                <div className="space-y-1">
                  {PLATFORM_BRAIN_ROLES.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.roleAssignments.includes(r.id)}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            roleAssignments: e.target.checked
                              ? [...form.roleAssignments, r.id]
                              : form.roleAssignments.filter((x) => x !== r.id),
                          });
                        }}
                      />
                      {r.labelAr}
                    </label>
                  ))}
                </div>
              </div>
              <a
                href={modal.keyCreateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-amber-400 underline"
              >
                إنشاء مفتاح API →
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy === "modal-save"}
                onClick={() => handleSave(false)}
                className="flex-1 rounded bg-amber-600 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
              >
                حفظ
              </button>
              <button
                type="button"
                disabled={busy === "modal-test"}
                onClick={() => handleSave(true)}
                className="rounded border border-stone-600 px-4 py-2 text-sm hover:bg-stone-800 disabled:opacity-50"
              >
                اختبار الاتصال
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded border border-stone-600 px-4 py-2 text-sm"
              >
                إلغاء
              </button>
            </div>
          </MkCard>
        </div>
      )}
    </div>
  );
}
