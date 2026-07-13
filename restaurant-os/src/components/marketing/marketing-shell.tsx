"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });
export function useMarketingTheme() {
  return useContext(ThemeCtx);
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const s = localStorage.getItem("mk-theme") as Theme | null;
    if (s) setTheme(s);
  }, []);
  const toggle = () =>
    setTheme((t) => {
      const n = t === "dark" ? "light" : "dark";
      localStorage.setItem("mk-theme", n);
      return n;
    });
  const dark = theme === "dark";

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div
        className={cn(
          "min-h-[80vh] overflow-x-hidden rounded-2xl border p-3 transition-colors sm:p-6",
          dark
            ? "border-amber-900/30 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-stone-100"
            : "border-stone-200 bg-gradient-to-br from-stone-50 via-white to-amber-50/40 text-stone-900"
        )}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-amber-500/90">التسويق الذكي</p>
            <p className={cn("text-xs", dark ? "text-stone-400" : "text-stone-500")}>
              محاكاة · غير مربوط · Staging/Local فقط
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            className={cn("shrink-0 rounded-full p-2", dark ? "bg-stone-800 text-amber-400" : "bg-stone-100")}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export function MkCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const { theme } = useMarketingTheme();
  const dark = theme === "dark";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition hover:-translate-y-0.5",
        dark ? "border-stone-700/80 bg-stone-900/60" : "border-stone-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MkBadge({ type }: { type: "simulation" | "demo" | "not_connected" | "real" }) {
  const map = {
    simulation: { t: "محاكاة", c: "bg-amber-900/40 text-amber-300" },
    demo: { t: "بيانات تجريبية", c: "bg-blue-900/40 text-blue-300" },
    not_connected: { t: "غير مربوط", c: "bg-stone-700 text-stone-300" },
    real: { t: "بيانات فعلية", c: "bg-emerald-900/40 text-emerald-300" },
  }[type];
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", map.c)}>{map.t}</span>;
}

export function MkMetric({
  label,
  value,
  badge = "simulation",
}: {
  label: string;
  value: string | number;
  badge?: "simulation" | "demo" | "not_connected";
}) {
  return (
    <MkCard>
      <div className="mb-1 flex items-center justify-between gap-1">
        <p className="text-xs opacity-60">{label}</p>
        <MkBadge type={badge} />
      </div>
      <p className="text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
    </MkCard>
  );
}

export function MkPageHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      {desc && <p className="mt-1 text-sm opacity-70">{desc}</p>}
      <p className="mt-2 text-xs text-amber-500/90">محاكاة تقديرية — ليست نتيجة فعلية · غير مربوط بالمنصات</p>
    </header>
  );
}

export function MkEmpty({ title }: { title: string }) {
  return (
    <MkCard className="py-12 text-center">
      <p className="text-sm opacity-60">{title}</p>
    </MkCard>
  );
}

export function MkLoading() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
    </div>
  );
}
