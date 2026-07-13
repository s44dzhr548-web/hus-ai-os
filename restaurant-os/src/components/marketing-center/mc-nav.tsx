"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MC_NAV } from "@/lib/marketing-center/constants";
import { useMcTheme } from "@/components/marketing-center/mc-shell";

export function McNav() {
  const pathname = usePathname();
  const { theme } = useMcTheme();
  const dark = theme === "dark";

  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {MC_NAV.map(({ href, label }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard/marketing-center" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
              active
                ? "bg-gradient-to-l from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-900/20"
                : dark
                  ? "bg-stone-800/80 text-stone-300 hover:bg-stone-700"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
