import crypto from "crypto";
import type { NextRequest } from "next/server";

export const TABLE_QR_SESSION_COOKIE = "table_qr_ctx";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type TableQrSession = {
  tableId: string;
  restaurantId: string;
  branchId: string;
  publicQrToken: string;
  exp: number;
};

function sessionSecret(): string {
  const s =
    process.env.TABLE_QR_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-table-qr-session-secret";
  }
  throw new Error("NEXTAUTH_SECRET missing");
}

export function createTableQrSessionValue(input: {
  tableId: string;
  restaurantId: string;
  branchId: string;
  publicQrToken: string;
}): string {
  const payload: TableQrSession = {
    tableId: input.tableId,
    restaurantId: input.restaurantId,
    branchId: input.branchId,
    publicQrToken: input.publicQrToken,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseTableQrSessionValue(raw: string | undefined | null): TableQrSession | null {
  if (!raw) return null;
  try {
    const [body, sig] = raw.split(".");
    if (!body || !sig) return null;
    const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TableQrSession;
    if (!payload.tableId || !payload.restaurantId || !payload.branchId || !payload.publicQrToken) {
      return null;
    }
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getTableQrSessionFromRequest(req: NextRequest): TableQrSession | null {
  return parseTableQrSessionValue(req.cookies.get(TABLE_QR_SESSION_COOKIE)?.value);
}

export function tableQrSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
