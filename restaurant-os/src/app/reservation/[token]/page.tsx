"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { PublicReservationStatus } from "@/components/customer/public-reservation-status";

export default function ReservationStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0a09] p-8 text-white">...</div>}>
      <ReservationStatusContent />
    </Suspense>
  );
}

function ReservationStatusContent() {
  const params = useParams();
  const token = params.token as string;

  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    fetch(`/api/public/reservations/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.reservation) {
          setRestaurantName(data.reservation.restaurantName || "");
          setSlug(data.reservation.restaurantSlug || "");
        }
      })
      .catch(() => {});
  }, [token]);

  return (
    <LandingSubPage
      slug={slug || "menuhus"}
      title="متابعة الحجز"
      restaurantName={restaurantName || "..."}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <PublicReservationStatus token={token} />
    </LandingSubPage>
  );
}
