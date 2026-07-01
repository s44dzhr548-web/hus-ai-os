"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, LoadingSpinner, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { PLAN_LABELS } from "@/lib/subscription-limits";
import { ArrowRight, DollarSign, Users, TrendingUp } from "lucide-react";

interface BillingStats {
  totalCustomers: number;
  activeSubscriptions: number;
  trialAccounts: number;
  expiredAccounts: number;
  pastDueAccounts: number;
  mrr: number;
  arr: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

interface RecentPayment {
  id: string;
  invoiceNumber: string;
  restaurant: string;
  plan: string;
  amount: number;
  status: string;
  processedAt?: string;
  createdAt: string;
}

interface GatewayStatus {
  mode: string;
  ready: boolean;
  missingKeys: string[];
  webhookUrl: string;
  supportedMethods: string[];
}

export default function PlatformBillingPage() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/billing")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setPayments(d.recentPayments || []);
        setGateway(d.gateway || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const cards = [
    { label: "إجمالي العملاء", value: stats?.totalCustomers ?? 0, icon: Users },
    { label: "اشتراكات نشطة", value: stats?.activeSubscriptions ?? 0, icon: TrendingUp },
    { label: "حسابات تجريبية", value: stats?.trialAccounts ?? 0, icon: Users },
    { label: "منتهية", value: stats?.expiredAccounts ?? 0, icon: Users },
    { label: "MRR", value: formatCurrency(stats?.mrr ?? 0), icon: DollarSign },
    { label: "ARR", value: formatCurrency(stats?.arr ?? 0), icon: DollarSign },
    { label: "إيراد الشهر", value: formatCurrency(stats?.monthlyRevenue ?? 0), icon: DollarSign },
    { label: "إيرادات كلية", value: formatCurrency(stats?.totalRevenue ?? 0), icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/platform" className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <ArrowRight className="h-4 w-4" /> إدارة المنصة
      </Link>

      <PageHeader
        title="الإيرادات والفوترة"
        description="MRR · ARR · الاشتراكات · سجل المدفوعات (للقراءة فقط)"
      />

      {gateway && (
        <Card className={`mb-6 p-4 ${gateway.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                بوابة الدفع: {gateway.mode === "live" ? "إنتاج (Moyasar)" : "تجريبي"}
              </p>
              <p className="text-sm text-gray-600">
                {gateway.supportedMethods.join(" · ")}
              </p>
              {!gateway.ready && gateway.missingKeys.length > 0 && (
                <p className="mt-2 text-sm text-amber-900">
                  مفاتيح ناقصة: {gateway.missingKeys.join(", ")}
                </p>
              )}
            </div>
            <Badge variant={gateway.ready ? "success" : "warning"}>
              {gateway.ready ? "جاهز" : "غير جاهز"}
            </Badge>
          </div>
          <p className="mt-2 font-mono text-xs text-gray-500" dir="ltr">
            Webhook: {gateway.webhookUrl}
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <c.icon className="h-4 w-4" /> {c.label}
            </div>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-bold">آخر المدفوعات</h2>
        <p className="mb-4 text-xs text-gray-500">
          سجل غير قابل للتعديل — لا يمكن للمشرف تغيير سجل المدفوعات
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-2 text-right">الفاتورة</th>
                <th className="p-2 text-right">المطعم</th>
                <th className="p-2 text-right">الخطة</th>
                <th className="p-2 text-right">المبلغ</th>
                <th className="p-2 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2 font-mono text-xs" dir="ltr">{p.invoiceNumber}</td>
                  <td className="p-2">{p.restaurant}</td>
                  <td className="p-2">{PLAN_LABELS[p.plan] || p.plan}</td>
                  <td className="p-2">{formatCurrency(p.amount)}</td>
                  <td className="p-2">
                    <Badge variant={p.status === "PAID" ? "success" : "default"}>
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
