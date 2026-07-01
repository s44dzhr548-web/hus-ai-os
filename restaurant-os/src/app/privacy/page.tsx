import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "سياسة الخصوصية — Menu OS",
  description: "سياسة الخصوصية لمنصة Menu OS",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">سياسة الخصوصية</h1>
        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
          Menu OS تحترم خصوصيتك. نجمع فقط البيانات اللازمة لتشغيل قائمتك الرقمية
          ومعالجة الطلبات. بيانات الدفع تمر مباشرة عبر بوابة الدفع الخاصة
          بالمطعm ولا تخزن المنصة بيانات بطاقات العملاء.
        </p>
        <ul className="mt-6 list-disc space-y-2 pr-6 text-sm text-gray-600">
          <li>بيانات الحساب: البريد، الاسم، اسم المطعm</li>
          <li>بيانات الطلبات: المنتجات، المبالغ، رقم الطاولة</li>
          <li>بيانات العملاء (اختياري): الاسم، الجوال للولاء</li>
          <li>ملفات الوسائط: صور وفيديوهات المنتجات التي ترفعها</li>
        </ul>
        <p className="mt-6 text-sm text-gray-600">
          للاستفسارات: privacy@menuos.sa
        </p>
        <Link href="/" className="mt-8 inline-block">
          <Button variant="outline">العودة للرئيسية</Button>
        </Link>
      </div>
    </div>
  );
}
