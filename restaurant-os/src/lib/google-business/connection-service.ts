import prisma from "@/lib/prisma";
import { canEncryptTokens, decryptToken, encryptToken } from "@/lib/marketing/encryption";

async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!res.ok || !data.access_token) return null;
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

export async function getGbpAccessToken(restaurantId: string): Promise<string | null> {
  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId },
  });
  if (!conn?.isActive || !conn.accessTokenEnc || !canEncryptTokens()) return null;

  const expires = conn.tokenExpiresAt?.getTime() ?? 0;
  if (expires > Date.now() + 60_000) {
    try {
      return decryptToken(conn.accessTokenEnc);
    } catch {
      return null;
    }
  }

  if (!conn.refreshTokenEnc) {
    try {
      return decryptToken(conn.accessTokenEnc);
    } catch {
      return null;
    }
  }

  try {
    const refresh = decryptToken(conn.refreshTokenEnc);
    const next = await refreshGoogleAccessToken(refresh);
    if (!next) {
      try {
        return decryptToken(conn.accessTokenEnc);
      } catch {
        return null;
      }
    }
    await prisma.googleBusinessConnection.update({
      where: { id: conn.id },
      data: {
        accessTokenEnc: encryptToken(next.accessToken),
        tokenExpiresAt: next.expiresIn
          ? new Date(Date.now() + next.expiresIn * 1000)
          : conn.tokenExpiresAt,
        ...(next.refreshToken ? { refreshTokenEnc: encryptToken(next.refreshToken) } : {}),
      },
    });
    return next.accessToken;
  } catch {
    return null;
  }
}
