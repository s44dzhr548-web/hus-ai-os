/**
 * Production QA: video studio + legacy job lookup
 * Usage: npx tsx scripts/video-studio-prod-qa.mjs [baseUrl] [jobId]
 */
import fs from "fs";
import path from "path";
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();

const BASE = process.argv[2] || "https://www.menuhus.com";
const LEGACY_JOB = process.argv[3] || "8eaa7926-f13a-41af-83e9-706a4519d10d";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail: detail || "" });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res) {
  return res.json().catch(() => ({}));
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return [
    ...cookies.map((c) => c.split(";")[0]),
    ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

function tinyPngBuffer() {
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return Buffer.from(b64, "base64");
}

async function main() {
  console.log(`\n=== Video Studio Production QA ===\nBase: ${BASE}\nLegacy job: ${LEGACY_JOB}\n`);

  const dbUrl = process.env.DATABASE_URL;
  let legacyFromDb = null;
  if (dbUrl) {
    const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    try {
      legacyFromDb = await prisma.marketingVideoJob.findUnique({ where: { id: LEGACY_JOB } });
      if (legacyFromDb) {
        record("Legacy job (DB)", true, `status=${legacyFromDb.status} error=${legacyFromDb.errorMessage || "—"}`);
      } else {
        record("Legacy job (DB)", false, "not found in marketing_video_jobs");
      }
    } finally {
      await prisma.$disconnect();
    }
  } else {
    record("Legacy job (DB)", false, "no DATABASE_URL");
  }

  let cookie;
  try {
    cookie = await login();
    record("Login", Boolean(cookie));
  } catch (e) {
    record("Login", false, e.message);
    printSummary();
    process.exit(1);
  }

  const h = { Cookie: cookie };
  const hj = { Cookie: cookie, "Content-Type": "application/json" };

  const studioPage = await fetch(`${BASE}/dashboard/marketing/creative/videos`, {
    headers: h,
    redirect: "manual",
  });
  record(
    "Creative Studio page",
    studioPage.status === 200,
    `HTTP ${studioPage.status} → ${BASE}/dashboard/marketing/creative/videos`
  );

  const providers = await json(await fetch(`${BASE}/api/marketing/creative/video-providers`, { headers: h }));
  const runwayConnected = (providers.providers || []).some((p) => p.key === "RUNWAY");
  record("Runway provider listed", runwayConnected, runwayConnected ? "connected" : "not in list");

  const fd1 = new FormData();
  fd1.append("file", new Blob([tinyPngBuffer()], { type: "image/png" }), "qa-ref-1.png");
  fd1.append("category", "REFERENCE_IMAGE");
  fd1.append("source", "device");
  fd1.append("isPrimary", "true");
  const up1 = await json(await fetch(`${BASE}/api/marketing/creative/media-library`, { method: "POST", headers: h, body: fd1 }));
  const img1 = up1.asset?.id;
  record("Upload image 1", Boolean(img1), img1 || up1.error);

  if (img1) {
    const prev = await fetch(`${BASE}/api/marketing/creative/media-library/${img1}/preview`, { headers: h });
    record("Image thumbnail preview", prev.ok && (prev.headers.get("content-type") ?? "").startsWith("image/"), `HTTP ${prev.status}`);
  }

  const fd2 = new FormData();
  fd2.append("file", new Blob([tinyPngBuffer()], { type: "image/png" }), "qa-ref-2.png");
  fd2.append("category", "REFERENCE_IMAGE");
  fd2.append("source", "device");
  const up2 = await json(await fetch(`${BASE}/api/marketing/creative/media-library`, { method: "POST", headers: h, body: fd2 }));
  const img2 = up2.asset?.id;
  record("Upload image 2 (multi)", Boolean(img2), img2 || up2.error);

  const storyboard = [
    { id: "sc-1", order: 0, label: "المشهد 1", assetId: img1 },
    { id: "sc-2", order: 1, label: "المشهد 2", assetId: img2 },
  ].filter((s) => s.assetId);

  const projectSave = await json(
    await fetch(`${BASE}/api/marketing/creative/video-projects`, {
      method: "POST",
      headers: hj,
      body: JSON.stringify({
        name: "QA Studio Project",
        prompt: "QA automated test — restaurant b-roll, no text in scene",
        providerKey: "RUNWAY",
        mode: "image_to_video",
        aspectRatio: "9:16",
        durationSec: 5,
        modelId: "gen4.5",
        storyboard,
        assetIds: [img1, img2].filter(Boolean),
      }),
    })
  );
  const projectId = projectSave.project?.id;
  record("Save project", Boolean(projectId), projectId || projectSave.error);

  let reloaded = null;
  if (projectId) {
    reloaded = await json(
      await fetch(`${BASE}/api/marketing/creative/video-projects?id=${projectId}`, { headers: h })
    );
    const ok =
      reloaded.project?.id === projectId &&
      (reloaded.project?.assetIds?.length || 0) >= (img1 && img2 ? 2 : img1 ? 1 : 0);
    record("Reload project (API)", ok, ok ? `${reloaded.project.assetIds?.length} assets` : reloaded.error);
    const reloaded2 = await json(
      await fetch(`${BASE}/api/marketing/creative/video-projects?id=${projectId}`, { headers: h })
    );
    record(
      "Project after refresh simulation",
      reloaded2.project?.id === projectId,
      reloaded2.project?.id === projectId ? "stable id" : reloaded2.error
    );
  } else {
    record("Reload project (API)", false, "no projectId");
  }

  record("Storyboard persisted", Boolean(reloaded?.project?.storyboard?.length >= 1), String(reloaded?.project?.storyboard?.length ?? 0));

  const tinyMp4 = Buffer.from(
    "AAAAFGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAA",
    "base64"
  );
  const fdv = new FormData();
  fdv.append("file", new Blob([tinyMp4], { type: "video/mp4" }), "qa-ref.mp4");
  fdv.append("category", "REFERENCE_VIDEO");
  fdv.append("source", "device");
  const upv = await json(await fetch(`${BASE}/api/marketing/creative/media-library`, { method: "POST", headers: h, body: fdv }));
  record(
    "Upload reference video",
    Boolean(upv.asset?.id) || String(upv.error || "").includes("200MB") === false,
    upv.asset?.id ? "ok" : upv.error || "may fail if invalid mp4 — endpoint reached"
  );

  const jobsList = await json(await fetch(`${BASE}/api/marketing/creative/video/jobs`, { headers: h }));
  const hasJobsFields =
    Array.isArray(jobsList.jobs) &&
    (jobsList.jobs.length === 0 ||
      (jobsList.jobs[0].status &&
        jobsList.jobs[0].createdAt &&
        jobsList.jobs[0].providerKey != null &&
        "progress" in jobsList.jobs[0]));
  record("Generation log API", hasJobsFields, `${jobsList.jobs?.length ?? 0} jobs`);

  let legacyApi = await json(
    await fetch(`${BASE}/api/marketing/creative/video/jobs/${LEGACY_JOB}`, { headers: h })
  );
  if (legacyApi.status === "PROCESSING" || legacyApi.jobId) {
    legacyApi = await json(
      await fetch(`${BASE}/api/marketing/creative/video/jobs/${LEGACY_JOB}`, { headers: h })
    );
  }
  if (legacyApi.jobId || legacyApi.status) {
    const url = legacyApi.finalOutputUrl || legacyApi.outputUrl;
    record(
      "Legacy job (API refresh)",
      true,
      `status=${legacyApi.status}${url ? " hasOutput" : ""}${legacyApi.error ? ` err=${legacyApi.error}` : ""}`
    );
    if (legacyApi.status === "SUCCEEDED" && url) {
      record("Legacy job video URL", true, url.slice(0, 80) + "...");
    } else if (legacyApi.status === "FAILED") {
      record("Legacy job failure reason", true, legacyApi.error || legacyFromDb?.errorMessage || "unknown");
    }
  } else {
    record("Legacy job (API)", false, legacyApi.error || "no access or not found");
  }

  let runwayJobId = null;
  if (runwayConnected && img1) {
    const gen = await json(
      await fetch(`${BASE}/api/marketing/creative/video/generate`, {
        method: "POST",
        headers: hj,
        body: JSON.stringify({
          providerKey: "RUNWAY",
          mode: "image_to_video",
          prompt: "Slow cinematic push-in on restaurant dish, warm lighting, QA test",
          aspect: "9:16",
          durationSec: 5,
          model: "gen4.5",
          projectId,
          imageAssetIds: [img1],
          storyboard: img1 && img2 ? storyboard : undefined,
          saveProject: true,
        }),
      })
    );
    runwayJobId = gen.jobId;
    record("Runway generation started", Boolean(runwayJobId), runwayJobId || gen.error);

    if (runwayJobId) {
      let status = "PROCESSING";
      let last = null;
      for (let i = 0; i < 36 && status === "PROCESSING"; i++) {
        await new Promise((r) => setTimeout(r, 10000));
        last = await json(await fetch(`${BASE}/api/marketing/creative/video/jobs/${runwayJobId}`, { headers: h }));
        status = last.status;
        process.stdout.write(`  poll ${i + 1}: ${status}\n`);
      }
      const out = last?.finalOutputUrl || last?.outputUrl;
      record(
        "Runway generation result",
        status === "SUCCEEDED" && Boolean(out),
        status === "SUCCEEDED" ? `output ready` : status === "FAILED" ? last?.error : `status=${status} (timeout partial)`
      );
      if (out) record("Runway output URL", true, out.slice(0, 100));
    }
  } else {
    record("Runway generation started", false, "skipped — no Runway or no images");
  }

  printSummary();
}

function printSummary() {
  console.log("\n--- SUMMARY JSON ---");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
