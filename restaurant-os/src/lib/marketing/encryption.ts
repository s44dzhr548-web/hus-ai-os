import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;

export function integrationEncryptionSecret(): string | undefined {
  const primary = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (primary && primary.length >= 32) return primary;
  const legacy = process.env.MARKETING_TOKEN_SECRET?.trim();
  if (legacy && legacy.length >= 32) return legacy;
  return undefined;
}

export function integrationEncryptionEnvHint(): string {
  return "INTEGRATION_ENCRYPTION_KEY (أو MARKETING_TOKEN_SECRET) — 32+ حرفًا في Vercel";
}

function getKey(): Buffer {
  const secret = integrationEncryptionSecret();
  if (!secret) {
    throw new Error(`${integrationEncryptionEnvHint()} — مطلوب لتشفير مفاتيح التكامل`);
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptToken(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function canEncryptTokens(): boolean {
  return Boolean(integrationEncryptionSecret());
}
