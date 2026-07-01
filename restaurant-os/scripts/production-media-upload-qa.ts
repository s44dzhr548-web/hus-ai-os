/**
 * Production media upload QA — image + video via presign flow.
 * Usage: npx tsx scripts/production-media-upload-qa.ts [baseUrl]
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const FAKE_MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31,
  0x00, 0x00, 0x00, 0x00, 0x6d, 0x64, 0x61, 0x74, 0x00, 0x00, 0x00, 0x00,
]);

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

async function login(email: string, password: string): Promise<string> {
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
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return (loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
}

function isR2PublicUrl(url: string): boolean {
  return url.includes(".r2.dev/") && !url.includes("/api/media/");
}

async function uploadViaServerForm(
  cookie: string,
  mediaType: "image" | "video",
  fileName: string,
  fileType: string,
  body: Buffer
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([body], { type: fileType }), fileName);
  form.append("type", mediaType);

  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const data = await json(res);
  if (!res.ok) throw new Error(`upload ${mediaType}: ${data.error || res.status}`);
  if (!data.url || !isR2PublicUrl(data.url)) {
    throw new Error(`${mediaType} URL invalid: ${data.url}`);
  }
  return data.url as string;
}

async function uploadViaPresign(
  cookie: string,
  mediaType: "image" | "video",
  fileName: string,
  fileType: string,
  body: Buffer
): Promise<{ publicUrl: string; uploadUrl: string }> {
  const presignRes = await fetch(`${BASE}/api/upload/presign`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      mediaType,
      fileName,
      fileSize: body.length,
      fileType,
    }),
  });
  const presign = await json(presignRes);
  if (!presignRes.ok) {
    throw new Error(`presign ${mediaType}: ${presign.error || presignRes.status}`);
  }

  const { uploadUrl, publicUrl, contentType } = presign as {
    uploadUrl: string;
    publicUrl: string;
    contentType: string;
  };

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType || fileType },
    body,
  });
  if (!putRes.ok) {
    throw new Error(`R2 PUT ${mediaType}: ${putRes.status}`);
  }

  return { publicUrl, uploadUrl };
}

async function verifyPublic(url: string, label: string) {
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) throw new Error(`${label} public HEAD failed: ${head.status}`);
  if (!isR2PublicUrl(url)) throw new Error(`${label} URL is not R2 public: ${url}`);
  console.log(`✓ ${label}: ${url} (${head.status})`);
}

async function verifyCorsPreflight(uploadUrl: string) {
  const origin = "https://restaurant-os-nine.vercel.app";
  const res = await fetch(uploadUrl, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  const allowOrigin = res.headers.get("access-control-allow-origin");
  const allowMethods = res.headers.get("access-control-allow-methods");
  console.log(
    `CORS preflight: ${res.status} allow-origin=${allowOrigin || "none"} methods=${allowMethods || "none"}`
  );
  if (!allowOrigin) {
    console.warn("⚠ CORS preflight missing Access-Control-Allow-Origin — browser uploads may fail");
  }
}

async function main() {
  console.log(`=== Production Media Upload QA ===\n${BASE}\n`);

  const cfg = await json(await fetch(`${BASE}/api/upload/config`));
  console.log("R2 configured:", cfg.r2Configured ? "YES" : "NO");
  if (!cfg.r2Configured) {
    console.error("Storage not configured on production");
    process.exit(1);
  }

  const cookie = await login("admin@menuos.sa", "admin123456");
  if (!cookie) {
    console.error("Login failed");
    process.exit(1);
  }
  console.log("Login OK\n");

  const imageUrl = await uploadViaServerForm(
    cookie,
    "image",
    "qa-test.png",
    "image/png",
    TINY_PNG
  );
  await verifyPublic(imageUrl, "Image upload (server → R2)");

  const videoUrl = await uploadViaServerForm(
    cookie,
    "video",
    "qa-test.mp4",
    "video/mp4",
    FAKE_MP4
  );
  await verifyPublic(videoUrl, "Video upload (server → R2)");

  const largeVideo = await uploadViaPresign(
    cookie,
    "video",
    "qa-presign.mp4",
    "video/mp4",
    FAKE_MP4
  );
  await verifyPublic(largeVideo.publicUrl, "Video presign upload");
  await verifyCorsPreflight(largeVideo.uploadUrl);

  console.log("\n=== ALL PASSED ===");
  console.log("Image URL:", imageUrl);
  console.log("Video URL:", videoUrl);
  console.log("Presign video URL:", largeVideo.publicUrl);
  console.log("Customer menu base:", BASE);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
