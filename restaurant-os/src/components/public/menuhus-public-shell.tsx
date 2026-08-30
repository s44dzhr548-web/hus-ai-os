import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const MENUHUS_SITE = "https://www.menuhus.com";
export const MENUHUS_CONTACT_EMAIL = "hus707002h@gmail.com";

type PublicShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export function MenuHusPublicShell({ children, title, subtitle }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-emerald-800">
            MenuHus
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Link href="/google-ads-api" className="hover:text-emerald-700">
              Google Ads API
            </Link>
            <Link href="/privacy" className="hover:text-emerald-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-emerald-700">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-emerald-700">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-3xl text-lg text-slate-600">{subtitle}</p> : null}
        <div className="mt-8 max-w-none space-y-8 text-slate-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:space-y-2 [&_a]:text-emerald-700 [&_a]:underline [&_p]:leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} MenuHus · {MENUHUS_SITE.replace("https://", "")}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/google-ads-api" className="hover:text-emerald-700">
              Google Ads API
            </Link>
            <Link href="/privacy" className="hover:text-emerald-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-emerald-700">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-emerald-700">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function publicPageMetadata(title: string, description: string): Metadata {
  return {
    title: `${title} | MenuHus`,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | MenuHus`,
      description,
      url: MENUHUS_SITE,
      siteName: "MenuHus",
      type: "website",
    },
  };
}
