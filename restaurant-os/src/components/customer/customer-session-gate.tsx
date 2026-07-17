"use client";

import Link from "next/link";
import { QR_SESSION_REQUIRED_MESSAGE } from "@/lib/customer-table-session";

interface SessionGateProps {
  slug: string;
  title: string;
  primaryColor?: string;
}

export function CustomerSessionGate({
  slug,
  title,
  primaryColor = "#d4af37",
}: SessionGateProps) {
  return (
    <div className="min-h-[100dvh] bg-[#0c0a09] text-[#faf7f2]">
      <header
        className="border-b border-white/10 px-4 py-3 backdrop-blur-md"
        style={{ backgroundColor: `${primaryColor}22` }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href={`/r/${slug}`}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm transition hover:bg-white/20"
          >
            ← رجوع
          </Link>
          <h1 className="text-base font-bold">{title}</h1>
        </div>
      </header>
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <p className="mb-2 text-4xl" aria-hidden>
          📱
        </p>
        <p className="text-lg font-semibold leading-relaxed">{QR_SESSION_REQUIRED_MESSAGE}</p>
        <Link
          href={`/r/${slug}`}
          className="mt-8 rounded-full px-8 py-3 text-sm font-semibold text-[#0c0a09]"
          style={{ background: primaryColor }}
        >
          العودة للصفحة الرئيسية
        </Link>
      </main>
    </div>
  );
}
