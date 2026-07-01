"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { planList } from "@/lib/subscription-limits";

const plans = planList();

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">خطط Menu OS</h1>
          <p className="mt-2 text-gray-600">اختر الخطة المناسبة لمطعمك</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <h2 className="text-xl font-bold">{plan.label}</h2>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {plan.id === "ENTERPRISE"
                  ? "مخصص"
                  : plan.price === 0
                    ? "مجاني"
                    : `${plan.price} ر.س/شهر`}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Link
                href={plan.id === "ENTERPRISE" ? "/contact" : "/register"}
                className="mt-6 block"
              >
                <Button className="w-full">
                  {plan.id === "ENTERPRISE"
                    ? "تواصل معنا"
                    : plan.price === 0
                      ? "ابدأ تجربة 14 يوم"
                      : "اشترك الآن"}
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          لديك حساب؟{" "}
          <Link href="/login" className="text-emerald-600 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
