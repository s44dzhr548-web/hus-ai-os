"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MARKETING_NAV } from "@/lib/marketing/nav";
import { useMarketingTheme } from "@/components/marketing/marketing-shell";

export function MarketingSubNav() {
  const pathname = usePathname();
  const { theme } = useMarketingTheme();
  const dark = theme === "dark";

  return (
    <nav className="mb-6 -mx-1 flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin" aria-label="Marketing navigation">
      {MARKETING_NAV.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm",
              active
                ? "bg-gradient-to-l from-amber-600 to-amber-500 text-white shadow-md"
                : dark
                  ? "bg-stone-800/80 text-stone-300 hover:bg-stone-700"
                  : "bg-white text-stone-600 ring-1 ring-stone-200"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
