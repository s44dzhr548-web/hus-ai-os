import crypto from "crypto";

const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET missing");
  return s;
}

export function createImpersonationToken(
  ownerId: string,
  restaurantId: string,
  adminId: string
): string {
  const payload = {
    ownerId,
    restaurantId,
    adminId,
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyImpersonationToken(token: string): {
  ownerId: string;
  restaurantId: string;
  adminId: string;
  exp: number;
} | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = crypto
      .createHmac("sha256", secret())
      .update(body)
      .digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (!payload.ownerId || !payload.restaurantId || !payload.adminId) return null;
    return payload;
  } catch {
    return null;
  }
}
