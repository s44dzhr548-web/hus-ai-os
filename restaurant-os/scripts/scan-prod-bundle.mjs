const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

async function main() {
  const html = await (await fetch(`${BASE}/dashboard/reception`)).text();
  const all = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))];
  let combined = html;
  for (const src of all) {
    try {
      combined += await (await fetch(`${BASE}${src}`)).text();
    } catch {
      /* skip */
    }
  }
  const needles = [
    "إدخال يدوي",
    "manual-table-number",
    "تعديل البيانات",
  ];
  for (const n of needles) {
    console.log(n, combined.includes(n) ? "PASS" : "FAIL");
  }
  const rec = all.find((s) => s.includes("reception"));
  console.log("reception chunk:", rec || "not in html");
  if (rec) {
    const t = await (await fetch(`${BASE}${rec}`)).text();
    console.log("chunk manual-table-number:", t.includes("manual-table-number"));
  }
}

main();
