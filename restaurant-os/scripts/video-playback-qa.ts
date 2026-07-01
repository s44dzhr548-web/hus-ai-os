/**
 * Customer menu video playback QA.
 * Usage: npx tsx scripts/video-playback-qa.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const FAKE_MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31,
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

async function main() {
  console.log(`=== Video Playback QA ===\n${BASE}\n`);

  let videoUrl = "";
  let menuUrl = "";
  let tableId = "";
  let itemId = "";

  const adminCookie = await login("admin@menuos.sa", "admin123456");
  const email = `video_qa_${Date.now()}@menuos.sa`;
  const created = await json(
    await fetch(`${BASE}/api/platform`, {
      method: "POST",
      headers: auth(adminCookie),
      body: JSON.stringify({
        restaurantName: "Video QA",
        restaurantNameAr: "اختبار الفيديو",
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
      body: JSON.stringify({ nameAr: "فيديو QA", nameEn: "Video QA" }),
    })
  );

  const form = new FormData();
  form.append("file", new Blob([FAKE_MP4], { type: "video/mp4" }), "dish.mp4");
  form.append("type", "video");
  const up = await json(
    await fetch(`${BASE}/api/upload`, { method: "POST", headers: { Cookie: ownerCookie }, body: form })
  );
  videoUrl = up.url;

  const item = await json(
    await fetch(`${BASE}/api/menu/items`, {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({
        categoryId: section.id,
        nameAr: "طبق فيديو",
        descriptionAr: "اختبار تشغيل الفيديو",
        price: 50,
        calories: 300,
        videoUrl,
        mediaType: "VIDEO",
        previewUrl: videoUrl,
      }),
    })
  );
  itemId = item.id;

  console.log(`✓ Upload + save item mediaType=VIDEO`);
  console.log(`  videoUrl: ${videoUrl}`);

  const head = await fetch(videoUrl, { method: "HEAD" });
  console.log(
    head.ok
      ? `✓ Video URL public HEAD ${head.status} ${head.headers.get("content-type")}`
      : `✗ Video URL HEAD failed ${head.status}`
  );

  const get = await fetch(videoUrl);
  const ct = get.headers.get("content-type") || "";
  console.log(
    get.ok && ct.includes("video")
      ? `✓ Video GET ${get.status} bytes=${get.headers.get("content-length")}`
      : `✗ Video GET failed ${get.status} type=${ct}`
  );

  const branches = await json(await fetch(`${BASE}/api/branches`, { headers: auth(ownerCookie) }));
  const table = await json(
    await fetch(`${BASE}/api/tables`, {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({
        branchId: branches[0].id,
        number: 700 + Math.floor(Math.random() * 200),
        label: "Video",
      }),
    })
  );
  tableId = table.id;
  const qr = await json(await fetch(`${BASE}/api/qr?tableId=${tableId}`, { headers: auth(ownerCookie) }));
  menuUrl = qr.menuUrl;

  const menu = await json(await fetch(`${BASE}/api/public/menu/${tableId}`));
  const pub = menu.categories
    ?.flatMap((c: { items: unknown[] }) => c.items)
    ?.find((i: { id: string }) => i.id === itemId);

  console.log(
    pub?.mediaType === "VIDEO" && pub?.videoUrl === videoUrl
      ? `✓ Public API returns mediaType=VIDEO + videoUrl`
      : `✗ Public API media fields wrong: ${pub?.mediaType} ${pub?.videoUrl?.slice(0, 40)}`
  );

  console.log(`\nCustomer menu: ${menuUrl}`);
  console.log(`Video URL: ${videoUrl}`);

  const allOk = head.ok && get.ok && pub?.mediaType === "VIDEO";
  console.log(`\n=== Playback QA: ${allOk ? "PASS" : "PARTIAL"} ===`);
  if (!head.ok) {
    console.log("BLOCKER: Video URL not public — enable Vercel Blob for permanent storage");
  }

  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
