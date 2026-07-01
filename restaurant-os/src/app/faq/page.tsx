import Link from "next/link";
import { Button } from "@/components/ui";

const faqs = [
  {
    q: "ما هو Menu OS؟",
    a: "منصة SaaS لإدارة القوائم الرقمية للمطاعم: QR للطاولات، الطلبات، المطبخ، التحليلات، والدفع المباشر لحساب المطعم.",
  },
  {
    q: "هل المنصة تحتفظ بأموال العملاء؟",
    a: "لا. المدفوعات تذهب مباشرة إلى حساب المطعم عبر Moyasar أو Tap باستخدام مفاتيح API الخاصة بك.",
  },
  {
    q: "هل يمكنني إدارة أكثر من فرع؟",
    a: "نعم. الخطط الأعلى تدعم فروعاً وطاولات ومنتجات أكثر.",
  },
  {
    q: "هل القائمة تدعم العربية؟",
    a: "نعم. الواجهة عربية RTL مع دعم الإنجليزية للعملاء.",
  },
  {
    q: "كيف أبدأ؟",
    a: "سجّل حساباً مجانياً، أكمل معالج الإعداد، وأنشئ QR للطاولات.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-emerald-800">
            Menu OS
          </Link>
          <Link href="/register">
            <Button>ابدأ مجاناً</Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">الأسئلة الشائعة</h1>
        <div className="mt-8 space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-xl bg-white p-5 shadow">
              <summary className="cursor-pointer font-semibold text-gray-900">{f.q}</summary>
              <p className="mt-3 text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
