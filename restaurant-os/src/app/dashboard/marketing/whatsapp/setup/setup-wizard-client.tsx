"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, title: "مرحباً" },
  { n: 2, title: "Meta" },
  { n: 3, title: "اختيار الحساب" },
  { n: 4, title: "الحفظ" },
  { n: 5, title: "Webhook" },
  { n: 6, title: "القوالب" },
  { n: 7, title: "اختبار" },
  { n: 8, title: "إنهاء" },
];

type WizardState = {
  step: number;
  oauthConfigured: boolean;
  discovered: { phones: Array<{ id: string; displayPhone: string; verifiedName: string; wabaId: string; businessName: string }> };
  selected: { wabaId?: string; phoneNumberId?: string; businessName?: string; displayPhone?: string };
  connection: { connected: boolean } | null;
  webhook: { url: string; verifyToken: string | null; verified: boolean };
  features: Record<string, boolean>;
  templates: Array<{ name: string; status: string; language: string; category: string }>;
  permissions: { canEdit: boolean };
  metaOAuth: { configured: boolean; status: string };
};

export default function SetupWizardClient() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<WizardState | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [webhookOk, setWebhookOk] = useState<boolean | null>(null);
  const [features, setFeatures] = useState({
    afterVisit: true,
    reservation: false,
    gift: false,
    order: false,
    review: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/marketing/whatsapp/setup");
    const data = await res.json();
    if (res.ok) {
      setState(data);
      setStep(data.step || 1);
      setFeatures(data.features || features);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const s = Number(searchParams.get("step"));
    if (s >= 1 && s <= 8) setStep(s);
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
    if (searchParams.get("oauth") === "success") setMessage("تم تسجيل الدخول إلى Meta بنجاح");
  }, [searchParams]);

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/marketing/whatsapp/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "فشل");
      return null;
    }
    if (data.state) {
      setState((prev) => ({ ...prev!, ...data.state }));
      setStep(data.state.step || step);
    }
    return data;
  }

  if (loading) return <MkLoading />;
  if (!state?.permissions.canEdit) {
    return (
      <MkCard>
        <p className="text-amber-200">صلاحية المالك فقط لإعداد واتساب الأعمال.</p>
        <Link href="/dashboard/marketing/whatsapp" className="mt-4 inline-block text-emerald-400">
          ← العودة
        </Link>
      </MkCard>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <MkPageHeader
        title="معالج ربط WhatsApp Business"
        desc="اربط حسابك في أقل من دقيقتين — بدون نسخ IDs يدوياً"
      />
      <Link href="/dashboard/marketing/whatsapp" className="text-sm text-emerald-400 hover:underline">
        ← واتساب الأعمال
      </Link>

      <div className="flex flex-wrap gap-1">
        {STEPS.map((s) => (
          <span
            key={s.n}
            className={cn(
              "rounded-full px-2 py-1 text-xs",
              step === s.n ? "bg-emerald-600 text-white" : "bg-stone-800 text-stone-400"
            )}
          >
            {s.n}. {s.title}
          </span>
        ))}
      </div>

      {message && <p className="rounded bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>}

      {step === 1 && (
        <MkCard className="space-y-4">
          <h2 className="text-xl font-semibold text-white">مرحباً</h2>
          <p className="text-sm text-gray-300">سيساعدك هذا المعالج على:</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
            <li>رسائل واتساب بعد الزيارة</li>
            <li>طلبات التقييم</li>
            <li>إشعارات الحجوزات</li>
            <li>إشعارات الإهداء</li>
            <li>إشعارات الطلبات</li>
          </ul>
          <Button
            onClick={async () => {
              await post("set_step", { step: 2 });
              setStep(2);
            }}
          >
            ابدأ الربط
          </Button>
        </MkCard>
      )}

      {step === 2 && (
        <MkCard className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Connect Meta Account</h2>
          {!state.oauthConfigured ? (
            <p className="text-amber-300 text-sm">
              Meta OAuth غير مُعد — أضف WHATSAPP_META_CLIENT_ID / META_ADS_CLIENT_ID في Vercel
            </p>
          ) : (
            <p className="text-sm text-gray-400">Facebook Login — اكتشاف تلقائي لحسابات WABA</p>
          )}
          <a href="/api/marketing/whatsapp/oauth/start">
            <Button disabled={!state.oauthConfigured}>Connect with Facebook</Button>
          </a>
        </MkCard>
      )}

      {step === 3 && (
        <MkCard className="space-y-4">
          <h2 className="text-xl font-semibold text-white">اختر رقم واتساب</h2>
          {state.discovered.phones.length === 0 ? (
            <p className="text-sm text-gray-400">لم يُعثر على أرقام — تأكد من صلاحيات WABA في Meta</p>
          ) : (
            <div className="grid gap-3">
              {state.discovered.phones.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rounded border border-stone-600 p-4 text-right hover:border-emerald-500"
                  onClick={async () => {
                    await post("select_phone", { phoneNumberId: p.id });
                    setStep(4);
                    setMessage(`تم اختيار ${p.displayPhone || p.verifiedName}`);
                  }}
                >
                  <p className="font-medium text-white">{p.verifiedName || p.businessName}</p>
                  <p className="text-sm text-gray-400" dir="ltr">
                    {p.displayPhone}
                  </p>
                  <p className="text-xs text-gray-500">WABA: {p.wabaId}</p>
                </button>
              ))}
            </div>
          )}
        </MkCard>
      )}

      {step === 4 && (
        <MkCard className="space-y-4">
          <h2 className="text-xl font-semibold text-white">تم اكتشاف الحساب تلقائياً</h2>
          <div className="rounded bg-stone-900 p-3 text-sm text-gray-300 space-y-1">
            <p><strong>WABA ID:</strong> <span dir="ltr">{state.selected.wabaId}</span></p>
            <p><strong>Phone Number ID:</strong> <span dir="ltr">{state.selected.phoneNumberId}</span></p>
            <p><strong>Business Name:</strong> {state.selected.businessName}</p>
            <p dir="ltr"><strong>Phone:</strong> {state.selected.displayPhone}</p>
          </div>
          <Button
            loading={busy}
            onClick={async () => {
              const data = await post("save_connection");
              if (data) {
                setStep(5);
                setMessage("تم حفظ Access Token و Verify Token مشفر");
              }
            }}
          >
            Save & Encrypt Tokens
          </Button>
        </MkCard>
      )}

      {step === 5 && (
        <MkCard className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Webhook</h2>
          <label className="block text-sm text-gray-400">
            Webhook URL
            <input readOnly value={state.webhook.url} className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-xs" dir="ltr" />
          </label>
          <label className="block text-sm text-gray-400">
            Verify Token
            <input
              readOnly
              value={state.webhook.verifyToken || "Generated on save"}
              className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-xs"
              dir="ltr"
            />
          </label>
          <p className="text-xs text-amber-300">
            أضف نفس Verify Token في Meta Developer Console → WhatsApp → Configuration
          </p>
          <Button
            loading={busy}
            variant="outline"
            onClick={async () => {
              const data = await post("verify_webhook");
              setWebhookOk(data?.ok ?? false);
              if (data?.ok) {
                setStep(6);
                setMessage("🟢 Connected — Webhook subscribed");
              } else {
                setMessage("🔴 Failed — تحقق من صلاحيات WABA");
              }
            }}
          >
            Verify Connection
          </Button>
          {webhookOk !== null && (
            <p className="text-lg">{webhookOk ? "🟢 Connected" : "🔴 Failed"}</p>
          )}
        </MkCard>
      )}

      {step === 6 && (
        <MkCard className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Sync Templates</h2>
          <div className="flex gap-2">
            <Button
              loading={busy}
              onClick={async () => {
                const data = await post("sync_templates");
                if (data) setMessage(`تمت مزامنة ${data.templates?.length ?? 0} قالب`);
              }}
            >
              Sync Templates
            </Button>
            <Button variant="outline" loading={busy} onClick={() => load()}>
              Refresh
            </Button>
          </div>
          {state.templates.length > 0 && (
            <div className="space-y-2 text-sm">
              {["APPROVED", "PENDING", "REJECTED"].map((st) => {
                const count = state.templates.filter((t) => t.status === st).length;
                return (
                  <p key={st} className="text-gray-300">
                    {st}: {count}
                  </p>
                );
              })}
            </div>
          )}
          <Button variant="outline" onClick={() => setStep(7)}>
            التالي — اختبار الإرسال
          </Button>
        </MkCard>
      )}

      {step === 7 && (
        <MkCard className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Send Test Message</h2>
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="9665XXXXXXXX"
            className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2"
            dir="ltr"
          />
          <Button
            loading={busy}
            onClick={async () => {
              const data = await post("test_send", { testPhone });
              setTestStatus(data?.status || "FAILED");
              if (data?.ok) setStep(8);
            }}
          >
            Send Test
          </Button>
          {testStatus && (
            <p className="text-sm text-gray-300">
              Status: {testStatus} — track Queued → Sent → Delivered → Read in dashboard
            </p>
          )}
        </MkCard>
      )}

      {step === 8 && (
        <MkCard className="space-y-4 text-center">
          <p className="text-3xl">🎉</p>
          <h2 className="text-xl font-semibold text-white">WhatsApp Connected Successfully</h2>
          <div className="space-y-2 text-right text-sm text-gray-300">
            {(
              [
                ["afterVisit", "After Visit Automation"],
                ["reservation", "Reservation Messages"],
                ["gift", "Gift Notifications"],
                ["order", "Order Notifications"],
                ["review", "Review Requests"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={features[key]}
                  onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <Button
            loading={busy}
            onClick={async () => {
              await post("finish", { features });
              setMessage("تم تفعيل الأتمتة");
            }}
          >
            Finish Setup
          </Button>
          <Link href="/dashboard/marketing/whatsapp" className="block text-emerald-400">
            Go to Dashboard →
          </Link>
        </MkCard>
      )}
    </div>
  );
}
