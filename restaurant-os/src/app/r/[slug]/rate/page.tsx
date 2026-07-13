"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { Button } from "@/components/ui";

export default function RateVisitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0a09] p-8 text-white">...</div>}>
      <RateVisitForm />
    </Suspense>
  );
}

function RateVisitForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableId = searchParams.get("table");

  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("اختر عدد النجوم");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/public/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, rating, comment, tableId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الإرسال");
      return;
    }
    setDone(true);
  }

  return (
    <LandingSubPage
      slug={slug}
      title="تقييم الزيارة"
      restaurantName={restaurantName || "..."}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      {done ? (
        <div className="py-12 text-center">
          <p className="text-4xl">⭐</p>
          <p className="mt-4 text-lg font-semibold">شكراً لتقييمك!</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div>
            <p className="mb-3 text-sm opacity-80">كيف كانت تجربتك؟</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-3xl transition-transform hover:scale-110 ${n <= rating ? "opacity-100" : "opacity-30"}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm opacity-80">تعليق (اختياري)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
              placeholder="شاركنا رأيك..."
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            إرسال التقييم
          </Button>
        </form>
      )}
    </LandingSubPage>
  );
}
