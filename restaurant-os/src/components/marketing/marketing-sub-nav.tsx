"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { MARKETING_NAV, WHATSAPP_MARKETING_NAV } from "@/lib/marketing/nav";
import { useMarketingTheme } from "@/components/marketing/marketing-shell";

function navActive(pathname: string, href: string, tab: string | null) {
  const [path, query] = href.split("?");
  if (query) {
    const expectedTab = new URLSearchParams(query).get("tab");
    return pathname === path && tab === expectedTab;
  }
  return pathname === href || (path !== "/dashboard/marketing" && pathname.startsWith(`${path}/`));
}

export function MarketingSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { theme } = useMarketingTheme();
  const dark = theme === "dark";

  const restNav = MARKETING_NAV.filter(
    (item) => !WHATSAPP_MARKETING_NAV.some((w) => w.href === item.href)
  );

  return (
    <div className="mb-6 space-y-3">
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
          التسويق — واتساب
        </p>
        <nav
          className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
          aria-label="WhatsApp marketing"
        >
          {WHATSAPP_MARKETING_NAV.map(({ href, label }) => {
            const active = navActive(pathname, href, tab);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm",
                  active
                    ? "bg-gradient-to-l from-emerald-600 to-emerald-500 text-white shadow-md"
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
      </div>
      <nav
        className="-mx-1 flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin"
        aria-label="Marketing navigation"
      >
        {restNav.map(({ href, label }) => {
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
    </div>
  );
}
