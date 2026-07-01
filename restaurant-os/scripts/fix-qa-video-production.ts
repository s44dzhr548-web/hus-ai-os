/**
 * Replace fake 28-byte QA stub with a real playable MP4 on production.
 * Usage: npx tsx scripts/fix-qa-video-production.ts [baseUrl] [itemId]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ITEM_ID = process.argv[3] || "cmqjwuncr0001l1046g09tuom";
const SAMPLE_MP4 =
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
  console.log(`=== Fix QA video on ${BASE} ===\nItem: ${ITEM_ID}\n`);

  const sampleRes = await fetch(SAMPLE_MP4);
  if (!sampleRes.ok) throw new Error(`Sample download failed: ${sampleRes.status}`);
  const videoBuffer = Buffer.from(await sampleRes.arrayBuffer());
  console.log(`✓ Downloaded sample MP4 (${videoBuffer.length} bytes)`);

  const cookie = await login("admin@menuos.sa", "admin123456");
  if (!cookie) throw new Error("Login failed");
  console.log("✓ Login");

  const form = new FormData();
  form.append("file", new Blob([videoBuffer], { type: "video/mp4" }), "qa-playable.mp4");
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
  console.log("✓ Uploaded:", videoUrl);

  const updateRes = await fetch(`${BASE}/api/menu/items`, {
    method: "PUT",
    headers: authHeaders(cookie),
    body: JSON.stringify({
      id: ITEM_ID,
      mediaType: "VIDEO",
      videoUrl,
    }),
  });
  const updated = await json(updateRes);
  if (!updateRes.ok) throw new Error(`Update item failed: ${updated.error || updateRes.status}`);
  console.log("✓ Menu item updated:", updated.name, updated.videoUrl);

  const tables = await json(await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } }));
  const table = Array.isArray(tables) ? tables[0] : null;
  if (!table?.id) throw new Error("No table found");

  const menuRes = await fetch(`${BASE}/api/public/menu/${table.id}`, { cache: "no-store" });
  const publicMenu = await json(menuRes);
  const allItems = (publicMenu?.categories || []).flatMap(
    (c: { items?: { id: string; videoUrl?: string; mediaType?: string; name?: string }[] }) =>
      c.items || []
  );
  const menuItem = allItems.find((i: { id: string }) => i.id === ITEM_ID);
  if (!menuItem) throw new Error("Item not found on public menu");
  if (menuItem.videoUrl !== videoUrl) throw new Error("Public menu videoUrl mismatch");
  console.log("✓ Public menu has new R2 URL");

  console.log("\n=== DONE ===");
  console.log("Customer menu:", `${BASE}/menu/${table.id}`);
  console.log("Search for:", menuItem.name);
  console.log("Video URL:", videoUrl);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
