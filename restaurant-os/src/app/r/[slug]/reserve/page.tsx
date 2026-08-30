"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { PublicReservationForm } from "@/components/customer/public-reservation-form";

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

  const [restaurant, setRestaurant] = useState<{
    name: string;
    nameAr?: string | null;
    logoUrl?: string | null;
    primaryColor?: string;
    workingHours?: unknown;
    landingPageConfig?: unknown;
    receptionDepositAmount?: number | null;
    timezone?: string;
  } | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch(`/api/public/restaurants/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        setRestaurant(data);
      })
      .catch(() => setLoadError("تعذر تحميل بيانات المطعم"));
  }, [slug]);

  const primaryColor = restaurant?.primaryColor || "#d4af37";
  const restaurantName = restaurant?.nameAr || restaurant?.name || "...";

  return (
    <LandingSubPage
      slug={slug}
      title="حجز طاولة"
      restaurantName={restaurantName}
      logoUrl={restaurant?.logoUrl}
      primaryColor={primaryColor}
    >
      {loadError ? (
        <p className="py-8 text-center text-red-300">{loadError}</p>
      ) : !restaurant ? (
        <p className="py-8 text-center opacity-60">جاري التحميل...</p>
      ) : (
        <PublicReservationForm slug={slug} restaurant={restaurant} />
      )}
    </LandingSubPage>
  );
}
