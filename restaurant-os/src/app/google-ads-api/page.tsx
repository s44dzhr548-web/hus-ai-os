import Link from "next/link";
import {
  MenuHusPublicShell,
  MENUHUS_CONTACT_EMAIL,
  MENUHUS_SITE,
  publicPageMetadata,
} from "@/components/public/menuhus-public-shell";

export const metadata = publicPageMetadata(
  "Google Ads API — Reporting Use",
  "How MenuHus connects to Google Ads via OAuth for read-only campaign reporting. Multi-restaurant SaaS; user-selected accounts; no third-party sharing."
);

function MarketingMockup() {
  return (
    <div
      className="not-prose my-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-lg"
      aria-hidden
    >
      <div className="border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-200">
        Marketing Platforms — reporting view (illustration)
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4285F4] text-xs font-bold text-white">
              G
            </span>
            <span className="text-sm font-semibold text-white">Google Ads</span>
            <span className="ms-auto rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300">
              Connected
            </span>
          </div>
          <p className="text-xs text-slate-400">Campaign spend · clicks · impressions · conversions</p>
          <p className="mt-2 text-xs text-slate-500">Last sync: read-only metrics</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sample metrics</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            <li>Spend (SAR): —</li>
            <li>Clicks: —</li>
            <li>Impressions: —</li>
            <li>Conversions: —</li>
          </ul>
        </div>
      </div>
      <p className="px-4 pb-4 text-xs text-slate-500">
        Illustration only — no live customer data or secrets are shown on this public page.
      </p>
    </div>
  );
}

export default function GoogleAdsApiPage() {
  return (
    <MenuHusPublicShell
      title="Google Ads API — Reporting Use"
      subtitle="MenuHus is a multi-restaurant SaaS platform. Restaurant owners connect their own Google Ads accounts through Google OAuth."
    >
      <section>
        <h2>Application purpose</h2>
        <p>
          MenuHus helps restaurants operate digitally (menus, reservations, tables, customer
          communication) and <strong>view advertising performance</strong> in one dashboard. Our
          current Google Ads API use case is <strong>reporting only</strong>.
        </p>
        <p>
          We do <strong>not</strong> use the Google Ads API in this compliance scope to create or
          edit campaigns, ad groups, ads, keywords, or budgets. Marketing suggestions in the product,
          if any, require explicit user review and are not executed automatically on Google Ads.
        </p>
      </section>

      <section>
        <h2>How Google Ads is connected</h2>
        <ul>
          <li>
            The restaurant owner (or authorized staff) starts OAuth from the MenuHus dashboard on{" "}
            <a href={MENUHUS_SITE}>{MENUHUS_SITE}</a>.
          </li>
          <li>Google&apos;s consent screen is shown; the user approves access to their Google account.</li>
          <li>
            After authorization, the user <strong>selects the ad account</strong> they want to link.
            MenuHus does not auto-assign accounts by guessing business names.
          </li>
          <li>
            Access and refresh tokens are stored encrypted on our servers and used only to sync
            reporting data for that restaurant.
          </li>
        </ul>
      </section>

      <section>
        <h2>Data we read (reporting)</h2>
        <p>With the user&apos;s permission, MenuHus reads Google Ads data such as:</p>
        <ul>
          <li>Campaign and account structure needed for reporting</li>
          <li>Spend and cost metrics</li>
          <li>Clicks and impressions</li>
          <li>Conversion-related metrics reported by Google Ads</li>
        </ul>
        <p>
          This data is displayed to the authenticated restaurant team inside MenuHus for analysis.
          It is not sold or shared with third parties for their own marketing purposes.
        </p>
      </section>

      <section>
        <h2>User control and automation</h2>
        <ul>
          <li>Users choose which Google Ads account to connect.</li>
          <li>Users can disconnect Google Ads from MenuHus at any time from the dashboard.</li>
          <li>
            Automated replies, budget changes, or campaign launches on Google Ads are{" "}
            <strong>not</strong> performed without the user&apos;s explicit action in the current
            reporting scope.
          </li>
        </ul>
      </section>

      <MarketingMockup />

      <section>
        <h2>Security note</h2>
        <p>
          This public page does not display developer tokens, client secrets, OAuth tokens, or
          customer-specific metrics. Credentials live only in secure server configuration and
          encrypted storage.
        </p>
      </section>

      <section>
        <h2>Related policies</h2>
        <ul>
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms">Terms of Service</Link>
          </li>
          <li>
            <Link href="/contact">Contact</Link> — {MENUHUS_CONTACT_EMAIL}
          </li>
        </ul>
      </section>
    </MenuHusPublicShell>
  );
}
