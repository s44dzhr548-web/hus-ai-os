"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MkBadge, MkCard, MkLoading, MkPageHeader } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui";
import { DEFAULT_MESSAGE_BODY } from "@/lib/after-visit-whatsapp/types";

type DeliveryRow = {
  id: string;
  status: string;
  phone: string;
  templateName: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedReason: string | null;
  reviewUrl: string | null;
  createdAt: string;
  visit?: { customerName: string; tableDisplayNumber: string | null };
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "في الانتظار",
  SENT: "تم الإرسال",
  DELIVERED: "تم التسليم",
  READ: "مقروء",
  FAILED: "فشل",
  OPTED_OUT: "إلغاء اشتراك",
  SKIPPED_NO_CONSENT: "بدون موافقة",
  SKIPPED_NO_PHONE: "بدون جوال",
  SKIPPED_NO_CONNECTION: "بدون ربط واتساب",
  SKIPPED_DISABLED: "الأتمتة متوقفة",
  SKIPPED_DUPLICATE: "مكرر",
};

export default function AfterVisitWhatsAppPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [automation, setAutomation] = useState({
    isEnabled: false,
    delayMinutes: 5,
    templateName: "after_visit_thank_you",
    messageBody: DEFAULT_MESSAGE_BODY,
    reviewLinkBase: "",
    branchId: "",
    testPhone: "",
  });
  const [connection, setConnection] = useState({
    phoneNumberId: "",
    wabaId: "",
    businessPhone: "",
    accessToken: "",
    templateLanguage: "ar",
    isActive: true,
    hasToken: false,
  });
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [delayOptions, setDelayOptions] = useState<{ minutes: number; labelAr: string }[]>([]);
  const [encryptionReady, setEncryptionReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/marketing/automations/after-visit");
    const data = await res.json();
    if (res.ok) {
      setAutomation({
        isEnabled: data.automation.isEnabled,
        delayMinutes: data.automation.delayMinutes,
        templateName: data.automation.templateName,
        messageBody: data.automation.messageBody || DEFAULT_MESSAGE_BODY,
        reviewLinkBase: data.automation.reviewLinkBase || "",
        branchId: data.automation.branchId || "",
        testPhone: data.automation.testPhone || "",
      });
      if (data.connection) {
        setConnection((c) => ({
          ...c,
          phoneNumberId: data.connection.phoneNumberId || "",
          wabaId: data.connection.wabaId || "",
          businessPhone: data.connection.businessPhone || "",
          templateLanguage: data.connection.templateLanguage || "ar",
          isActive: data.connection.isActive,
          hasToken: data.connection.hasToken,
        }));
      }
      setDeliveries(data.deliveries || []);
      setBranches(data.branches || []);
      setDelayOptions(data.delayOptions || []);
      setEncryptionReady(data.encryptionReady);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAutomation() {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/marketing/automations/after-visit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(automation),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "فشل الحفظ");
      return;
    }
    setMessage("تم حفظ إعدادات الأتمتة");
  }

  async function saveConnection() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/marketing/automations/after-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_connection",
        ...connection,
        templateName: automation.templateName,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "فشل حفظ الاتصال");
      return;
    }
    setMessage("تم حفظ اتصال WhatsApp Business");
    load();
  }

  async function sendTest() {
    setTesting(true);
    setError("");
    const res = await fetch("/api/marketing/automations/after-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "test_send",
        testPhone: automation.testPhone,
      }),
    });
    const data = await res.json();
    setTesting(false);
    if (!res.ok) {
      setError(data.error || "فشل إرسال الاختبار");
      return;
    }
    setMessage(`تم إرسال رسالة الاختبار — ${data.messageId}`);
  }

  if (loading) return <MkLoading />;

  return (
    <div className="space-y-6 pb-10">
      <MkPageHeader
        title="أتمتة واتساب بعد الزيارة"
        desc="SESSION_COMPLETED — شكر العميل وتقييم الزيارة عبر WhatsApp Business Cloud API"
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard/marketing/automations" className="text-emerald-400 hover:underline">
          ← مركز الأتمتة
        </Link>
      </div>

      {message && (
        <p className="rounded border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <MkCard className="space-y-4">
        <h2 className="text-lg font-semibold text-white">إعدادات الأتمتة</h2>
        <label className="flex items-center gap-3 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={automation.isEnabled}
            onChange={(e) => setAutomation({ ...automation, isEnabled: e.target.checked })}
            className="h-4 w-4"
          />
          تفعيل رسالة الشكر بعد إنهاء الجلسة
        </label>
        <label className="block text-sm text-gray-300">
          التأخير قبل الإرسال
          <select
            value={automation.delayMinutes}
            onChange={(e) =>
              setAutomation({ ...automation, delayMinutes: parseInt(e.target.value, 10) })
            }
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
          >
            {delayOptions.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.labelAr}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-gray-300">
          الفرع (اختياري — فارغ = كل الفروع)
          <select
            value={automation.branchId}
            onChange={(e) => setAutomation({ ...automation, branchId: e.target.value })}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-gray-300">
          اسم القالب المعتمد (WhatsApp Template)
          <input
            value={automation.templateName}
            onChange={(e) => setAutomation({ ...automation, templateName: e.target.value })}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
            dir="ltr"
          />
        </label>
        <label className="block text-sm text-gray-300">
          نص الرسالة (متغيرات: {"{{1}}"} اسم العميل، {"{{2}}"} المطعم، {"{{3}}"} الطاولة، {"{{4}}"} رابط التقييم)
          <textarea
            rows={6}
            value={automation.messageBody}
            onChange={(e) => setAutomation({ ...automation, messageBody: e.target.value })}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="block text-sm text-gray-300">
          قاعدة رابط التقييم (اختياري)
          <input
            value={automation.reviewLinkBase}
            onChange={(e) => setAutomation({ ...automation, reviewLinkBase: e.target.value })}
            placeholder="https://restaurant-os-nine.vercel.app/r/slug/rate"
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
            dir="ltr"
          />
        </label>
        <Button onClick={saveAutomation} loading={saving}>
          حفظ الإعدادات
        </Button>
      </MkCard>

      <MkCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">WhatsApp Business Cloud API</h2>
          {connection.hasToken ? (
            <MkBadge type="real" />
          ) : (
            <MkBadge type="not_connected" />
          )}
        </div>
        {!encryptionReady && (
          <p className="text-xs text-amber-300">
            MARKETING_TOKEN_SECRET مطلوب لتشفير رمز الوصول (32+ حرف)
          </p>
        )}
        <label className="block text-sm text-gray-300">
          Phone Number ID
          <input
            value={connection.phoneNumberId}
            onChange={(e) => setConnection({ ...connection, phoneNumberId: e.target.value })}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
            dir="ltr"
          />
        </label>
        <label className="block text-sm text-gray-300">
          WABA ID (اختياري)
          <input
            value={connection.wabaId}
            onChange={(e) => setConnection({ ...connection, wabaId: e.target.value })}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
            dir="ltr"
          />
        </label>
        <label className="block text-sm text-gray-300">
          Access Token
          <input
            type="password"
            value={connection.accessToken}
            onChange={(e) => setConnection({ ...connection, accessToken: e.target.value })}
            placeholder={connection.hasToken ? "•••••••• (اتركه فارغاً للإبقاء)" : "EAA..."}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
            dir="ltr"
          />
        </label>
        <Button onClick={saveConnection} loading={saving} variant="outline">
          حفظ الاتصال
        </Button>
      </MkCard>

      <MkCard className="space-y-4">
        <h2 className="text-lg font-semibold text-white">إرسال تجريبي</h2>
        <label className="block text-sm text-gray-300">
          رقم الاختبار
          <input
            value={automation.testPhone}
            onChange={(e) => setAutomation({ ...automation, testPhone: e.target.value })}
            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2"
            dir="ltr"
            inputMode="tel"
          />
        </label>
        <Button onClick={sendTest} loading={testing}>
          إرسال رسالة اختبار
        </Button>
      </MkCard>

      <MkCard>
        <h2 className="mb-4 text-lg font-semibold text-white">نتائج التسليم</h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-gray-400">لا توجد رسائل بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700 text-xs uppercase text-gray-500">
                  <th className="py-2 pr-3">العميل</th>
                  <th className="py-2 pr-3">الجوال</th>
                  <th className="py-2 pr-3">الحالة</th>
                  <th className="py-2 pr-3">القالب</th>
                  <th className="py-2 pr-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-gray-800">
                    <td className="py-2 pr-3">{d.visit?.customerName || "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs" dir="ltr">
                      {d.phone}
                    </td>
                    <td className="py-2 pr-3">
                      <span title={d.failedReason || ""}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs">{d.templateName}</td>
                    <td className="py-2 pr-3 text-xs">
                      {new Date(d.sentAt || d.createdAt).toLocaleString("ar-SA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MkCard>
    </div>
  );
}
