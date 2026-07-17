import prisma from "@/lib/prisma";
import { getActiveSessionForTable } from "@/lib/reception";

export const QR_SESSION_REQUIRED_MESSAGE =
  "يرجى مسح رمز QR الموجود على طاولتك لاستخدام هذه الخدمة.";

export type CustomerTableContext = {
  valid: boolean;
  tableId: string | null;
  tableNumber: number | null;
  tableDisplayNumber: string | null;
  sessionId: string | null;
  restaurantId: string | null;
  branchId: string | null;
  customerName: string | null;
};

export async function resolveCustomerTableSession(
  tableId: string | null | undefined
): Promise<CustomerTableContext> {
  const empty: CustomerTableContext = {
    valid: false,
    tableId: null,
    tableNumber: null,
    tableDisplayNumber: null,
    sessionId: null,
    restaurantId: null,
    branchId: null,
    customerName: null,
  };

  if (!tableId) return empty;

  const table = await prisma.diningTable.findFirst({
    where: { id: tableId, isActive: true },
    include: {
      branch: {
        select: {
          id: true,
          restaurantId: true,
          isActive: true,
          restaurant: { select: { isActive: true } },
        },
      },
    },
  });

  if (!table?.branch?.isActive || !table.branch.restaurant.isActive) return empty;

  const session = await getActiveSessionForTable(tableId);
  if (!session) return empty;

  return {
    valid: true,
    tableId: table.id,
    tableNumber: table.number,
    tableDisplayNumber:
      session.tableDisplayNumber ?? table.displayNumber ?? String(table.number),
    sessionId: session.id,
    restaurantId: table.branch.restaurantId,
    branchId: table.branch.id,
    customerName: session.customerName,
  };
}

export async function assertCustomerTableSession(tableId: string) {
  const ctx = await resolveCustomerTableSession(tableId);
  if (!ctx.valid || !ctx.sessionId || !ctx.restaurantId) {
    throw new Error(QR_SESSION_REQUIRED_MESSAGE);
  }
  return ctx;
}
