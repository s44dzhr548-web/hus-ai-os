"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  LoadingSpinner,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  statusBadgeVariant,
  subscriptionExpiryInfo,
} from "@/lib/subscription-display";
import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";

const STEPS = [
  { id: 1, title: "إعدادات المطعم", href: "/dashboard/restaurant", check: (s: SetupStats) => s.hasProfile },
  { id: 2, title: "إضافة فرع", href: "/dashboard/branches", check: (s: SetupStats) => s.branches >= 1 },
  { id: 3, title: "إنشاء طاولات و QR", href: "/dashboard/tables", check: (s: SetupStats) => s.tables >= 1 },
  { id: 4, title: "بناء القائمة", href: "/dashboard/menu/categories", check: (s: SetupStats) => s.categories >= 1 && s.items >= 1 },
  { id: 5, title: "تخصيص المنيو", href: "/dashboard/branding", check: (s: SetupStats) => s.hasBranding },
  { id: 6, title: "إعداد الدفع (اختياري)", href: "/dashboard/payments", check: (s: SetupStats) => s.hasPayment, optional: true },
];

interface SetupStats {
  branches: number;
  tables: number;
  categories: number;
  items: number;
  hasPayment: boolean;
  hasProfile: boolean;
  hasBranding: boolean;
}

interface SubscriptionInfo {
  plan: string;
  status: string;
  startDate: string;
  endDate?: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState<SetupStats>({
    branches: 0,
    tables: 0,
    categories: 0,
    items: 0,
    hasPayment: false,
    hasProfile: false,
    hasBranding: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/branches").then((r) => r.json()),
      fetch("/api/tables").then((r) => r.json()),
      fetch("/api/menu/categories").then((r) => r.json()),
      fetch("/api/menu/items").then((r) => r.json()),
      fetch("/api/restaurants/payment-settings").then((r) => r.json()),
      fetch("/api/restaurants").then((r) => r.json()),
      fetch("/api/restaurants/branding").then((r) => r.json()),
      fetch("/api/subscription").then((r) => r.json()),
    ])
      .then(([branches, tables, categories, items, payments, restaurants, branding, subData]) => {
        const restaurant = Array.isArray(restaurants) ? restaurants[0] : null;
        setStats({
          branches: Array.isArray(branches) ? branches.length : 0,
          tables: Array.isArray(tables) ? tables.length : 0,
          categories: Array.isArray(categories) ? categories.length : 0,
          items: Array.isArray(items) ? items.length : 0,
          hasPayment: !!(payments?.moyasarSecretKey || payments?.tapSecretKey || payments?.stripeSecretKey),
          hasProfile: !!(restaurant?.name && restaurant?.phone),
          hasBranding: !!(branding?.logoUrl || branding?.primaryColor),
        });
        setSubscription(subData?.subscription || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const requiredDone = STEPS.filter((s) => !s.optional).every((s) => s.check(stats));
  const expiry = subscriptionExpiryInfo(subscription?.endDate);
  const completedCount = STEPS.filter((s) => s.check(stats)).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="تأهيل مطعمك" description="أكمل الخطوات التالية لتفعيل Menu OS لعملائك" />

      {subscription && (
        <Card className={`mb-6 ${expiry.isExpired ? "border-red-200 bg-red-50" : subscription.status === "TRIAL" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">اشتراكك</p>
              <p className="text-xl font-bold">{PLAN_LABELS[subscription.plan] || subscription.plan}</p>
              <Badge variant={statusBadgeVariant(subscription.status as "ACTIVE", expiry.isExpired)} className="mt-2">
                {STATUS_LABELS[subscription.status as keyof typeof STATUS_LABELS] || subscription.status}
              </Badge>
              {subscription.startDate && (
                <p className="mt-2 text-xs text-gray-600">بدء: {formatDate(subscription.startDate)}</p>
              )}
            </div>
            <div>
              {subscription.endDate ? (
                <>
                  <p className="flex items-center gap-1 text-sm font-medium">
                    {expiry.isExpired ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                    ينتهي: {formatDate(subscription.endDate)}
                  </p>
                  <p className={`mt-1 text-sm ${expiry.isExpired ? "text-red-700" : "text-amber-700"}`}>{expiry.label}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">بدون تاريخ انتهاء</p>
              )}
            </div>
          </div>
          {expiry.isExpired && (
            <p className="mt-3 text-sm text-red-700">انتهى اشتراكك. تواصل مع Menu OS لتجديد أو تفعيل اشتراكك.</p>
          )}
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">{completedCount} / {STEPS.length} خطوات مكتملة</p>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full bg-emerald-600" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {requiredDone && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800">مطعمك جاهز!</p>
              <p className="text-sm text-emerald-700">يمكنك الآن مشاركة QR مع العملاء</p>
            </div>
          </div>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>الذهاب للوحة التحكم</Button>
        </Card>
      )}

      <div className="space-y-3">
        {STEPS.map((step) => {
          const done = step.check(stats);
          return (
            <Card key={step.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {done ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <Circle className="h-8 w-8 text-gray-300" />}
                <span className="font-medium">{step.id}. {step.title}</span>
                {step.optional && <Badge variant="default">اختياري</Badge>}
              </div>
              <Link href={step.href}>
                <Button size="sm" variant={done ? "outline" : "primary"}>{done ? "مراجعة" : "ابدأ"}</Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 bg-gray-50">
        <p className="text-sm text-gray-600">للترقية أو تمديد التجربة، تواصل مع فريق Menu OS.</p>
        <Link href="/dashboard/subscription" className="mt-2 inline-block">
          <Button size="sm" variant="outline">عرض تفاصيل الاشتراك</Button>
        </Link>
      </Card>
    </div>
  );
}
