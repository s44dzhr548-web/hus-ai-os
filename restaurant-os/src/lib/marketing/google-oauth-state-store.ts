import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

const STATE_TTL_MS = 20 * 60 * 1000;

export type GoogleOAuthStateFailure =
  | "state_missing"
  | "state_mismatch"
  | "state_expired";

export async function createGoogleOAuthStateRecord(
  userId: string,
  restaurantId: string
): Promise<{ stateKey: string; expiresAt: Date }> {
  const stateKey = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);
  await prisma.googleAdsOAuthState.create({
    data: { stateKey, userId, restaurantId, expiresAt },
  });
  return { stateKey, expiresAt };
}

export async function consumeGoogleOAuthStateRecord(stateKey: string): Promise<
  | { ok: true; userId: string; restaurantId: string }
  | { ok: false; reason: GoogleOAuthStateFailure }
> {
  const row = await prisma.googleAdsOAuthState.findUnique({
    where: { stateKey },
  });
  if (!row) {
    return { ok: false, reason: "state_missing" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.googleAdsOAuthState.delete({ where: { stateKey } }).catch(() => {});
    return { ok: false, reason: "state_expired" };
  }
  await prisma.googleAdsOAuthState.delete({ where: { stateKey } });
  return { ok: true, userId: row.userId, restaurantId: row.restaurantId };
}

/** Safe server log — no tokens or secrets. */
export function logGoogleOAuthFailure(
  reason:
    | GoogleOAuthStateFailure
    | "token_exchange_failed"
    | "database_save_failed"
    | "encryption_not_configured",
  extra?: Record<string, string | boolean | undefined>
) {
  console.warn(
    JSON.stringify({
      event: "google_oauth_failed",
      reason,
      ...extra,
      ts: new Date().toISOString(),
    })
  );
}
