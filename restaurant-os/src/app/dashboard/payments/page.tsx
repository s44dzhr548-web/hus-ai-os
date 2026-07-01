"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  LoadingSpinner,
  Badge,
} from "@/components/ui";

const PROVIDERS = [
  { id: "MOYASAR", label: "Moyasar" },
  { id: "TAP", label: "Tap Payments" },
  { id: "STRIPE", label: "Stripe" },
];

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    defaultPaymentProvider: "MOYASAR",
    moyasarKeySource: "environment" as string,
    moyasarConfigured: false,
    moyasarPublishableKey: "",
    tapPublishableKey: "",
    tapSecretKey: "",
    stripePublishableKey: "",
    stripeSecretKey: "",
    paymentTestMode: false,
    whatsappNumber: "",
  });

  useEffect(() => {
    fetch("/api/restaurants/payment-settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          defaultPaymentProvider: data.defaultPaymentProvider || "MOYASAR",
          moyasarKeySource: data.moyasarKeySource || "environment",
          moyasarConfigured: Boolean(data.moyasarConfigured),
          moyasarPublishableKey: data.moyasarPublishableKey || "",
          tapPublishableKey: data.tapPublishableKey || "",
          tapSecretKey: data.tapSecretKey || "",
          stripePublishableKey: data.stripePublishableKey || "",
          stripeSecretKey: data.stripeSecretKey || "",
          paymentTestMode: data.paymentTestMode ?? false,
          whatsappNumber: data.whatsappNumber || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const payload = {
      defaultPaymentProvider: form.defaultPaymentProvider,
      tapPublishableKey: form.tapPublishableKey,
      tapSecretKey: form.tapSecretKey,
      stripePublishableKey: form.stripePublishableKey,
      stripeSecretKey: form.stripeSecretKey,
      paymentTestMode: form.paymentTestMode,
      whatsappNumber: form.whatsappNumber,
    };
    await fetch("/api/restaurants/payment-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSaved(true);
  }

  if (loading) return <LoadingSpinner />;

  const isMoyasar = form.defaultPaymentProvider === "MOYASAR";

  return (
    <div>
      <PageHeader
        title="إعدادات الدفع"
        description="Moyasar يُدار عبر مفاتيح المنصة في Vercel — لا تُخزَّن في قاعدة البيانات"
      />

      <Card className="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">مزود الدفع الافتراضي</label>
            <select
              value={form.defaultPaymentProvider}
              onChange={(e) =>
                setForm({ ...form, defaultPaymentProvider: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
            <legend className="px-2 font-semibold">Moyasar (من متغيرات البيئة)</legend>
            {isMoyasar ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={form.moyasarConfigured ? "success" : "warning"}>
                    {form.moyasarConfigured ? "مُعدّ" : "غير مُعدّ"}
                  </Badge>
                  <span className="text-gray-600">MOYASAR_PUBLISHABLE_KEY</span>
                </div>
                {form.moyasarPublishableKey ? (
                  <p className="font-mono text-xs break-all" dir="ltr">
                    {form.moyasarPublishableKey.slice(0, 16)}...
                  </p>
                ) : (
                  <p className="text-amber-800">
                    أضف MOYASAR_PUBLISHABLE_KEY و MOYASAR_SECRET_KEY في Vercel
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  يدعم: Mada · Visa · Mastercard · Apple Pay
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Moyasar غير مفعّل — اختر Moyasar كمزود أو استخدم Tap/Stripe أدناه
              </p>
            )}
          </fieldset>

          {!isMoyasar && (
            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-2 font-semibold">Tap Payments</legend>
              <Input
                label="Publishable Key"
                value={form.tapPublishableKey}
                onChange={(e) =>
                  setForm({ ...form, tapPublishableKey: e.target.value })
                }
              />
              <Input
                label="Secret Key"
                type="password"
                value={form.tapSecretKey}
                onChange={(e) =>
                  setForm({ ...form, tapSecretKey: e.target.value })
                }
              />
            </fieldset>
          )}

          {!isMoyasar && (
            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-2 font-semibold">Stripe</legend>
              <Input
                label="Publishable Key"
                value={form.stripePublishableKey}
                onChange={(e) =>
                  setForm({ ...form, stripePublishableKey: e.target.value })
                }
              />
              <Input
                label="Secret Key"
                type="password"
                value={form.stripeSecretKey}
                onChange={(e) =>
                  setForm({ ...form, stripeSecretKey: e.target.value })
                }
              />
            </fieldset>
          )}

          <Input
            label="رقم واتساب المطعم"
            value={form.whatsappNumber}
            onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
            placeholder="+9665xxxxxxxx"
          />

          {saved && (
            <p className="text-sm text-emerald-600">تم حفظ الإعدادات بنجاح</p>
          )}

          <Button type="submit" loading={saving}>
            حفظ الإعدادات
          </Button>
        </form>
      </Card>
    </div>
  );
}
