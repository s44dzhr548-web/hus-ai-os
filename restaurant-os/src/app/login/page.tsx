"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@menuos.sa");
  const [password, setPassword] = useState("admin123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        if (result.error === "database_timeout") {
          setError("قاعدة البيانات غير متصلة. شغّل PostgreSQL ثم npm run db:seed");
        } else {
          setError("البريد أو كلمة المرور غير صحيحة");
        }
        setLoading(false);
        return;
      }

      if (result?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const sess = await sessionRes.json();
        const target = sess?.user?.isPlatformAdmin ? "/dashboard/platform" : "/dashboard";
        window.location.href = target;
        return;
      }

      setError("حدث خطأ أثناء تسجيل الدخول");
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من قاعدة البيانات.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 to-emerald-700 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Menu OS</h1>
          <p className="mt-2 text-sm text-gray-500">تسجيل الدخول إلى لوحة التحكم</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
            autoComplete="email"
          />
          <Input
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            dir="ltr"
            autoComplete="current-password"
          />
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            دخول
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/register" className="text-emerald-600 hover:underline">
            إنشاء حساب جديد
          </Link>
          {" · "}
          <Link href="/" className="text-emerald-600 hover:underline">
            العودة للرئيسية
          </Link>
        </p>
      </Card>
    </div>
  );
}
