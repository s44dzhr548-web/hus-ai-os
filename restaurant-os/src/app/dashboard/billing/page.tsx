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
import { CreditCard, RefreshCw, AlertTriangle } from "lucide-react";

interface BillingPayment {
  id: string;
  invoiceNumber: string;
  plan: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  periodStart?: string;
  periodEnd?: string;
  processedAt?: string;
  createdAt: string;
}

interface BillingData {
  subscription: {
    plan: string;
    status: string;
    startDate: string;
    endDate?: string;
    autoRenew?: boolean;
  };
  renewalNotice?: string;
  daysRemaining?: number | null;
  isExpired?: boolean;
  plans: { id: string; label: string; price: number; features: string[] }[];
}

const STATUS_AR: Record<string, string> = {
  PAID: "مدفوع",
  PENDING: "قيد الانتظار",
  FAILED: "فشل",
  REFUNDED: "مسترد",
  ACTIVE: "نشط",
  TRIAL: "تجريبي",
  EXPIRED: "منتهي",
  PAST_DUE: "متأخر",
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);

  function load() {
    Promise.all([
      fetch("/api/subscription").then((r) => r.json()),
      fetch("/api/billing/payments").then((r) => r.json()),
    ])
      .then(([sub, pay]) => {
        setData(sub);
        setPayments(pay.payments || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function renew() {
    setRenewing(true);
    const res = await fetch("/api/billing/renew", { method: "POST" });
    const result = await res.json();
    setRenewing(false);
    if (result.mock && result.renewed) {
      load();
      return;
    }
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }
    alert(result.error || "فشل التجديد");
  }

  if (loading) return <LoadingSpinner />;

  const sub = data?.subscription;
  const currentPlan = PLAN_LABELS[sub?.plan || ""] || sub?.plan;

  return (
    <div>
      <PageHeader title="الفوترة والمدفوعات" description="إدارة اشتراكك وسجل الدفع" />

      {(data?.isExpired || data?.renewalNotice) && (
        <Card className="mb-6 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                {data.isExpired ? "انتهى اشتراكك" : "تنبيه التجديد"}
              </p>
              <p className="text-sm text-amber-800">
                {data.renewalNotice ||
                  "يرجى تجديد اشتراكك للاستمرار في استخدام الميزات المميزة."}
              </p>
              <Button size="sm" className="mt-3" loading={renewing} onClick={renew}>
                <RefreshCw className="h-4 w-4" /> تجديد الاشتراك
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">الخطة الحالية</p>
          <p className="text-xl font-bold">{currentPlan}</p>
          <Badge className="mt-2">{STATUS_AR[sub?.status || ""] || sub?.status}</Badge>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">تاريخ الانتهاء</p>
          <p className="text-xl font-bold">
            {sub?.endDate ? formatDate(sub.endDate) : "—"}
          </p>
          {data?.daysRemaining != null && data.daysRemaining >= 0 && (
            <p className="mt-1 text-xs text-emerald-600">
              متبقي {data.daysRemaining} يوم
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-gray-500">التجديد التلقائي</p>
          <p className="text-xl font-bold">{sub?.autoRenew ? "مفعّل" : "معطّل"}</p>
        </Card>
      </div>

      <h2 className="mb-4 text-lg font-bold">ترقية الخطة</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {data?.plans
          .filter((p) => ["STARTER", "PRO", "BUSINESS"].includes(p.id))
          .map((plan) => (
            <Card key={plan.id}>
              <h3 className="font-bold">{plan.label}</h3>
              <p className="mt-1 font-bold text-emerald-700">
                {formatCurrency(plan.price)}/شهر
              </p>
              <Link href={`/dashboard/billing/checkout?plan=${plan.id}`}>
                <Button
                  className="mt-4 w-full"
                  variant={sub?.plan === plan.id ? "outline" : "primary"}
                  disabled={sub?.plan === plan.id}
                >
                  {sub?.plan === plan.id ? "الخطة الحالية" : "ترقية"}
                </Button>
              </Link>
            </Card>
          ))}
        <Card className="border-dashed">
          <h3 className="font-bold">Enterprise</h3>
          <p className="mt-1 text-gray-600">تسعير مخصص</p>
          <Link href="/contact">
            <Button className="mt-4 w-full" variant="outline">
              تواصل معنا
            </Button>
          </Link>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">سجل المدفوعات</h2>
        {!data?.isExpired && sub?.status !== "TRIAL" && (
          <Button variant="outline" size="sm" loading={renewing} onClick={renew}>
            <CreditCard className="h-4 w-4" /> تجديد
          </Button>
        )}
      </div>

      {payments.length === 0 ? (
        <Card className="p-6 text-center text-sm text-gray-500">
          لا توجد مدفوعات بعد
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3 text-right">الفاتورة</th>
                <th className="p-3 text-right">الخطة</th>
                <th className="p-3 text-right">المبلغ</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/dashboard/billing/invoices/${p.invoiceNumber}`}
                      className="font-mono text-xs text-emerald-700 hover:underline"
                      dir="ltr"
                    >
                      {p.invoiceNumber}
                    </Link>
                  </td>
                  <td className="p-3">{PLAN_LABELS[p.plan] || p.plan}</td>
                  <td className="p-3">{formatCurrency(p.amount)}</td>
                  <td className="p-3">
                    <Badge variant={p.status === "PAID" ? "success" : "default"}>
                      {STATUS_AR[p.status] || p.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {formatDate(p.processedAt || p.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
