"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Badge, LoadingSpinner, Button } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface InvoiceData {
  invoice: {
    invoiceNumber: string;
    planLabel: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod?: string;
    periodStart?: string;
    periodEnd?: string;
    processedAt?: string;
    createdAt: string;
  };
  restaurant: { name: string; nameAr?: string; email?: string; taxNumber?: string };
}

export default function InvoicePage() {
  const params = useParams();
  const invoiceNumber = params.invoiceNumber as string;
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/billing/invoices/${encodeURIComponent(invoiceNumber)}`)
      .then((r) => r.json())
      .then((d) => setData(d.invoice ? d : null))
      .finally(() => setLoading(false));
  }, [invoiceNumber]);

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div>
        <PageHeader title="الفاتورة غير موجودة" />
        <Link href="/dashboard/billing"><Button variant="outline">العودة</Button></Link>
      </div>
    );
  }

  const { invoice, restaurant } = data;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/dashboard/billing" className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <ArrowRight className="h-4 w-4" /> الفوترة
      </Link>

      <Card className="p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">Menu OS</p>
            <h1 className="text-xl font-bold">فاتورة اشتراك</h1>
          </div>
          <Badge variant={invoice.status === "PAID" ? "success" : "default"}>
            {invoice.status}
          </Badge>
        </div>

        <div className="space-y-2 border-b pb-4 text-sm">
          <p><span className="text-gray-500">رقم الفاتورة:</span> <span dir="ltr">{invoice.invoiceNumber}</span></p>
          <p><span className="text-gray-500">المطعم:</span> {restaurant.nameAr || restaurant.name}</p>
          {restaurant.taxNumber && (
            <p><span className="text-gray-500">الرقم الضريبي:</span> {restaurant.taxNumber}</p>
          )}
          <p><span className="text-gray-500">التاريخ:</span> {formatDate(invoice.processedAt || invoice.createdAt)}</p>
        </div>

        <div className="space-y-2 py-4 text-sm">
          <div className="flex justify-between">
            <span>خطة {invoice.planLabel}</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
          {invoice.paymentMethod && (
            <p className="text-gray-500">طريقة الدفع: {invoice.paymentMethod}</p>
          )}
          {invoice.periodStart && invoice.periodEnd && (
            <p className="text-gray-500">
              الفترة: {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
            </p>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>الإجمالي</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
