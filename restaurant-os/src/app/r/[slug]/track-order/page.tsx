"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { Button, Input } from "@/components/ui";

export default function TrackOrderPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    orderNumber: number;
    status: string;
    totalAmount: number;
  } | null>(null);
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

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch(
      `/api/public/orders/lookup?slug=${encodeURIComponent(slug)}&orderNumber=${encodeURIComponent(orderNumber)}`
    );
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "الطلب غير موجود");
      return;
    }
    setResult(data);
  }

  return (
    <LandingSubPage
      slug={slug}
      title="تتبع الطلب"
      restaurantName={restaurantName || "..."}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <form onSubmit={lookup} className="space-y-4">
        <Input
          label="رقم الطلب"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="مثال: 1042"
          dir="ltr"
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          بحث
        </Button>
      </form>

      {result && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm opacity-70">رقم الطلب</p>
          <p className="text-2xl font-bold">#{result.orderNumber}</p>
          <p className="mt-3 text-sm">
            الحالة: <span className="font-semibold">{result.status}</span>
          </p>
          <p className="mt-1 text-sm">الإجمالي: {result.totalAmount} ريال</p>
          <a
            href={`/order-status/${result.id}`}
            className="mt-4 inline-block text-sm underline"
            style={{ color: primaryColor }}
          >
            عرض التفاصيل الكاملة →
          </a>
        </div>
      )}
    </LandingSubPage>
  );
}
