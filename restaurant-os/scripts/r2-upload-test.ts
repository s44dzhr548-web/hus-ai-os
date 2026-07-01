/**
 * R2 connectivity test — run after all env vars are set:
 *   npx tsx scripts/r2-upload-test.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

async function main() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Missing env:", missing.join(", "));
    process.exit(1);
  }

  const accountId = process.env.R2_ACCOUNT_ID!;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const key = `media/images/r2-test-${Date.now()}.txt`;
  const body = "Menu OS R2 upload test";

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    })
  );

  const publicUrl = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  console.log("Upload OK:", publicUrl);

  const res = await fetch(publicUrl, { method: "HEAD" });
  console.log("Public HEAD:", res.status, res.headers.get("content-type"));
  if (!res.ok) {
    console.error("Public URL not reachable — check R2 Public Development URL on bucket");
    process.exit(1);
  }
  console.log("R2 configured and public access verified.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
