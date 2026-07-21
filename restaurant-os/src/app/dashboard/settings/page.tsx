"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Input,
  Button,
  LoadingSpinner,
} from "@/components/ui";
import { getPlatformDomain } from "@/lib/domains";

interface SettingsForm {
  nameAr: string;
  email: string;
  phone: string;
  logoUrl: string;
  customDomain: string;
  timezone: string;
  currency: string;
  businessDayStartHour: number;
}

export default function OwnerSettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    nameAr: "",
    email: "",
    phone: "",
    logoUrl: "",
    customDomain: "",
    timezone: "Asia/Riyadh",
    currency: "SAR",
    businessDayStartHour: 4,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data) => {
        const r = Array.isArray(data) ? data[0] : data;
        if (r) {
          setForm({
            nameAr: r.nameAr || r.name || "",
            email: r.email || "",
            phone: r.phone || "",
            logoUrl: r.logoUrl || "",
            customDomain: r.customDomain || "",
            timezone: r.timezone || "Asia/Riyadh",
            currency: r.currency || "SAR",
            businessDayStartHour: r.businessDayStartHour ?? 4,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/restaurants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameAr: form.nameAr,
        name: form.nameAr,
        email: form.email,
        phone: form.phone,
        logoUrl: form.logoUrl,
        customDomain: form.customDomain || null,
        timezone: form.timezone,
        currency: form.currency,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "تم الحفظ" : "فشل الحفظ");
  }

  if (loading) return <LoadingSpinner />;

  const platformDomain = getPlatformDomain();

  return (
    <div>
      <PageHeader
        title="إعدادات المالك"
        description="إعدادات الحساب والنطاق المخصص"
      />
      <p className="mb-4 text-sm">
        <Link href="/dashboard/settings/ai" className="text-emerald-600 underline">
          الإعدادات → الذكاء الاصطناعي (AI Access)
        </Link>
      </p>

      <Card className="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="اسم المطعm"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
          />
          <Input
            label="البريد"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            dir="ltr"
          />
          <Input
            label="الجوال"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
          />
          <Input
            label="رابط الشعار"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            dir="ltr"
          />
          <Input
            label="المنطقة الزمنية"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            dir="ltr"
          />
          <Input
            label="بداية اليوم التشغيلي (ساعة)"
            value={String(form.businessDayStartHour)}
            readOnly
            disabled
            dir="ltr"
          />
          <p className="-mt-2 text-xs text-gray-500">
            اليوم التشغيلي من {form.businessDayStartHour}:00 صباحًا حتى 3:59 صباحًا من اليوم التالي.
            لا يمكن تغيير هذا الإعداد حاليًا.
          </p>
          <Input
            label="العملة"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            dir="ltr"
          />

          <div className="rounded-lg border border-gray-200 p-4">
            <Input
              label="نطاق مخصص (Custom Domain)"
              value={form.customDomain}
              onChange={(e) =>
                setForm({ ...form, customDomain: e.target.value })
              }
              placeholder="menu.yourrestaurant.com"
              dir="ltr"
            />
            <p className="mt-2 text-xs text-gray-500">
              أضف CNAME يشير إلى {platformDomain} ثم أدخل النطاق هنا.
              مثال: menu.example.com
            </p>
          </div>

          {message && (
            <p className="text-sm text-emerald-600">{message}</p>
          )}

          <Button type="submit" loading={saving}>
            حفظ الإعدادات
          </Button>
        </form>
      </Card>
    </div>
  );
}
