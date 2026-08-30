import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

/** Fixed production origin for printed table QR codes — never VERCEL_URL or slug paths. */
export const PERMANENT_QR_BASE_URL = "https://www.menuhus.com";

/** Unambiguous uppercase alphabet (no 0/O, 1/I/L). */
const QR_TOKEN_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generatePublicQrToken(length = 6): string {
  const bytes = randomBytes(length);
  let token = "";
  for (let i = 0; i < length; i++) {
    token += QR_TOKEN_ALPHABET[bytes[i]! % QR_TOKEN_ALPHABET.length];
  }
  return token;
}

export function normalizePublicQrToken(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, "");
}

export function permanentQrUrl(publicQrToken: string): string {
  const token = normalizePublicQrToken(publicQrToken);
  return `${PERMANENT_QR_BASE_URL}/q/${token}`;
}

export type ResolvedQrTable = {
  id: string;
  number: number;
  displayNumber: string | null;
  label: string | null;
  branchId: string;
  publicQrToken: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  restaurantNameAr: string | null;
};

export async function resolveTableByPublicQrToken(
  rawToken: string
): Promise<ResolvedQrTable | null> {
  const token = normalizePublicQrToken(rawToken);
  if (!token) return null;

  const table = await prisma.diningTable.findFirst({
    where: { publicQrToken: token, isArchived: false },
    include: {
      branch: {
        select: {
          id: true,
          restaurant: {
            select: { id: true, slug: true, name: true, nameAr: true },
          },
        },
      },
    },
  });

  if (!table?.publicQrToken || !table.branch.restaurant.slug) return null;

  return {
    id: table.id,
    number: table.number,
    displayNumber: table.displayNumber,
    label: table.label,
    branchId: table.branchId,
    publicQrToken: table.publicQrToken,
    restaurantId: table.branch.restaurant.id,
    restaurantSlug: table.branch.restaurant.slug,
    restaurantName: table.branch.restaurant.name,
    restaurantNameAr: table.branch.restaurant.nameAr,
  };
}

/**
 * Assign a permanent QR token once. Never overwrites an existing token.
 */
export async function ensureTablePublicQrToken(tableId: string): Promise<string> {
  const existing = await prisma.diningTable.findUnique({
    where: { id: tableId },
    select: { publicQrToken: true },
  });

  if (existing?.publicQrToken) {
    return existing.publicQrToken;
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const token = generatePublicQrToken();
    try {
      const updated = await prisma.diningTable.updateMany({
        where: { id: tableId, publicQrToken: null },
        data: {
          publicQrToken: token,
          qrCode: permanentQrUrl(token),
        },
      });

      if (updated.count === 1) return token;

      const row = await prisma.diningTable.findUnique({
        where: { id: tableId },
        select: { publicQrToken: true },
      });
      if (row?.publicQrToken) return row.publicQrToken;
    } catch {
      const row = await prisma.diningTable.findUnique({
        where: { id: tableId },
        select: { publicQrToken: true },
      });
      if (row?.publicQrToken) return row.publicQrToken;
    }
  }

  throw new Error(`Failed to assign public QR token for table ${tableId}`);
}

/** Refresh stored qrCode URL from token without changing the token. */
export async function syncTableQrCodeFromToken(tableId: string): Promise<string | null> {
  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    select: { publicQrToken: true },
  });
  if (!table?.publicQrToken) return null;

  const qrCode = permanentQrUrl(table.publicQrToken);
  await prisma.diningTable.update({
    where: { id: tableId },
    data: { qrCode },
  });
  return qrCode;
}

export function permanentQrUrlForTable(table: {
  publicQrToken?: string | null;
}): string | null {
  if (!table.publicQrToken) return null;
  return permanentQrUrl(table.publicQrToken);
}
