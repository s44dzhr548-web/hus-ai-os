"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  LoadingSpinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PLAN_LABELS } from "@/lib/subscription-limits";
import { Check, Crown, ArrowUpCircle, AlertTriangle } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  label: string;
  price: number;
  features: string[];
}

interface Subscription {
  plan: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  autoRenew?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  TRIAL: "تجريبي",
  SUSPENDED: "معلق",
  CANCELLED: "ملغي",
  EXPIRED: "منتهي",
  PAST_DUE: "متأخر",
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageRows, setUsageRows] = useState<
    { label: string; used: number; limit: number | null; remaining: number | null }[]
  >([]);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [renewalNotice, setRenewalNotice] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans || []);
        setSubscription(data.subscription);
        setRenewalNotice(data.renewalNotice || "");
        setIsExpired(Boolean(data.isExpired));
        setFeatures({
          video: Boolean(data.limits?.video),
          whatsapp: Boolean(data.limits?.whatsapp),
          analytics: Boolean(data.limits?.analytics),
          cameraAnalytics: Boolean(data.limits?.cameraAnalytics),
        });
        const u = data.usage || {};
        const l = data.limits || {};
        const r = data.remaining || {};
        setUsageRows([
          { label: "الفروع", used: u.branches, limit: l.branches, remaining: r.branches },
          { label: "الطاولات", used: u.tables, limit: l.tables, remaining: r.tables },
          { label: "التصنيفات", used: u.categories, limit: l.categories, remaining: r.categories },
          { label: "المنتجات", used: u.items, limit: l.items, remaining: r.items },
        ]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="خطتك والاستخدام" description="الباقة الحالية والحدود المتبقية" />

      {(isExpired || renewalNotice) && (
        <Card className="mb-6 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                {isExpired ? "انتهى اشتراكك" : "تنبيه التجديد"}
              </p>
              <p className="text-sm text-amber-800">{renewalNotice}</p>
              <Link href="/dashboard/billing">
                <Button size="sm" className="mt-2">تجديد أو ترقية</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {subscription && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-emerald-700">الباقة الحالية</p>
              <p className="text-2xl font-bold text-emerald-900">
                {PLAN_LABELS[subscription.plan] || subscription.plan}
              </p>
              <p className="mt-1 text-sm text-emerald-600">
                الحالة: {STATUS_LABELS[subscription.status] || subscription.status}
                {subscription.startDate && ` · من ${formatDate(subscription.startDate)}`}
                {subscription.endDate && ` · ينتهي ${formatDate(subscription.endDate)}`}
              </p>
            </div>
            <Badge variant="success">
              {STATUS_LABELS[subscription.status] || subscription.status}
            </Badge>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">الاستخدام والحدود المتبقية</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {usageRows.map((row) => (
            <div key={row.label} className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">{row.label}</p>
              <p className="text-xl font-bold">
                {row.used}
                {row.limit != null ? ` / ${row.limit}` : " / ∞"}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={features.video ? "success" : "danger"}>
            {features.video ? "فيديو ✓" : "بدون فيديو"}
          </Badge>
          <Badge variant={features.analytics ? "success" : "danger"}>
            {features.analytics ? "تحليلات ✓" : "بدون تحليلات"}
          </Badge>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">ترقية الخطة</h2>
        <Link href="/dashboard/billing">
          <Button variant="outline" size="sm">
            <ArrowUpCircle className="h-4 w-4" /> الفوترة والدفع
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans
          .filter((p) => p.id !== "FREE")
          .map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            const isPro = plan.id === "PRO";
            const isEnterprise = plan.id === "ENTERPRISE";
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${isPro ? "ring-2 ring-emerald-500" : ""} ${isCurrent ? "bg-emerald-50" : ""}`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="warning" className="flex items-center gap-1">
                      <Crown className="h-3 w-3" /> الأكثر شعبية
                    </Badge>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold">{plan.label || plan.name}</h3>
                  <p className="mt-2">
                    <span className="text-3xl font-bold text-emerald-700">
                      {isEnterprise
                        ? "مخصص"
                        : plan.price === 0
                          ? "مجاناً"
                          : formatCurrency(plan.price)}
                    </span>
                    {!isEnterprise && plan.price > 0 && (
                      <span className="text-sm text-gray-500"> /شهر</span>
                    )}
                  </p>
                </div>
                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isEnterprise ? (
                  <Link href="/contact">
                    <Button className="w-full" variant="outline">تواصل معنا</Button>
                  </Link>
                ) : (
                  <Link href={`/dashboard/billing/checkout?plan=${plan.id}`}>
                    <Button className="w-full" variant={isCurrent ? "outline" : "secondary"} disabled={isCurrent}>
                      {isCurrent ? "باقتك الحالية" : "ترقية الآن"}
                    </Button>
                  </Link>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
