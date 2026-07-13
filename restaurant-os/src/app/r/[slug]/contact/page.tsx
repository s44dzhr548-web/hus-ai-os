"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

export default function ContactPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [info, setInfo] = useState<{
    name: string;
    nameAr?: string;
    phone?: string;
    whatsappNumber?: string;
    address?: string;
    addressAr?: string;
    logoUrl?: string;
    primaryColor?: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/public/restaurants/${slug}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, [slug]);

  const name = info?.nameAr || info?.name || "...";
  const waLink =
    info?.whatsappNumber &&
    buildWhatsAppOrderLink(info.whatsappNumber, {
      orderNumber: 0,
      totalAmount: 0,
      items: [{ name: "استفسار", quantity: 1 }],
    });

  return (
    <LandingSubPage
      slug={slug}
      title="تواصل معنا"
      restaurantName={name}
      logoUrl={info?.logoUrl}
      primaryColor={info?.primaryColor || "#d4af37"}
    >
      <div className="space-y-4">
        {(info?.addressAr || info?.address) && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm opacity-70">العنوان</p>
            <p>{info.addressAr || info.address}</p>
          </div>
        )}
        {info?.phone && (
          <a
            href={`tel:${info.phone}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
          >
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-sm opacity-70">اتصل بنا</p>
              <p className="font-semibold" dir="ltr">
                {info.phone}
              </p>
            </div>
          </a>
        )}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
          >
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm opacity-70">واتساب</p>
              <p className="font-semibold">راسلنا مباشرة</p>
            </div>
          </a>
        )}
      </div>
    </LandingSubPage>
  );
}
