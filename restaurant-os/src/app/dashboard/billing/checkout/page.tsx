"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Button, LoadingSpinner } from "@/components/ui";
import { MoyasarCheckout } from "@/components/billing/moyasar-checkout";
import { formatCurrency } from "@/lib/utils";
import { PLAN_LABELS } from "@/lib/subscription-limits";
import { ArrowRight } from "lucide-react";

interface CheckoutData {
  billingId: string;
  invoiceNumber: string;
  plan: string;
  amount: number;
  amountHalalas: number;
  publishableKey: string;
  callbackUrl: string;
  description: string;
  mockMode: boolean;
  metadata: Record<string, string>;
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "";
  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mockPaying, setMockPaying] = useState(false);

  useEffect(() => {
    if (!plan) {
      setError("لم يتم تحديد الخطة");
      setLoading(false);
      return;
    }
    fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("فشل تحميل الدفع"))
      .finally(() => setLoading(false));
  }, [plan]);

  async function mockPay() {
    if (!data) return;
    setMockPaying(true);
    const mockId = `mock_${Date.now()}`;
    window.location.href = `/api/billing/callback?billingId=${data.billingId}&id=${mockId}`;
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div>
        <PageHeader title="الدفع" description={error} />
        <Link href="/dashboard/billing">
          <Button variant="outline">العودة للفوترة</Button>
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/dashboard/billing" className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <ArrowRight className="h-4 w-4" /> الفوترة
      </Link>

      <PageHeader
        title={`الترقية إلى ${PLAN_LABELS[data.plan] || data.plan}`}
        description={`${formatCurrency(data.amount)}/شهر · ${data.invoiceNumber}`}
      />

      <Card className="space-y-2 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">الخطة</span>
          <span className="font-semibold">{PLAN_LABELS[data.plan] || data.plan}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">المبلغ</span>
          <span className="font-semibold">{formatCurrency(data.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">الفاتورة</span>
          <span className="font-mono text-xs" dir="ltr">{data.invoiceNumber}</span>
        </div>
      </Card>

      {data?.mockMode ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-amber-800">
            وضع تجريبي — أضف مفاتيح Moyasar في Vercel لتفعيل الدفع الحقيقي
          </p>
          <Button className="w-full" loading={mockPaying} onClick={mockPay}>
            إتمام الدفع التجريبي (dev only)
          </Button>
        </Card>
      ) : data.publishableKey ? (
        <MoyasarCheckout
          publishableKey={data.publishableKey}
          amountHalalas={data.amountHalalas}
          description={data.description}
          callbackUrl={`${window.location.origin}/api/billing/callback?billingId=${data.billingId}`}
          metadata={{
            billingPaymentId: data.billingId,
            ...data.metadata,
          }}
        />
      ) : (
        <Card className="p-4 text-sm text-amber-800">
          بوابة الدفع غير مُفعّلة. أضف MOYASAR_PUBLISHABLE_KEY و MOYASAR_SECRET_KEY في Vercel.
        </Card>
      )}
    </div>
  );
}

export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckoutInner />
    </Suspense>
  );
}
