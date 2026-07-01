"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";

export default function RegisterPage() {
  const [form, setForm] = useState({
    ownerName: "",
    email: "",
    password: "",
    restaurantName: "",
    restaurantNameAr: "",
    branchNameAr: "الفرع الرئيسي",
    city: "جدة",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "فشل التسجيل");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.ok) {
        window.location.href = "/dashboard/onboarding";
        return;
      }

      setError("تم إنشاء الحساب لكن فشل تسجيل الدخول. جرّب الدخول يدوياً.");
    } catch {
      setError("تعذر إتمام التسجيل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 to-emerald-700 p-4">
      <Card className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب Menu OS</h1>
          <p className="mt-2 text-sm text-gray-500">
            سجّل مطعمك وابدأ تجربة مجانية 14 يوم
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="اسمك"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            required
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            dir="ltr"
          />
          <Input
            label="كلمة المرور"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            dir="ltr"
          />
          <Input
            label="اسم المطعm (English)"
            value={form.restaurantName}
            onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
            required
            dir="ltr"
          />
          <Input
            label="اسم المطعm (عربي)"
            value={form.restaurantNameAr}
            onChange={(e) => setForm({ ...form, restaurantNameAr: e.target.value })}
          />
          <Input
            label="اسم الفرع الأول"
            value={form.branchNameAr}
            onChange={(e) => setForm({ ...form, branchNameAr: e.target.value })}
          />
          <Input
            label="المدينة"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="الجوال"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
          />
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            إنشاء الحساب
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          لديك حساب؟{" "}
          <Link href="/login" className="text-emerald-600 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </Card>
    </div>
  );
}
