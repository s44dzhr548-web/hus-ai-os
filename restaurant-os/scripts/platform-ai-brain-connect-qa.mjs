/**
 * Platform AI Brain connect/save QA — validates API contract without storing fake keys.
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";

async function json(res) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res, prev = "") {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  for (const c of res.headers.getSetCookie?.() || []) parts.add(c.split(";")[0]);
  return [...parts].join("; ");
}

async function loginPlatformAdmin() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  let cookie = parseSetCookie(csrfRes);
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({
      csrfToken,
      email: process.env.QA_ADMIN_EMAIL || "admin@menuos.sa",
      password: process.env.QA_ADMIN_PASSWORD || "admin123456",
      callbackUrl: `${BASE}/dashboard/platform`,
      json: "true",
    }),
    redirect: "manual",
  });
  return parseSetCookie(loginRes, cookie);
}

async function main() {
  console.log(`Platform AI Brain connect QA @ ${BASE}\n`);
  const cookie = await loginPlatformAdmin();

  const session = await json(await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } }));
  const isPlatformAdmin = Boolean(session?.user?.isPlatformAdmin);
  console.log("platformAdmin:", isPlatformAdmin ? "PASS" : "FAIL");

  const emptyRolesRes = await fetch(`${BASE}/api/platform/ai-providers/connect`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      providerKey: "OPENAI",
      apiKey: "KEEP",
      modelId: "gpt-4o-mini",
      roleAssignments: [],
      testAfterSave: false,
    }),
  });
  const emptyRoles = await json(emptyRolesRes);
  const validationPass =
    emptyRolesRes.status === 400 &&
    String(emptyRoles.error || "").includes("مهمة واحدة");
  console.log("emptyRolesValidation:", validationPass ? "PASS" : "FAIL");

  const statusBefore = await json(
    await fetch(`${BASE}/api/platform/ai-providers/status`, { headers: { Cookie: cookie } })
  );
  const openaiBefore = (statusBefore.providers || []).find((p) => p.key === "OPENAI");

  const saveRes = await fetch(`${BASE}/api/platform/ai-providers/connect`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      providerKey: "OPENAI",
      apiKey: "KEEP",
      modelId: "gpt-4o-mini",
      roleAssignments: ["MENU_OS_ASSISTANT", "PLATFORM_ENGINEER"],
      testAfterSave: false,
    }),
  });
  const save = await json(saveRes);
  const savePass =
    saveRes.status === 200 &&
    save.ok === true &&
    save.modelId === "gpt-4o-mini" &&
    Array.isArray(save.roleAssignments) &&
    save.roleAssignments.includes("MENU_OS_ASSISTANT") &&
    save.roleAssignments.includes("PLATFORM_ENGINEER") &&
    typeof save.statusLabelAr === "string";
  console.log("saveKeepMetadata:", savePass ? "PASS" : "FAIL");
  if (!savePass) console.log("  save body:", JSON.stringify(save));

  const statusAfter = await json(
    await fetch(`${BASE}/api/platform/ai-providers/status`, { headers: { Cookie: cookie } })
  );
  const openaiAfter = (statusAfter.providers || []).find((p) => p.key === "OPENAI");
  const noSecrets =
    !("apiKey" in (openaiAfter || {})) &&
    !("apiKeyEnc" in (openaiAfter || {})) &&
    JSON.stringify(statusAfter).indexOf("sk-") === -1;
  console.log("noSecretsInStatus:", noSecrets ? "PASS" : "FAIL");

  const rolesMatch =
    openaiAfter?.modelId === "gpt-4o-mini" &&
    openaiAfter?.roleAssignments?.includes("MENU_OS_ASSISTANT") &&
    openaiAfter?.roleAssignments?.includes("PLATFORM_ENGINEER");
  console.log("rolesPersisted:", rolesMatch ? "PASS" : "FAIL");

  const fabrikaRes = await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } });
  const restaurants = await json(fabrikaRes);
  const fabrika = (Array.isArray(restaurants) ? restaurants : []).find((r) => r.slug === "fabrika-mqkat9dw");
  console.log("fabrikaUntouched:", fabrika?.slug === "fabrika-mqkat9dw" ? "PASS" : "FAIL");

  let testPass = "SKIP";
  if (openaiAfter?.hasSecret) {
    const testRes = await fetch(`${BASE}/api/platform/ai-providers/test`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ providerKey: "OPENAI" }),
    });
    const test = await json(testRes);
    const ok =
      testRes.status === 200 &&
      test.ok === true &&
      test.keyValid === true &&
      test.modelId === "gpt-4o-mini" &&
      test.statusLabelAr === "متصل" &&
      test.lastTestLabelAr === "ناجح";
    testPass = ok ? "PASS" : "FAIL";
    if (!ok) console.log("  test body:", JSON.stringify({ status: testRes.status, ...test }));
  }
  console.log("connectionTest:", testPass);

  const allPass = [isPlatformAdmin, validationPass, savePass, noSecrets, rolesMatch, fabrika?.slug === "fabrika-mqkat9dw"].every(Boolean);
  console.log("\nOVERALL:", allPass ? "PASS" : "FAIL");
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
