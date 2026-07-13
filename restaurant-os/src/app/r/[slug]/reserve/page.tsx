"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { Button, Input } from "@/components/ui";

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0a09] p-8 text-white">...</div>}>
      <ReserveForm />
    </Suspense>
  );
}

function ReserveForm() {
  const params = useParams();
  const slug = params.slug as string;

  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("2");
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
    setLoading(true);
    setError("");
    const res = await fetch("/api/public/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        customerName: name,
        customerPhone: phone,
        guestCount: guests,
        date,
        time,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل إرسال الحجز");
      return;
    }
    setDone(true);
  }

  return (
    <LandingSubPage
      slug={slug}
      title="حجز طاولة"
      restaurantName={restaurantName || "..."}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      {done ? (
        <div className="py-12 text-center">
          <p className="text-4xl">🪑</p>
          <p className="mt-4 text-lg font-semibold">تم إرسال طلب الحجز!</p>
          <p className="mt-2 text-sm opacity-70">سنتواصل معك قريباً</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="الجوال"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            required
          />
          <Input
            label="التاريخ"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="الوقت"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
          <Input
            label="عدد الضيوف"
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            إرسال طلب الحجز
          </Button>
        </form>
      )}
    </LandingSubPage>
  );
}
