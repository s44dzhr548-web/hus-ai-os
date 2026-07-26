/**
 * Static + optional live checks for the four Fabrika/production fixes.
 * Usage: node scripts/fabrika-four-fixes-qa.mjs
 * Optional: BASE_URL=... for live API checks
 */
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const results = [];

function assert(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function fileIncludes(rel, ...needles) {
  const p = path.join(projectRoot, rel);
  if (!fs.existsSync(p)) return false;
  const text = fs.readFileSync(p, "utf8");
  return needles.every((n) => text.includes(n));
}

assert(
  "check-in transaction",
  fileIncludes("src/lib/reservation-checkin.ts", "prisma.$transaction", "RESERVATION_CHECK_IN")
);
assert(
  "present guests date OR check-in",
  fileIncludes("src/lib/present-guests.ts", "checkedInAt", "arrivedAt")
);
assert(
  "confirm_arrival API",
  fileIncludes("src/app/api/reservations/[id]/route.ts", "confirm_arrival", "allowManualTable")
);
assert(
  "table 403 message",
  fileIncludes("src/lib/table-management-permissions.ts", "ليس لديك صلاحية لإدارة الطاولات")
);
assert(
  "reception permissions module",
  fileIncludes("src/lib/reception-permissions.ts", "assertManualTableAllowed")
);
assert(
  "qr print active tables",
  fileIncludes("src/app/api/qr/print/route.ts", "isActive: true", "menuUrlForTable(table.id")
);
assert(
  "table route id lookup",
  fileIncludes("src/app/r/[slug]/table/[tableCode]/page.tsx", "{ id: tableCode }")
);
assert(
  "menu URL uses table id",
  fileIncludes("src/lib/table-code.ts", "/table/${tableId}")
);
assert(
  "platforms recheck for read roles",
  fileIncludes("src/app/api/marketing/platforms/route.ts", 'action === "recheck"')
);
assert(
  "platforms client recheck action",
  fileIncludes(
    "src/app/dashboard/marketing/platforms/platforms-client.tsx",
    'action(p.key, "recheck")',
    "إعادة التحقق"
  )
);
assert(
  "google setup hint",
  fileIncludes("src/lib/platform/ads-integrations.ts", "googleAdsSetupHint")
);

const base = process.env.BASE_URL?.replace(/\/$/, "");
if (base) {
  try {
    const prev = await fetch(`${base}/api/qr/print?preview=1&branchId=invalid`, {
      redirect: "manual",
    });
    assert(
      "live qr preview auth",
      prev.status === 401 || prev.status === 403 || prev.status === 400,
      `status ${prev.status}`
    );
  } catch (e) {
    assert("live qr preview auth", false, String(e));
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nSummary: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
