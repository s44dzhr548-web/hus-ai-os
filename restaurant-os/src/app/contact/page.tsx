import {
  MenuHusPublicShell,
  MENUHUS_CONTACT_EMAIL,
  MENUHUS_SITE,
  publicPageMetadata,
} from "@/components/public/menuhus-public-shell";

export const metadata = publicPageMetadata(
  "Contact",
  "Contact MenuHus for support, privacy requests, and Google Ads API compliance questions."
);

export default function ContactPage() {
  return (
    <MenuHusPublicShell
      title="Contact MenuHus"
      subtitle="We respond to product, privacy, and integration questions during business hours."
    >
      <section>
        <h2>MenuHus</h2>
        <ul className="list-none pl-0">
          <li>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${MENUHUS_CONTACT_EMAIL}`}>{MENUHUS_CONTACT_EMAIL}</a>
          </li>
          <li>
            <strong>Website:</strong>{" "}
            <a href={MENUHUS_SITE}>{MENUHUS_SITE}</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>Topics we can help with</h2>
        <ul>
          <li>Account access and restaurant onboarding</li>
          <li>Google Ads OAuth and reporting integration</li>
          <li>Privacy and data deletion requests</li>
          <li>Google Ads API compliance review</li>
        </ul>
      </section>

      <p className="text-sm text-slate-600">
        Please do not send passwords, OAuth tokens, or developer tokens by email.
      </p>
    </MenuHusPublicShell>
  );
}
