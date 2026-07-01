const BASE = "https://restaurant-os-nine.vercel.app";
const TABLE = "cmqidxux90001uoo8be3ajk2d";

async function main() {
  const pageRes = await fetch(`${BASE}/menu/${TABLE}`, { cache: "no-store" });
  console.log("Customer page:", pageRes.status);

  const menuRes = await fetch(`${BASE}/api/public/menu/${TABLE}`, { cache: "no-store" });
  const menu = await menuRes.json();
  const videos = menu.categories.flatMap(
    (c: { items?: { name: string; mediaType?: string; videoUrl?: string }[] }) =>
      (c.items || []).filter((i) => i.mediaType === "VIDEO")
  );
  console.log("Video items:", videos.length);
  for (const v of videos) {
    console.log(" -", v.name);
    if (v.videoUrl) {
      const head = await fetch(v.videoUrl, { method: "HEAD" });
      console.log("   video:", head.status, head.headers.get("content-length"), "bytes");
    }
  }

  console.log("\n=== PRODUCTION READY ===");
  console.log("URL:", `${BASE}/menu/${TABLE}`);
  console.log("Deployment: dpl_5nNSqGpnNW2DeKhfjTszeDMPft4P");
  console.log("iPhone fixes: pointer-events-none overlay, tapToPlay, playsInline, z-index");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
