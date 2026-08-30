import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

import { safePublicOrigin } from "@/lib/safe-public-url";

function resolveMetadataBase(): URL {
  return new URL(safePublicOrigin());
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "Menu OS — نظام القائمة الرقمية للمطاعm",
    template: "%s | Menu OS",
  },
  description:
    "منصة القائمة الرقمية للمطاعm — QR، طلبات، دفع مباشر، مطبخ، وتحليلات",
  keywords: ["قائمة رقمية", "مطعm", "QR", "طلبات", "Menu OS", "SaaS"],
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "Menu OS",
    title: "Menu OS — نظام القائمة الرقمية",
    description: "أنشئ قائمتك الرقمية واستقبل الطلبات مباشرة",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menu OS",
    description: "نظام القائمة الرقمية للمطاعm",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
