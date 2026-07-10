/**
 * Verify reception UI strings exist in production JS bundle.
 * Usage: node scripts/verify-reception-ui.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const REQUIRED = [
  "إدخال يدوي",
  "اختيار طاولة موجودة",
  "manual-table-number",
  "تعديل البيانات",
  "تغيير الطاولة",
  "تعديل الحد الأدنى",
  "إنهاء الجلسة",
];

async function main() {
  console.log(`=== Reception UI Verify ===\n${BASE}\n`);

  const html = await (await fetch(`${BASE}/dashboard/reception`)).text();
  const scripts = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))];
  const pageScripts = scripts.filter(
    (s) =>
      s.includes("reception") ||
      s.includes("/dashboard/") ||
      s.includes("app/dashboard")
  );

  const toFetch = pageScripts.length ? pageScripts : scripts.slice(0, 50);
  let combined = html;
  for (const src of toFetch) {
    try {
      combined += await (await fetch(`${BASE}${src}`)).text();
    } catch {
      /* skip */
    }
  }

  // Also scan all chunk files from build manifest pattern
  const allScripts = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);
  for (const src of allScripts.slice(0, 40)) {
    try {
      combined += await (await fetch(`${BASE}${src}`)).text();
    } catch {
      /* skip */
    }
  }

  let pass = 0;
  let fail = 0;
  for (const needle of REQUIRED) {
    if (combined.includes(needle)) {
      console.log(`✓ found: ${needle}`);
      pass++;
    } else {
      console.error(`✗ missing: ${needle}`);
      fail++;
    }
  }

  console.log(`\n=== ${pass}/${REQUIRED.length} PASS, ${fail} FAIL ===`);
  console.log(`URL: ${BASE}/dashboard/reception`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
