"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { WhatsAppEmbeddedSignup } from "@/components/marketing/whatsapp-embedded-signup";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const PROGRESS = [
  { n: 1, title: "Meta" },
  { n: 2, title: "اختيار الحساب" },
  { n: 3, title: "اختيار الرقم" },
  { n: 4, title: "المزامنة" },
  { n: 5, title: "اختبار" },
  { n: 6, title: "اكتمل" },
];

const LEARN_MORE_URL = "https://developers.facebook.com/docs/whatsapp/embedded-signup";

type WizardState = {
  step: number;
  oauthReady: boolean;
  platformTokenReady?: boolean;
  hasOAuthSession: boolean;
  metaAppId?: string | null;
  embeddedSignupConfigId?: string | null;
  discovered: {
    phones: Array<{
      id: string;
      displayPhone: string;
      verifiedName: string;
      wabaId: string;
      businessName: string;
    }>;
  };
  selected: {
    wabaId?: string;
    phoneNumberId?: string;
    businessName?: string;
    displayPhone?: string;
  };
  connection: { connected: boolean } | null;
  webhookReady: boolean;
  features: Record<string, boolean>;
  templates: Array<{ name: string; status: string }>;
  wizardCompleted: boolean;
  permissions: { canEdit: boolean };
  metaOAuth: { ready: boolean; status: string };
};

