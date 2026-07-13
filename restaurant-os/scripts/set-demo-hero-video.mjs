/**
 * Upload a demo hero video to R2 and set it on menu-os-demo (production DB).
 * Uses the same R2 key layout as /api/upload/presign.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const envPath = join(root, ".env");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const DEMO_SLUG = "menu-os-demo";

/** Minimal valid MP4 (~8KB) — fallback if external download fails. */
const MINIMAL_MP4_B64 =
  "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAActtZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjkxMSAwIGExYzE0ZgBAAAAwZGF0YQAAAAEAAAAATGF2ZjU5LjI3LjEwMA==";

async function downloadDemoVideo(outPath) {
  const sources = [
    "https://cdn.pixabay.com/video/2016/03/09/2540-158516_640.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://www.w3schools.com/html/mov_bbb.mp4",
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "RestaurantOS-DemoSetup/1.0" },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 10_000) continue;
      writeFileSync(outPath, buf);
      console.log(`Downloaded demo video from ${url} (${buf.length} bytes)`);
      return buf;
    } catch (err) {
      console.warn(`Skip ${url}:`, err.message);
    }
  }

  const buf = Buffer.from(MINIMAL_MP4_B64, "base64");
  writeFileSync(outPath, buf);
  console.log(`Using embedded minimal MP4 (${buf.length} bytes)`);
  return buf;
}

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

async function uploadToR2(buffer, restaurantId) {
  const filename = `video-${Date.now()}.mp4`;
  const key = `media/videos/${restaurantId}-${filename}`;
  const client = r2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  return { key, publicUrl };
}

async function main() {
  const tmpDir = join(root, "tmp");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const videoPath = join(tmpDir, "demo-hero.mp4");

  const prisma = new PrismaClient();
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: DEMO_SLUG },
      select: { id: true, name: true, heroVideoUrl: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurant not found: ${DEMO_SLUG}`);
    }

    console.log(`Target: ${restaurant.name} (${restaurant.id})`);
    const buffer = await downloadDemoVideo(videoPath);
    const { publicUrl, key } = await uploadToR2(buffer, restaurant.id);
    console.log(`Uploaded to R2: ${key}`);

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        heroVideoUrl: publicUrl,
        heroImageUrl:
          restaurant.heroVideoUrl === publicUrl
            ? undefined
            : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80",
      },
    });

    console.log(`Saved heroVideoUrl: ${publicUrl}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
