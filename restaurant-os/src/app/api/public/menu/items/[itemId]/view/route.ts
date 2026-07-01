import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;

  await prisma.menuItem.update({
    where: { id: itemId },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
