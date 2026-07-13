const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

async function main() {
  const loginPage = await (await fetch(`${BASE}/login`)).text();
  const buildMatch = loginPage.match(/"b":"([^"]+)"/);
  const buildId = buildMatch?.[1];
  console.log("buildId:", buildId);

  const manifestUrl = `${BASE}/_next/static/${buildId}/_buildManifest.js`;
  const manifest = await (await fetch(manifestUrl)).text();
  const receptionFiles = [...manifest.matchAll(/dashboard\/reception[^"']+\.js/g)].map((m) => m[0]);
  console.log("manifest reception files:", receptionFiles.length);

  let pass = 0;
  let fail = 0;
  for (const file of receptionFiles) {
    const url = `${BASE}/_next/static/chunks/app/${file}`;
    const js = await (await fetch(url)).text();
    for (const n of ["manual-table-number", "إدخال يدوي", "تعديل البيانات"]) {
      if (js.includes(n)) {
        console.log("PASS:", n, "in", file);
        pass++;
      }
    }
  }

  if (!receptionFiles.length) {
    const fallback = `${BASE}/_next/static/chunks/app/dashboard/reception/page`;
    for (let i = 0; i < 5; i++) {
      /* try common hash pattern via manifest only */
    }
    console.log("FAIL: no reception chunks in manifest");
    fail = 3;
  }

  if (pass >= 3) {
    console.log("\nUI BUNDLE: PASS");
    process.exit(0);
  }
  console.log("\nUI BUNDLE: FAIL", pass, "matches");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
