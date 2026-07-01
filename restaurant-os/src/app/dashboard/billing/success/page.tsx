"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Button } from "@/components/ui";
import { CheckCircle } from "lucide-react";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const invoice = searchParams.get("invoice") || "";

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" />
      <PageHeader
        title="تم الدفع بنجاح"
        description="تم تفعيل اشتراكك. جميع ميزات خطتك متاحة الآن."
      />
      {invoice && (
        <Card className="p-4">
          <p className="text-sm text-gray-500">رقم الفاتورة</p>
          <p className="font-mono font-bold" dir="ltr">{invoice}</p>
        </Card>
      )}
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/subscription">
          <Button className="w-full">عرض الاشتراك</Button>
        </Link>
        <Link href="/dashboard/billing">
          <Button variant="outline" className="w-full">سجل المدفوعات</Button>
        </Link>
      </div>
    </div>
  );
}
