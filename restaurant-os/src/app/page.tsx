import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-700">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="text-xl font-bold text-white">Menu OS</span>
        <Link href="/login">
          <Button variant="outline" className="border-white text-white hover:bg-white/10">
            تسجيل الدخول
          </Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
          نظام القائمة الرقمية للمطاعم
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
          أنشئ قائمتك الرقمية، أدر الطاولات وQR، استقبل الطلبات، وتابع المبيعات — كل ذلك من
          لوحة تحكم عربية واحدة.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/register">
            <Button size="lg" className="min-w-[200px] bg-white text-emerald-800 hover:bg-emerald-50">
              ابدأ مجاناً
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="min-w-[200px] border-white text-white hover:bg-white/10">
              الخطط والأسعار
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "قائمة رقمية", desc: "صور وفيديوهات للمنتجات" },
            { title: "QR للطاولات", desc: "مسح وطلب فوري" },
            { title: "المطبخ", desc: "متابعة حالة الطلبات" },
            { title: "التقارير", desc: "مبيعات وإحصائيات" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white/10 p-6 text-right backdrop-blur">
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-emerald-100">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-emerald-800/50 px-4 py-8 text-center text-sm text-emerald-200">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/pricing" className="hover:text-white">
            الأسعار
          </Link>
          <Link href="/faq" className="hover:text-white">
            الأسئلة الشائعة
          </Link>
          <Link href="/contact" className="hover:text-white">
            تواصل معنا
          </Link>
          <Link href="/privacy" className="hover:text-white">
            الخصوصية
          </Link>
          <Link href="/terms" className="hover:text-white">
            الشروط
          </Link>
          <Link href="/register" className="hover:text-white">
            التسجيل
          </Link>
          <Link href="/login" className="hover:text-white">
            الدخول
          </Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} Menu OS</p>
      </footer>
    </div>
  );
}
