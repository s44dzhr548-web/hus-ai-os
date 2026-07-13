"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface LandingSubPageProps {
  slug: string;
  title: string;
  restaurantName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  children: ReactNode;
}

export function LandingSubPage({
  slug,
  title,
  restaurantName,
  logoUrl,
  primaryColor = "#d4af37",
  children,
}: LandingSubPageProps) {
  return (
    <div className="min-h-[100dvh] bg-[#0c0a09] text-[#faf7f2]">
      <header
        className="sticky top-0 z-10 border-b border-white/10 px-4 py-3 backdrop-blur-md"
        style={{ backgroundColor: `${primaryColor}22` }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href={`/r/${slug}`}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm transition hover:bg-white/20"
          >
            ← رجوع
          </Link>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs opacity-70">{restaurantName}</p>
            <h1 className="truncate text-base font-bold">{title}</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg p-4">{children}</main>
    </div>
  );
}
