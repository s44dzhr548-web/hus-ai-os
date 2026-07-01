/**
 * Configure CORS on Cloudflare R2 bucket menuos-media.
 * Tries S3 API first, then Cloudflare REST API if CLOUDFLARE_API_TOKEN is set.
 *
 * Usage: npm run r2:setup-cors
 */
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const origins = [
  "http://localhost:3005",
  "https://restaurant-os-nine.vercel.app",
  "https://*.vercel.app",
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

const corsRules = {
  CORSRules: [
    {
      AllowedOrigins: [...new Set(origins)],
      AllowedMethods: ["GET", "PUT", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
      MaxAgeSeconds: 3600,
    },
  ],
};

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

async function configureViaS3(bucket: string): Promise<boolean> {
  const client = r2Client();
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: corsRules }));
  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("S3 CORS configured:", JSON.stringify(current.CORSConfiguration?.CORSRules, null, 2));
  return true;
}

async function configureViaCloudflareApi(bucket: string): Promise<boolean> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!token || !accountId) return false;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/cors`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rules: [
          {
            allowed: {
              origins: [...new Set(origins.filter((o) => !o.includes("*")))],
              methods: ["GET", "PUT", "HEAD"],
              headers: ["*"],
            },
            expose_headers: ["ETag", "Content-Length", "Content-Type"],
            max_age_seconds: 3600,
          },
        ],
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Cloudflare API CORS failed:", data);
    return false;
  }
  console.log("Cloudflare API CORS configured for:", [...new Set(origins)].join(", "));
  return true;
}

async function main() {
  const bucket = process.env.R2_BUCKET_NAME || "menuos-media";
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error("Missing R2 credentials in .env");
    process.exit(1);
  }

  try {
    if (await configureViaS3(bucket)) return;
  } catch (err) {
    console.warn("S3 PutBucketCors failed:", err instanceof Error ? err.message : err);
  }

  if (await configureViaCloudflareApi(bucket)) return;

  console.error(
    "Could not set CORS automatically. Create an R2 token with Admin Read & Write, or set CLOUDFLARE_API_TOKEN with R2 edit permission."
  );
  process.exit(1);
}

main();
