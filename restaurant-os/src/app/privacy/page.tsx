import Link from "next/link";
import {
  MenuHusPublicShell,
  MENUHUS_CONTACT_EMAIL,
  publicPageMetadata,
} from "@/components/public/menuhus-public-shell";

export const metadata = publicPageMetadata(
  "Privacy Policy",
  "MenuHus privacy policy: data we collect, Google OAuth and Google Ads reporting, storage, no sale of data, and deletion on disconnect."
);

export default function PrivacyPage() {
  return (
    <MenuHusPublicShell
      title="Privacy Policy"
      subtitle="Last updated: 2026. MenuHus (“we”, “us”) operates the SaaS platform at menuhus.com."
    >
      <section>
        <h2>Overview</h2>
        <p>
          MenuHus is a multi-restaurant software platform. We process personal and business data
          only to provide the service, improve security, and—when you connect integrations—sync
          data you authorize (such as Google Ads reporting).
        </p>
      </section>

      <section>
        <h2>Data we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> name, email, role, restaurant affiliation, authentication
            logs.
          </li>
          <li>
            <strong>Restaurant operations:</strong> menus, tables, reservations, orders, customer
            messages you choose to store, staff permissions.
          </li>
          <li>
            <strong>Usage and diagnostics:</strong> aggregated usage, error logs (without secrets),
            device/browser type for security.
          </li>
          <li>
            <strong>Payment-related metadata:</strong> subscription status via our billing provider;
            we do not store full payment card numbers on MenuHus servers.
          </li>
        </ul>
      </section>

      <section>
        <h2>Google OAuth and Google Ads</h2>
        <p>
          If you connect Google Ads, you use Google OAuth. We receive OAuth tokens scoped to what
          you approve on Google&apos;s consent screen. For our current reporting integration we use
          those tokens to read campaign performance metrics (spend, clicks, impressions,
          conversions, and related reporting fields)—not to run ads on your behalf without your
          action in the dashboard.
        </p>
        <ul>
          <li>Tokens are stored encrypted using server-side secrets.</li>
          <li>We do not display OAuth tokens, refresh tokens, or developer tokens on public pages.</li>
          <li>You select which Google Ads customer account to link.</li>
        </ul>
      </section>

      <section>
        <h2>Why we use this data</h2>
        <ul>
          <li>Provide and secure the MenuHus application.</li>
          <li>Show your team operational and marketing reporting in one place.</li>
          <li>Support, fraud prevention, and compliance with applicable law.</li>
        </ul>
      </section>

      <section>
        <h2>Storage and protection</h2>
        <p>
          Data is hosted on reputable cloud infrastructure with access controls, encryption in
          transit (HTTPS), and encryption for sensitive integration tokens at rest. Access is
          limited to authorized personnel on a need-to-know basis for support and operations.
        </p>
      </section>

      <section>
        <h2>No sale of personal data</h2>
        <p>
          We do not sell your personal information or your Google Ads metrics to third parties. We
          do not share integration data with advertisers or data brokers.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <ul>
          <li>
            When you disconnect Google Ads (or Google Business Profile), we deactivate the
            connection and stop syncing; tokens can be cleared as part of disconnect.
          </li>
          <li>
            You may request deletion of your account or integration data by contacting us. We will
            delete or anonymize data unless we must retain it for legal obligations.
          </li>
        </ul>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Privacy questions or deletion requests:{" "}
          <a href={`mailto:${MENUHUS_CONTACT_EMAIL}`}>{MENUHUS_CONTACT_EMAIL}</a>
        </p>
        <p>
          See also <Link href="/google-ads-api">Google Ads API — Reporting Use</Link> and{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </MenuHusPublicShell>
  );
}
