/**
 * Blob storage QA — verifies Vercel Blob configuration and public playback.
 * Usage: npx tsx scripts/blob-storage-qa.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const FAKE_MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31,
]);
const FAKE_MOV = Buffer.from([
  0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0x6d, 0x70, 0x34, 0x31,
]);

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

function auth(cookie: string) {
  return { Cookie: cookie, "Content-Type": "application/json" } as Record<string, string>;
}

function isBlobUrl(url: string) {
  return url.includes("blob.vercel-storage.com") || url.includes("public.blob.vercel-storage.com");
}

async function upload(cookie: string, file: Blob, name: string, type: "image" | "video") {
  const form = new FormData();
  form.append("file", file, name);
  form.append("type", type);
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const data = await json(res);
  return { ok: res.ok, data, status: res.status };
}

async function main() {
  console.log(`=== Blob Storage QA ===\n${BASE}\n`);

  const cfg = await json(await fetch(`${BASE}/api/upload/config`));
  console.log(`Blob configured: ${cfg.directBlobUpload ? "YES" : "NO"}`);
  console.log(`Storage provider: ${cfg.storageProvider}`);
  if (cfg.blobSetupMessage) console.log(`Setup: ${cfg.blobSetupMessage}`);

  if (!cfg.directBlobUpload) {
    console.log("\n=== BLOCKED: BLOB_READ_WRITE_TOKEN not set ===");
    console.log("Create Blob store in Vercel Dashboard and link to project.");
    process.exit(1);
  }

  const adminCookie = await login("admin@menuos.sa", "admin123456");
  const email = `blob_qa_${Date.now()}@menuos.sa`;
  const created = await json(
    await fetch(`${BASE}/api/platform`, {
      method: "POST",
      headers: auth(adminCookie),
      body: JSON.stringify({
        restaurantName: "Blob QA",
        restaurantNameAr: "اختبار Blob",
        ownerName: "QA",
        ownerEmail: email,
        phone: "+966501234567",
        plan: "PRO",
        trialDays: 30,
      }),
    })
  );
  const ownerCookie = await login(email, created.tempPassword);

  const section = await json(
    await fetch(`${BASE}/api/menu/categories`, {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({ nameAr: "Blob QA", nameEn: "Blob QA" }),
    })
  );

  const img = await upload(
    ownerCookie,
    new Blob([TINY_PNG], { type: "image/png" }),
    "test.png",
    "image"
  );
  console.log(
    img.ok && isBlobUrl(img.data.url)
      ? `✓ Image → Blob: ${img.data.url.slice(0, 70)}...`
      : `✗ Image upload: ${img.data.error || img.status}`
  );

  const mp4 = await upload(
    ownerCookie,
    new Blob([FAKE_MP4], { type: "video/mp4" }),
    "test.mp4",
    "video"
  );
  console.log(
    mp4.ok && isBlobUrl(mp4.data.url)
      ? `✓ MP4 → Blob: ${mp4.data.url.slice(0, 70)}...`
      : `✗ MP4 upload: ${mp4.data.error || mp4.status}`
  );

  const mov = await upload(
    ownerCookie,
    new Blob([FAKE_MOV], { type: "video/quicktime" }),
    "IMG_1234.MOV",
    "video"
  );
  console.log(
    mov.ok && isBlobUrl(mov.data.url)
      ? `✓ MOV → Blob: ${mov.data.url.slice(0, 70)}...`
      : `✗ MOV upload: ${mov.data.error || mov.status}`
  );

  const videoUrl = mp4.data.url;
  const item = await json(
    await fetch(`${BASE}/api/menu/items`, {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({
        categoryId: section.id,
        nameAr: "فيديو Blob",
        descriptionAr: "اختبار",
        price: 40,
        calories: 200,
        videoUrl,
        mediaType: "VIDEO",
        previewUrl: videoUrl,
      }),
    })
  );

  const branches = await json(await fetch(`${BASE}/api/branches`, { headers: auth(ownerCookie) }));
  const table = await json(
    await fetch(`${BASE}/api/tables`, {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({
        branchId: branches[0].id,
        number: 900 + Math.floor(Math.random() * 99),
        label: "Blob",
      }),
    })
  );
  const qr = await json(await fetch(`${BASE}/api/qr?tableId=${table.id}`, { headers: auth(ownerCookie) }));

  const head = videoUrl ? await fetch(videoUrl, { method: "HEAD" }) : null;
  console.log(
    head?.ok
      ? `✓ Video HEAD ${head.status} ${head.headers.get("content-type")}`
      : `✗ Video not public`
  );

  const pub = await json(await fetch(`${BASE}/api/public/menu/${table.id}`));
  const pubItem = pub.categories?.[0]?.items?.find((i: { id: string }) => i.id === item.id);
  console.log(
    pubItem?.videoUrl && isBlobUrl(pubItem.videoUrl)
      ? `✓ Public menu uses Blob URL`
      : `✗ Public menu video URL wrong`
  );

  console.log(`\nVideo URL: ${videoUrl}`);
  console.log(`Customer menu: ${qr.menuUrl}`);
  process.exit(img.ok && mp4.ok && isBlobUrl(videoUrl) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
