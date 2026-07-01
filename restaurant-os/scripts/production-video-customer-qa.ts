/**
 * End-to-end production video test: upload → menu item → public menu playback URL.
 * Usage: npx tsx scripts/production-video-customer-qa.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const SAMPLE_MP4_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

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

function authHeaders(cookie: string) {
  return { Cookie: cookie, "Content-Type": "application/json" } as Record<string, string>;
}

async function main() {
  console.log(`=== Production Video Customer QA ===\n${BASE}\n`);

  const cookie = await login("admin@menuos.sa", "admin123456");
  if (!cookie) throw new Error("Login failed");
  console.log("✓ Login");

  const sampleRes = await fetch(SAMPLE_MP4_URL);
  if (!sampleRes.ok) throw new Error(`Sample MP4 download failed: ${sampleRes.status}`);
  const sampleMp4 = Buffer.from(await sampleRes.arrayBuffer());

  const form = new FormData();
  form.append("file", new Blob([sampleMp4], { type: "video/mp4" }), "customer-qa.mp4");
  form.append("type", "video");
  const uploadRes = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const uploadData = await json(uploadRes);
  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadData.error || uploadRes.status}`);
  const videoUrl = uploadData.url as string;
  if (!videoUrl?.includes(".r2.dev/")) throw new Error(`Bad video URL: ${videoUrl}`);
  console.log("✓ Video uploaded:", videoUrl);

  const head = await fetch(videoUrl, { method: "HEAD" });
  const ct = head.headers.get("content-type") || "";
  console.log(`✓ Public HEAD ${head.status} content-type=${ct}`);
  if (!head.ok) throw new Error(`Public video not accessible: ${head.status}`);

  const categories = await json(
    await fetch(`${BASE}/api/menu/categories`, { headers: { Cookie: cookie } })
  );
  const category = Array.isArray(categories) ? categories[0] : null;
  if (!category?.id) throw new Error("No menu category found");

  const itemRes = await fetch(`${BASE}/api/menu/items`, {
    method: "POST",
    headers: authHeaders(cookie),
    body: JSON.stringify({
      name: `Video QA ${Date.now()}`,
      nameAr: "اختبار فيديو",
      description: "Production video test",
      descriptionAr: "اختبار فيديو",
      calories: 100,
      price: 25,
      categoryId: category.id,
      mediaType: "VIDEO",
      videoUrl,
      isAvailable: true,
    }),
  });
  const item = await json(itemRes);
  if (!itemRes.ok) throw new Error(`Create item failed: ${item.error || itemRes.status}`);
  console.log("✓ Menu item created:", item.id);

  const tables = await json(await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } }));
  const table = Array.isArray(tables) ? tables[0] : null;
  if (!table?.id) throw new Error("No table found");

  const publicMenu = await json(await fetch(`${BASE}/api/public/menu/${table.id}`));
  const allItems = [
    ...(publicMenu?.categories || []).flatMap((c: { items?: unknown[]; children?: { items?: unknown[] }[] }) => [
      ...(c.items || []),
      ...(c.children || []).flatMap((s) => s.items || []),
    ]),
  ];
  const menuItem = allItems.find((i: { id: string }) => i.id === item.id);
  if (!menuItem) throw new Error("Item not found on public menu");
  if (menuItem.mediaType !== "VIDEO") throw new Error(`mediaType=${menuItem.mediaType}`);
  if (menuItem.videoUrl !== videoUrl) throw new Error("videoUrl mismatch on public menu");
  console.log("✓ Public menu exposes videoUrl");

  const customerUrl = `${BASE}/menu/${table.id}`;
  console.log("\n=== PASSED ===");
  console.log("Video URL:", videoUrl);
  console.log("Customer menu:", customerUrl);
  console.log("Item:", menuItem.name);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
