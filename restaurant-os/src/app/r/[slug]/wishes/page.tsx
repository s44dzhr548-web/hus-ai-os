"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { CustomerSessionGate } from "@/components/customer/customer-session-gate";
import { Button } from "@/components/ui";
import { WISH_TYPES, WISH_TYPE_LABELS_AR, WISH_STATUS_LABELS_AR } from "@/lib/customer-wishes/types";
import type { CustomerWishType } from "@prisma/client";

type WishRow = {
  id: string;
  type: CustomerWishType;
  typeLabel: string;
  message: string;
  status: string;
  statusLabel: string;
  createdAt: string;
};

export default function WishesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0a09] p-8 text-white">...</div>}>
      <WishesForm />
    </Suspense>
  );
}

function WishesForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableId = searchParams.get("table");

  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [type, setType] = useState<CustomerWishType>("OCCASION");
  const [message, setMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [sessionBlocked, setSessionBlocked] = useState(!tableId);
  const [wishes, setWishes] = useState<WishRow[]>([]);

  useEffect(() => {
    fetch(`/api/public/restaurants/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setRestaurantName(data.nameAr || data.name || "");
        setLogoUrl(data.logoUrl);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!tableId) {
      setSessionBlocked(true);
      return;
    }
    fetch(`/api/public/wishes?tableId=${tableId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setSessionBlocked(true);
          return;
        }
        setWishes(data.wishes || []);
      })
      .catch(() => setSessionBlocked(true));
  }, [tableId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tableId) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/public/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, type, message, customerName: customerName || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الإرسال");
      return;
    }
    setDone(true);
    setWishes((prev) => [data.wish, ...prev]);
    setMessage("");
  }

  if (sessionBlocked) {
    return <CustomerSessionGate slug={slug} title="الأمنيات" primaryColor={primaryColor} />;
  }

  return (
    <LandingSubPage
      slug={slug}
      title="الأمنيات"
      restaurantName={restaurantName || "..."}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      {done && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm">
          تم إرسال أمنيتك بنجاح — بانتظار مراجعة الفريق
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm opacity-80">نوع الأمنية</label>
          <div className="grid grid-cols-2 gap-2">
            {WISH_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                  type === t
                    ? "border-white/50 bg-white/15 font-semibold"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                {WISH_TYPE_LABELS_AR[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm opacity-80">اسمك (اختياري)</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
            placeholder="اسم المرسل"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm opacity-80">الأمنية / الطلب</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
            minLength={2}
            className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
            placeholder="اكتب أمنيتك أو طلبك..."
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={loading} className="w-full">
          إرسال الأمنية
        </Button>
      </form>

      {wishes.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold opacity-80">طلباتك السابقة</h2>
          {wishes.map((w) => (
            <div
              key={w.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">{w.typeLabel}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                  {WISH_STATUS_LABELS_AR[w.status as keyof typeof WISH_STATUS_LABELS_AR] ||
                    w.statusLabel}
                </span>
              </div>
              <p className="opacity-85">{w.message}</p>
            </div>
          ))}
        </div>
      )}
    </LandingSubPage>
  );
}
