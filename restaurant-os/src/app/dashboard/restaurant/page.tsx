"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Input,
  Textarea,
  Button,
  LoadingSpinner,
} from "@/components/ui";

interface Restaurant {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  address?: string;
  addressAr?: string;
}

export default function RestaurantPage() {
  const [form, setForm] = useState<Restaurant>({
    id: "",
    name: "",
    nameAr: "",
    description: "",
    phone: "",
    email: "",
    logoUrl: "",
    address: "",
    addressAr: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]) {
          setForm(data[0]);
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
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMessage(res.ok ? "تم الحفظ بنجاح" : "حدث خطأ أثناء الحفظ");
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="إعدادات المطعم" description="بيانات المطعم الأساسية" />

      <Card>
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="اسم المطعم (عربي)"
            value={form.nameAr || ""}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value, name: e.target.value })}
          />
          <Input
            label="الهاتف"
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            dir="ltr"
          />
          <Input
            label="رابط الشعار"
            value={form.logoUrl || ""}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            dir="ltr"
          />
          <div className="sm:col-span-2">
            <Input
              label="العنوان"
              value={form.addressAr || form.address || ""}
              onChange={(e) =>
                setForm({ ...form, addressAr: e.target.value, address: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="الوصف"
              rows={3}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {form.logoUrl && (
            <div className="sm:col-span-2">
              <img
                src={form.logoUrl}
                alt="الشعار"
                className="h-20 w-20 rounded-xl object-cover"
              />
            </div>
          )}
          {message && (
            <p className="sm:col-span-2 text-sm text-emerald-600">{message}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving}>
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
