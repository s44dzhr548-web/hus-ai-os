import type { Metadata } from "next";
import Link from "next/link";
import {
  MENUHUS_CONTACT_EMAIL,
  MENUHUS_SITE,
} from "@/components/public/menuhus-public-shell";

export const metadata: Metadata = {
  title: {
    absolute:
      "MenuHus | Restaurant Operations and Google Ads Reporting Platform",
  },
  description:
    "MenuHus is a multi-restaurant SaaS platform for reservations, tables, customer communication, and authorized Google Ads reporting through OAuth.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "MenuHus | Restaurant Operations and Google Ads Reporting Platform",
    description:
      "Multi-restaurant SaaS for reservations, tables, customer communication, and authorized Google Ads reporting through OAuth.",
    url: MENUHUS_SITE,
    siteName: "MenuHus",
    type: "website",
    locale: "en_US",
  },
};

const NAV = [
  { href: "/google-ads-api", label: "Google Ads API" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
] as const;

function GoogleAdsReportingMockup() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-2xl"
      aria-label="Illustration of Google Ads reporting in MenuHus — not live data"
    >
      <div className="border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">
        MenuHus · Marketing — illustration only
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 lg:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Google Ads connection
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4285F4] text-sm font-bold text-white">
              G
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Google Ads</p>
              <p className="text-xs text-emerald-400">Connected · user-selected account</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">OAuth · reporting scope only</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 lg:col-span-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Campaign reporting dashboard
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Spend", hint: "Authorized metrics" },
              { label: "Impressions", hint: "Read-only" },
              { label: "Clicks", hint: "Read-only" },
              { label: "Conversions", hint: "Read-only" },
            ].map((m) => (
              <div key={m.label} className="rounded-lg bg-slate-800/80 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500">{m.label}</p>
                <p className="mt-1 text-sm text-slate-400">—</p>
                <p className="text-[10px] text-slate-600">{m.hint}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Last sync: shown in product when connected · no sample numbers on this public page
          </p>
        </div>
      </div>
    </div>
  );
}

const PLATFORM_SECTIONS = [
  {
    title: "Restaurant Operations",
    body: "Run day-to-day service: branches, staff roles, kitchen flow, and operational visibility in one place.",
  },
  {
    title: "Digital Menus",
    body: "QR-linked menus with photos and video, table-specific links, and brand-consistent guest experiences.",
  },
  {
    title: "Reservations and Table Management",
    body: "Bookings, reception, seating, and table status so teams know who is arriving and who is seated.",
  },
  {
    title: "Customer Communication",
    body: "WhatsApp and in-product messaging workflows to stay in touch before and after the visit.",
  },
  {
    title: "AI-Assisted Marketing Insights",
    body: "Optional AI suggestions for copy and planning — reviewed by your team; not auto-published to ad platforms.",
  },
  {
    title: "Security and Data Isolation",
    body: "Multi-tenant SaaS: each restaurant sees only its own data. Integration tokens stored encrypted on the server.",
  },
  {
    title: "Google Ads Reporting",
    body: "Connect your Google Ads account via OAuth, pick your ad account, and view authorized performance metrics.",
  },
] as const;

export default function HomePage() {
  return (
    <div lang="en" dir="ltr" className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-emerald-800">
            MenuHus
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-emerald-700">
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-emerald-50 to-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Multi-restaurant SaaS
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              MenuHus — Restaurant Operations and Marketing Platform
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
              MenuHus helps restaurants manage digital menus, reservations, tables, customer
              communication, and advertising performance from one secure platform.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
              MenuHus is a multi-tenant SaaS platform. Each restaurant operates in an isolated
              workspace and sees only its own menus, guests, staff, and authorized integrations
              (including Google Ads accounts the owner connects).
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/google-ads-api"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-800"
              >
                Learn about Google Ads Integration
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Contact
              </Link>
            </div>
          </div>
        </section>

        <section id="google-ads-reporting" className="border-b border-slate-100 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-slate-900">Google Ads Reporting Integration</h2>
            <ul className="mt-8 max-w-4xl space-y-3 text-slate-700">
              <li>
                Restaurant owners connect their own Google Ads account through Google OAuth.
              </li>
              <li>
                MenuHus reads authorized reporting data such as spend, impressions, clicks,
                conversions, and campaign performance.
              </li>
              <li>The current integration is reporting only.</li>
              <li>
                MenuHus does not create, edit, pause, or publish campaigns or budgets through the
                API.
              </li>
            </ul>
            <div className="mt-10">
              <GoogleAdsReportingMockup />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Illustration only — no tokens, secrets, or live metrics on this public page.
            </p>
            <a
              href="https://www.menuhus.com/google-ads-api"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-800"
            >
              Google Ads API — full integration details
            </a>
          </div>
        </section>

        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-slate-900">Platform capabilities</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_SECTIONS.map((s) => (
                <article
                  key={s.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-lg font-bold text-white">MenuHus</p>
              <p className="mt-2 text-sm">
                <a href={`mailto:${MENUHUS_CONTACT_EMAIL}`} className="hover:text-white">
                  {MENUHUS_CONTACT_EMAIL}
                </a>
              </p>
              <p className="mt-1 text-sm">Saudi Arabia</p>
              <p className="mt-2 text-sm">
                <a href={MENUHUS_SITE} className="hover:text-white">
                  {MENUHUS_SITE}
                </a>
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Compliance &amp; legal
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/google-ads-api" className="hover:text-white">
                    Google Ads API
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Product access
              </p>
              <p className="mt-3 text-sm leading-relaxed">
                Restaurant teams sign in to manage operations. This marketing site does not expose
                dashboard data or redirect visitors automatically into the app.
              </p>
              <Link href="/login" className="mt-3 inline-block text-sm text-emerald-400 hover:text-emerald-300">
                Sign in for existing accounts
              </Link>
            </div>
          </div>
          <p className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} MenuHus ·{" "}
            <Link href="/google-ads-api" className="hover:text-slate-300">
              Google Ads API
            </Link>
            {" · "}
            <Link href="/privacy" className="hover:text-slate-300">
              Privacy
            </Link>
            {" · "}
            <Link href="/terms" className="hover:text-slate-300">
              Terms
            </Link>
            {" · "}
            <Link href="/contact" className="hover:text-slate-300">
              Contact
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
