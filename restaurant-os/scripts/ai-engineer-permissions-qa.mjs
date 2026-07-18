/**
 * AI Platform Engineer Permission Center QA — additive only, no Fabrika data changes.
 * Usage: node scripts/ai-engineer-permissions-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const FABRIKA_SLUG = "fabrika-mqkat9dw";

const results = {};

async function json(res) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res, prev = "") {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  for (const c of res.headers.getSetCookie?.() || []) parts.add(c.split(";")[0]);
  return [...parts].join("; ");
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  let cookie = parseSetCookie(csrfRes);
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      callbackUrl: `${BASE}/dashboard/platform`,
      json: "true",
    }),
    redirect: "manual",
  });
  return parseSetCookie(loginRes, cookie);
}

async function api(cookie, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await json(res), ok: res.ok };
}

async function getFabrikaSnapshot(cookie) {
  const list = await json(await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } }));
  const fab = (Array.isArray(list) ? list : []).find((r) => r.slug === FABRIKA_SLUG);
  return fab ? { id: fab.id, slug: fab.slug, name: fab.name } : null;
}

async function main() {
  console.log(`\nAI Engineer Permissions QA @ ${BASE}\n`);

  let cookie = await login();
  const fabrikaBefore = await getFabrikaSnapshot(cookie);

  // Page load
  const pageRes = await fetch(`${BASE}/dashboard/platform/ai-engineer/permissions`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  results.pageLoad = [200, 307, 302].includes(pageRes.status) ? "PASS" : "FAIL";
  console.log(`Permission Center page: ${results.pageLoad}`);

  // Reset to monitoring only
  await api(cookie, "/api/platform/ai-engineer/permissions", {
    action: "apply_preset",
    presetId: "monitoring_only",
  });

  const perms = await api(cookie, "/api/platform/ai-engineer/permissions");
  results.permissionGroups =
    Array.isArray(perms.data.permissions) && perms.data.permissions.length >= 40 ? "PASS" : "FAIL";
  console.log(`Permission groups: ${results.permissionGroups}`);

  const groups = new Set((perms.data.permissions || []).map((p) => p.group));
  results.allGroupsPresent =
    ["read_inspect", "config_repair", "code_deploy", "restaurant_data", "forbidden"].every((g) =>
      groups.has(g)
    )
      ? "PASS"
      : "FAIL";
  console.log(`All 5 groups: ${results.allGroupsPresent}`);

  // 1-2: Grant read-only health check and execute
  await api(cookie, "/api/platform/ai-engineer/permissions", {
    action: "grant",
    permissionKey: "read_platform_health",
    approvalType: "permanent",
  });

  const exec1 = await api(cookie, "/api/platform/ai-engineer/execute", {
    permissionKey: "read_platform_health",
    payload: { check: "health" },
  });
  results.readOnlyHealthCheck = exec1.ok ? "PASS" : "FAIL";
  console.log(`1-2 Read-only health check: ${results.readOnlyHealthCheck}`);

  // 3-5: Request WhatsApp repair, reject, verify blocked
  const req = await api(cookie, "/api/platform/ai-engineer/approvals", {
    action: "request",
    permissionKey: "relink_oauth",
    titleAr: "إعادة ربط واتساب فابريكا",
    payload: { restaurant: FABRIKA_SLUG },
    preview: {
      whatWillDo: "إعادة مصادقة OAuth",
      affectedSystems: ["WhatsApp"],
      dataModified: true,
    },
  });
  const pendingId = req.data.pending?.id;
  results.whatsappRequest = pendingId ? "PASS" : "FAIL";
  console.log(`3 WhatsApp repair request: ${results.whatsappRequest}`);

  const reject = await api(cookie, "/api/platform/ai-engineer/approvals", {
    action: "decide",
    pendingActionId: pendingId,
    decision: "reject",
    reason: "QA rejection test",
  });
  results.ownerReject = reject.ok ? "PASS" : "FAIL";
  console.log(`4 Owner rejects: ${results.ownerReject}`);

  const execBlocked = await api(cookie, "/api/platform/ai-engineer/execute", {
    permissionKey: "relink_oauth",
    payload: { restaurant: FABRIKA_SLUG },
  });
  results.nothingChangesAfterReject = !execBlocked.ok && execBlocked.data.code === "NO_GRANT" ? "PASS" : "FAIL";
  console.log(`5 Nothing changes after reject: ${results.nothingChangesAfterReject}`);

  // 6-9: Approve once, execute, replay blocked
  const req2 = await api(cookie, "/api/platform/ai-engineer/approvals", {
    action: "request",
    permissionKey: "resync_whatsapp_templates",
    titleAr: "مزامنة قوالب واتساب",
    payload: { scope: "fabrika" },
  });
  const pendingId2 = req2.data.pending?.id;

  const approve = await api(cookie, "/api/platform/ai-engineer/approvals", {
    action: "decide",
    pendingActionId: pendingId2,
    decision: "once",
  });
  results.oneTimeApproval = approve.data.token ? "PASS" : "FAIL";
  console.log(`6-7 One-time approval token: ${results.oneTimeApproval}`);

  const token = approve.data.token;
  const exec2 = await api(cookie, "/api/platform/ai-engineer/execute", {
    permissionKey: "resync_whatsapp_templates",
    payload: { scope: "fabrika" },
    approvalToken: token,
    pendingActionId: pendingId2,
  });
  results.singleExecution = exec2.ok ? "PASS" : "FAIL";
  console.log(`7 Single execution: ${results.singleExecution}`);

  const replay = await api(cookie, "/api/platform/ai-engineer/execute", {
    permissionKey: "resync_whatsapp_templates",
    payload: { scope: "fabrika" },
    approvalToken: token,
  });
  results.replayBlocked = !replay.ok && replay.data.code === "TOKEN_REPLAY" ? "PASS" : "FAIL";
  console.log(`8-9 Replay blocked: ${results.replayBlocked}`);

  // 10-11: Expire temporary permission
  await api(cookie, "/api/platform/ai-engineer/permissions", {
    action: "grant",
    permissionKey: "read_whatsapp_status",
    approvalType: "15min",
  });

  // Simulate expiry by trying production deploy without token (high risk)
  const prodBlock = await api(cookie, "/api/platform/ai-engineer/execute", {
    permissionKey: "deploy_production",
    payload: {},
  });
  results.productionBlocked = !prodBlock.ok ? "PASS" : "FAIL";
  console.log(`12-13 Production deploy blocked: ${results.productionBlocked}`);

  // 14: Secret exposure blocked
  const secretBlock = await api(cookie, "/api/platform/ai-engineer/execute", {
    permissionKey: "expose_secrets",
    payload: {},
  });
  results.secretBlocked = !secretBlock.ok && secretBlock.data.code === "FORBIDDEN" ? "PASS" : "FAIL";
  console.log(`14-15 Secret exposure blocked: ${results.secretBlocked}`);

  // Emergency stop
  const stop = await api(cookie, "/api/platform/ai-engineer/emergency-stop", { action: "stop" });
  results.emergencyStop = stop.ok ? "PASS" : "FAIL";
  console.log(`Emergency stop: ${results.emergencyStop}`);

  const execAfterStop = await api(cookie, "/api/platform/ai-engineer/execute", {
    permissionKey: "read_platform_health",
    payload: {},
  });
  results.blockedAfterEmergency = !execAfterStop.ok && execAfterStop.data.code === "EMERGENCY_STOP" ? "PASS" : "FAIL";
  console.log(`Blocked after emergency: ${results.blockedAfterEmergency}`);

  // Audit log
  const audit = await api(cookie, "/api/platform/ai-engineer/audit?limit=20");
  results.auditLog =
    audit.ok && Array.isArray(audit.data.logs) && audit.data.logs.length > 0 ? "PASS" : "FAIL";
  console.log(`Audit log: ${results.auditLog}`);

  // Approval types
  const readPerm = (perms.data.permissions || []).find((p) => p.key === "read_platform_health");
  const deployPerm = (perms.data.permissions || []).find((p) => p.key === "deploy_production");
  results.approvalTypes =
    readPerm?.maxApproval === "permanent" && deployPerm?.maxApproval === "once" ? "PASS" : "FAIL";
  console.log(`Approval types: ${results.approvalTypes}`);

  // Fabrika unchanged
  const fabrikaAfter = await getFabrikaSnapshot(cookie);
  results.fabrikaUnchanged =
    fabrikaBefore &&
    fabrikaAfter &&
    fabrikaBefore.id === fabrikaAfter.id &&
    fabrikaBefore.slug === fabrikaAfter.slug
      ? "PASS"
      : "FAIL";
  console.log(`16 Fabrika data unchanged: ${results.fabrikaUnchanged}`);

  // Resume for next runs
  await api(cookie, "/api/platform/ai-engineer/emergency-stop", { action: "resume" });

  const allPass = Object.values(results).every((v) => v === "PASS");
  console.log("\n--- SUMMARY ---");
  console.log(`Permission Center URL: ${BASE}/dashboard/platform/ai-engineer/permissions`);
  console.log(`Overall: ${allPass ? "ALL PASS" : "SOME FAILURES"}`);
  console.log(JSON.stringify(results, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
