/**
 * Check billing gateway configuration on production.
 * Usage: npx tsx scripts/check-billing-keys.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

async function main() {
  console.log(`=== Billing Gateway Check ===\n${BASE}\n`);

  const res = await fetch(`${BASE}/api/billing/config?scope=platform`, {
    headers: { Cookie: process.env.ADMIN_COOKIE || "" },
  });

  if (res.status === 401 || res.status === 403) {
    console.log("Config API requires admin login.");
    console.log("\nMissing keys (from Vercel env check):");
    console.log("  - MOYASAR_PUBLISHABLE_KEY");
    console.log("  - MOYASAR_SECRET_KEY");
    console.log("  - MOYASAR_WEBHOOK_SECRET");
    console.log("  - CRON_SECRET");
    console.log("  - MOYASAR_BILLING_MODE=live");
    console.log("\nWebhook URL:");
    console.log(`  ${BASE}/api/billing/webhook`);
    return;
  }

  const data = await res.json();
  console.log(`Mode: ${data.mode}`);
  console.log(`Ready: ${data.ready}`);
  console.log(`Live ready: ${data.liveReady}`);
  if (data.missingKeys?.length) {
    console.log(`\nMissing keys:`);
    data.missingKeys.forEach((k: string) => console.log(`  ✗ ${k}`));
  } else {
    console.log("\nAll keys configured.");
  }
  console.log(`\nWebhook: ${data.webhookUrl}`);
  console.log(`Methods: ${data.supportedMethods?.join(", ")}`);
}

main().catch(console.error);