function displayStep(internalStep: number, hasPhone: boolean, connected: boolean): number {
  if (connected || internalStep >= 8) return 6;
  if (internalStep >= 7) return 5;
  if (internalStep >= 4) return 4;
  if (internalStep === 3) return hasPhone ? 3 : 2;
  if (internalStep >= 2 || internalStep === 1) return 1;
  return 1;
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "تم إلغاء تسجيل الدخول — يمكنك المحاولة مرة أخرى",
  not_configured: "خدمة الربط غير مفعّلة بعد — تواصل مع مسؤول المنصة",
  invalid_state: "انتهت صلاحية الجلسة — أعد المحاولة",
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
    return data;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const s = Number(searchParams.get("step"));
    if (s >= 1 && s <= 8) setStep(s);
    const err = searchParams.get("error");
    if (err) {
      setError(ERROR_MESSAGES[err] || decodeURIComponent(err));
    }
    if (searchParams.get("oauth") === "success") {
      setMessage("تم اكتشاف حسابات WhatsApp من المنصة");
      load();
    }
  }, [searchParams, load]);

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
      setState((prev) => ({
        ...prev!,
        ...data.state,
        oauthReady: data.oauthReady ?? prev!.oauthReady,
        metaAppId: data.metaAppId ?? prev!.metaAppId,
        embeddedSignupConfigId: data.embeddedSignupConfigId ?? prev!.embeddedSignupConfigId,
      }));
      setStep(data.state.step || step);
    }
    if (data.message) setMessage(data.message);
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

  const progress = displayStep(
    step,
    Boolean(state.selected.phoneNumberId),
    Boolean(state.connection?.connected || state.wizardCompleted)
  );

  const platformReady = state.oauthReady && state.platformTokenReady !== false;
  const embeddedReady = Boolean(state.metaAppId && state.embeddedSignupConfigId);
  const showPendingSetup = !platformReady && step <= 2 && !state.hasOAuthSession;
  const showReadyConnect = platformReady && !state.connection?.connected && step <= 4;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <MkPageHeader
        title="ربط واتساب الأعمال"
        desc="Meta Embedded Signup — ربط رقم WhatsApp Business الحالي (Coexistence) بدون نقل الرقم"
        production
      />
      <Link href="/dashboard/marketing/whatsapp" className="text-sm text-emerald-400 hover:underline">
        ← واتساب الأعمال
      </Link>

      <div className="flex flex-wrap gap-2">
        {PROGRESS.map((s) => (
          <span
            key={s.n}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              progress === s.n
                ? "bg-emerald-600 text-white"
                : progress > s.n
                  ? "bg-emerald-950 text-emerald-300"
                  : "bg-stone-800 text-stone-400"
            )}
          >
            {s.n}. {s.title}
          </span>
        ))}
      </div>

      {message && <p className="rounded bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p>}
      {error && <p className="rounded bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>}

      {showPendingSetup && (
        <MkCard className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-white">إعداد خدمة واتساب</h2>
            <p className="mt-2 text-sm text-gray-300">
              يحتاج النظام إلى تفعيل App ID/Secret وWhatsApp Access Token بواسطة مسؤول المنصة.
            </p>
          </div>
          <p className="text-lg">🟡 بانتظار التفعيل</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" loading={busy} onClick={() => post("recheck_oauth")}>
              إعادة التحقق
            </Button>
            <Button variant="outline" loading={busy} onClick={() => post("notify_platform_admin")}>
              إشعار مسؤول المنصة
            </Button>
            <a href={LEARN_MORE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Learn More</Button>
            </a>
          </div>
        </MkCard>
      )}

      {showReadyConnect && (
        <MkCard className="space-y-5 text-center">
          <p className="text-lg">🟢 جاهز للربط على Production</p>
          <p className="text-sm text-gray-400">
            استخدم Embedded Signup لربط رقم WhatsApp Business الحالي (Coexistence) — أو الاكتشاف التلقائي من
            توكن المنصة
          </p>
          {embeddedReady ? (
            <WhatsAppEmbeddedSignup
              appId={state.metaAppId!}
              configId={state.embeddedSignupConfigId!}
              disabled={busy}
              onComplete={async (payload) => {
                const data = await post("embedded_signup_complete", payload);
                if (data) {
                  setStep(4);
                  setMessage("تم ربط WhatsApp Business بنجاح");
                  await post("sync_all");
                }
              }}
              onError={(msg) => setError(msg)}
            />
          ) : (
            <p className="text-sm text-amber-300">
              META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID غير مضبوط — استخدم الاكتشاف من المنصة
            </p>
          )}
          <Button
            variant="outline"
            loading={busy}
            onClick={async () => {
              const data = await post("connect_from_platform");
              if (data) {
                setStep(4);
                setMessage("تم الربط من إعدادات المنصة");
              }
            }}
          >
            ربط تلقائي من Platform Token (Fabrika / WABA)
          </Button>
          <Button
            variant="outline"
            loading={busy}
            onClick={async () => {
              const data = await post("discover_platform");
              if (data?.discovered?.phones?.length) {
                setStep(data.state?.step || 3);
                setMessage(`تم اكتشاف ${data.discovered.phones.length} رقم`);
              }
            }}
          >
            اكتشاف حسابات WABA
          </Button>
        </MkCard>
      )}

      {(state.hasOAuthSession || step >= 3) && !state.connection?.connected && step < 8 && (
        <>
          {step === 3 && state.discovered.phones.length > 1 && (
            <MkCard className="space-y-4">
              <h2 className="text-xl font-semibold text-white">اختر حساب واتساب</h2>
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
                  </button>
                ))}
              </div>
            </MkCard>
          )}

          {(step === 4 || (step === 3 && state.selected.phoneNumberId)) && (
            <MkCard className="space-y-4">
              <h2 className="text-xl font-semibold text-white">تأكيد الرقم</h2>
              <div className="space-y-1 rounded bg-stone-900 p-3 text-sm text-gray-300">
                <p>
                  <strong>الاسم:</strong> {state.selected.businessName}
                </p>
                <p dir="ltr">
                  <strong>الرقم:</strong> {state.selected.displayPhone}
                </p>
              </div>
              <Button
                loading={busy}
                onClick={async () => {
                  const data = await post("sync_all");
                  if (data) {
                    setStep(7);
                    setMessage(`تمت المزامنة — ${data.templateCount ?? 0} قالب`);
                  }
                }}
              >
                متابعة المزامنة
              </Button>
            </MkCard>
          )}

          {step >= 5 && step <= 7 && state.selected.phoneNumberId && (
            <MkCard className="space-y-4">
              <h2 className="text-xl font-semibold text-white">اختبار الإرسال</h2>
              <p className="text-sm text-gray-400">أرسل رسالة تجريبية للتأكد من أن كل شيء يعمل</p>
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
                  if (data?.ok) setStep(8);
                }}
              >
                إرسال رسالة تجريبية
              </Button>
            </MkCard>
          )}
        </>
      )}

      {(step >= 8 || state.wizardCompleted || state.connection?.connected) && step >= 7 && (
        <MkCard className="space-y-5 text-center">
          <p className="text-4xl">🎉</p>
          <h2 className="text-xl font-semibold text-white">تم ربط واتساب الأعمال بنجاح</h2>
          <div className="space-y-2 text-right text-sm text-gray-300">
            {(
              [
                ["afterVisit", "رسائل بعد الزيارة"],
                ["reservation", "إشعارات الحجوزات"],
                ["gift", "إشعارات الإهداء"],
                ["order", "إشعارات الطلبات"],
                ["review", "طلبات التقييم"],
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
            إنهاء الإعداد
          </Button>
          <Link href="/dashboard/marketing/whatsapp" className="block text-emerald-400">
            الانتقال إلى لوحة واتساب ←
          </Link>
        </MkCard>
      )}
    </div>
  );
}
