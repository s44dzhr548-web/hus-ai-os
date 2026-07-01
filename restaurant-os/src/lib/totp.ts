import crypto from "crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  let secret = "";
  for (let i = 0; i < bytes.length; i += 5) {
    const b = bytes.slice(i, i + 5);
    secret += BASE32[b[0] >> 3];
    secret += BASE32[((b[0] & 7) << 2) | (b[1] >> 6)];
    if (b.length < 2) break;
    secret += BASE32[(b[1] & 63) >> 1];
    if (b.length < 3) break;
    secret += BASE32[((b[1] & 1) << 4) | (b[2] >> 4)];
    if (b.length < 4) break;
    secret += BASE32[((b[2] & 15) << 1) | (b[3] >> 7)];
    if (b.length < 5) break;
    secret += BASE32[(b[3] & 127) >> 2];
  }
  return secret.slice(0, 32);
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const val = BASE32.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function generateTotp(secret: string, timeStep = 30, offset = 0): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep) + offset;
  return hotp(secret, counter);
}

export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  for (let i = -window; i <= window; i++) {
    if (generateTotp(secret, 30, i) === normalized) return true;
  }
  return false;
}

export function totpOtpauthUrl(email: string, secret: string, issuer = "Menu OS"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
