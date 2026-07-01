import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "الشروط والأحكام — Menu OS",
  description: "شروط استخدام منصة Menu OS",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">الشروط والأحكام</h1>
        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
          باستخدام Menu OS، توافق على تشغيل قائمتك الرقمية وفق خطتك
          المختارة. أنت مسؤول عن محتوى القائمة، أسعار المنتجات، ومفاتيح
          الدفع الخاصة بك.
        </p>
        <ul className="mt-6 list-disc space-y-2 pr-6 text-sm text-gray-600">
          <li>المنصة لا تستلم أموال عملائك — الدفع مباشر لحسابك</li>
          <li>حدود الاشتراك تُطبّق حسب خطتك (Free/Basic/Pro/Enterprise)</li>
          <li>يُحظر المحتوى غير القانوني أو المضلل</li>
          <li>يمكن إيقاف الحساب عند مخالفة الشروط</li>
        </ul>
        <Link href="/" className="mt-8 inline-block">
          <Button variant="outline">العودة للرئيسية</Button>
        </Link>
      </div>
    </div>
  );
}
