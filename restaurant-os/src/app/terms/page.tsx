import Link from "next/link";
import {
  MenuHusPublicShell,
  MENUHUS_CONTACT_EMAIL,
  publicPageMetadata,
} from "@/components/public/menuhus-public-shell";

export const metadata = publicPageMetadata(
  "Terms of Service",
  "Terms of use for MenuHus: user responsibilities, advertising accounts, no campaign guarantees, liability limits, and contact."
);

export default function TermsPage() {
  return (
    <MenuHusPublicShell
      title="Terms of Service"
      subtitle="By using MenuHus you agree to these terms. If you do not agree, do not use the service."
    >
      <section>
        <h2>Service description</h2>
        <p>
          MenuHus provides software for restaurants: digital menus, reservations, table management,
          customer communication tools, and optional integrations such as Google Ads reporting.
          Features may change as we improve the product.
        </p>
      </section>

      <section>
        <h2>Your account and advertising accounts</h2>
        <ul>
          <li>You are responsible for keeping login credentials secure.</li>
          <li>
            You are responsible for Google Ads (and other ad platform) accounts you connect. You
            must have rights to link those accounts.
          </li>
          <li>
            You are responsible for compliance with Google Ads policies and applicable advertising
            laws in your region.
          </li>
        </ul>
      </section>

      <section>
        <h2>No guarantee of campaign results</h2>
        <p>
          MenuHus may display metrics and insights from connected platforms. We do not guarantee
          impressions, clicks, conversions, revenue, or return on ad spend. Reporting is provided
          &quot;as is&quot; from third-party APIs and may be delayed or incomplete.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          You may not misuse MenuHus: no unauthorized access, scraping of other tenants&apos; data,
          malware, harassment, or illegal content. We may suspend or terminate accounts that violate
          these terms or pose security risk.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, MenuHus and its operators are not liable for
          indirect, incidental, or consequential damages, lost profits, or loss of data arising
          from use of the service or third-party integrations (including Google Ads outages). Our
          total liability for any claim relating to the service is limited to the fees you paid
          MenuHus in the twelve (12) months before the claim, or one hundred (100) USD if you use
          a free tier.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          You may stop using MenuHus at any time. We may suspend or terminate access for breach,
          non-payment, or legal requirement. Provisions that should survive (liability limits, governing
          law) survive termination.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${MENUHUS_CONTACT_EMAIL}`}>{MENUHUS_CONTACT_EMAIL}</a>
        </p>
        <p>
          <Link href="/privacy">Privacy Policy</Link> · <Link href="/contact">Contact</Link>
        </p>
      </section>
    </MenuHusPublicShell>
  );
}
