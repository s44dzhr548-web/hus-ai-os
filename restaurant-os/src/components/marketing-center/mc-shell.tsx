"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function useMcTheme() {
  return useContext(ThemeCtx);
}

export function McShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("mc-theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("mc-theme", next);
      return next;
    });
  };

  const dark = theme === "dark";

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div
        className={cn(
          "min-h-[80vh] rounded-2xl border p-4 transition-colors duration-300 sm:p-6",
          dark
            ? "border-amber-900/30 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-stone-100"
            : "border-stone-200 bg-gradient-to-br from-stone-50 via-white to-amber-50/30 text-stone-900"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-amber-500/90">
              AI Marketing Center · Phase 1
            </p>
            <p className={cn("text-xs", dark ? "text-stone-400" : "text-stone-500")}>
              معمارية فقط — لا تكاملات · لا OAuth · لا API Keys
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "rounded-full p-2 transition hover:scale-105",
              dark ? "bg-stone-800 text-amber-400" : "bg-stone-100 text-stone-700"
            )}
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

export function McCard({
  children,
  className,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  const { theme } = useMcTheme();
  const dark = theme === "dark";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5",
        dark
          ? "border-stone-700/80 bg-stone-900/60 backdrop-blur-sm"
          : "border-stone-200 bg-white/80 shadow-sm",
        glow && dark && "shadow-[0_0_24px_rgba(212,175,55,0.12)]",
        glow && !dark && "shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

export function McMetric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  const { theme } = useMcTheme();
  const dark = theme === "dark";
  return (
    <McCard glow={accent} className="animate-in fade-in duration-500">
      <p className={cn("text-xs", dark ? "text-stone-400" : "text-stone-500")}>{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          accent && "bg-gradient-to-l from-amber-400 to-amber-200 bg-clip-text text-transparent"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className={cn("mt-1 text-xs", dark ? "text-stone-500" : "text-stone-400")}>{sub}</p>
      )}
    </McCard>
  );
}
