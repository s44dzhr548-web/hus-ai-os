import prisma from "@/lib/prisma";
import { queryReservations, serializeRegisterRow } from "@/lib/reservation-register";
import {
  markReservationArrived,
  assignReservationTable,
  resolveReservationTable,
} from "@/lib/reservation-checkin";
import { upsertCustomerProfile, suggestBestTable } from "@/lib/reception";
import { checkReservationConflict, effectiveMinimumSpend } from "@/lib/table-meta";
import { nextReservationNumber } from "@/lib/reservation-register";
import { getRestaurantBusinessDayConfig } from "@/lib/restaurant-config";
import { buildCustomerReports } from "@/lib/customer-reports";
import { resolveDateRange } from "@/lib/business-day";
import { buildVisitReports } from "@/lib/staff-activity-service";
import { fetchWhatsAppHubData } from "@/lib/marketing/whatsapp-business";
import { sendTestWhatsAppMessage } from "@/lib/after-visit-whatsapp/service";
import { listRestaurantGifts } from "@/lib/table-gifts/service";
import { listRestaurantWishes } from "@/lib/customer-wishes/service";
import { listRestaurantSongRequests } from "@/lib/song-requests/service";
import { applyPhonePrivacy } from "@/lib/customer-history";
import { displayTableNumber } from "@/lib/table-number-normalize";
import { maskPhone } from "@/lib/ai-assistant/security";
import type { AiToolName, ToolContext, ToolResult } from "@/lib/ai-assistant/types";
import { REGISTER_STATUS_LABELS } from "@/lib/reservation-labels";

function staffCtx(ctx: ToolContext) {
  return { userId: ctx.userId, userName: ctx.userName ?? undefined };
}

function slimReservation(r: ReturnType<typeof serializeRegisterRow>) {
  return {
    id: r.id,
    reservationNumber: r.reservationNumber,
    customerName: r.customerName,
    customerPhone: r.customerPhone ? maskPhone(r.customerPhone) : null,
    guestCount: r.guestCount,
    status: r.status,
    statusLabel: r.statusLabel,
    reservationDateTimeDisplay: r.reservationDateTimeDisplay,
    tableDisplay: r.tableDisplay,
    branchName: r.branchName,
  };
}

async function findReservation(
  restaurantId: string,
  args: { reservationId?: string; reservationNumber?: string; customerName?: string }
) {
  if (args.reservationId) {
    return prisma.reservation.findFirst({
      where: { id: args.reservationId, restaurantId, archivedAt: null },
    });
  }
  if (args.reservationNumber) {
    const num = args.reservationNumber.trim();
    return prisma.reservation.findFirst({
      where: {
        restaurantId,
        archivedAt: null,
        OR: [
          { reservationNumber: { equals: num, mode: "insensitive" } },
          { reservationNumber: { contains: num, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }
  if (args.customerName) {
    return prisma.reservation.findFirst({
      where: {
        restaurantId,
        archivedAt: null,
        customerName: { contains: args.customerName.trim(), mode: "insensitive" },
        date: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      orderBy: { date: "desc" },
    });
  }
  return null;
}

async function findTableByNumber(restaurantId: string, tableNumber: string) {
  const num = tableNumber.trim();
  return prisma.diningTable.findFirst({
    where: {
      isActive: true,
      branch: { restaurantId, isActive: true },
      OR: [
        { number: parseInt(num) || -1 },
        { displayNumber: num },
        { label: { equals: num, mode: "insensitive" } },
      ],
    },
    include: { branch: { select: { id: true } } },
  });
}

export const AI_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    name: "get_today_reservations",
    description: "عرض حجوزات اليوم للمطعم",
    parameters: {
      type: "object",
      properties: { branchId: { type: "string", description: "معرف الفرع (اختياري)" } },
    },
  },
  {
    type: "function" as const,
    name: "search_reservations",
    description: "البحث في الحجوزات بالاسم أو الجوال أو رقم الحجز",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "نص البحث" },
        status: { type: "string", description: "حالة الحجز (اختياري)" },
      },
      required: ["query"],
    },
  },
  {
    type: "function" as const,
    name: "create_reservation",
    description: "إنشاء حجز جديد — يتطلب تأكيد المستخدم",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        guestCount: { type: "number" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:mm" },
        notes: { type: "string" },
      },
      required: ["customerName", "customerPhone", "date", "time"],
    },
  },
  {
    type: "function" as const,
    name: "update_reservation",
    description: "تعديل بيانات حجز — يتطلب تأكيد المستخدم",
    parameters: {
      type: "object",
      properties: {
        reservationId: { type: "string" },
        reservationNumber: { type: "string" },
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        guestCount: { type: "number" },
        date: { type: "string" },
        time: { type: "string" },
        notes: { type: "string" },
      },
    },
  },
  {
    type: "function" as const,
    name: "get_available_tables",
    description: "عرض الطاولات المتاحة (بدون جلسة نشطة)",
    parameters: {
      type: "object",
      properties: {
        branchId: { type: "string" },
        guestCount: { type: "number" },
      },
    },
  },
  {
    type: "function" as const,
    name: "assign_table",
    description: "تعيين طاولة لحجز — يتطلب تأكيد المستخدم",
    parameters: {
      type: "object",
      properties: {
        reservationNumber: { type: "string" },
        reservationId: { type: "string" },
        tableNumber: { type: "string", description: "رقم الطاولة مثل 100" },
      },
      required: ["tableNumber"],
    },
  },
  {
    type: "function" as const,
    name: "mark_customer_arrived",
    description: "تسجيل وصول العميل للحجز — يتطلب تأكيد المستخدم",
    parameters: {
      type: "object",
      properties: {
        reservationNumber: { type: "string" },
        reservationId: { type: "string" },
        customerName: { type: "string" },
        guestCount: { type: "number" },
      },
    },
  },
  {
    type: "function" as const,
    name: "search_customers",
    description: "البحث في سجل العملاء بالاسم أو الجوال",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
      },
    },
  },
  {
    type: "function" as const,
    name: "get_customer_history",
    description: "عرض حجوزات وزيارات عميل",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string" },
        phone: { type: "string" },
        name: { type: "string" },
      },
    },
  },
  {
    type: "function" as const,
    name: "get_daily_visitor_report",
    description: "تقرير زوار يوم العمل (يبدأ 4 صباحاً). period: today|yesterday",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "yesterday"] },
      },
    },
  },
  {
    type: "function" as const,
    name: "get_whatsapp_connection_status",
    description: "فحص اتصال واتساب Business للمطعم",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function" as const,
    name: "send_whatsapp_template",
    description: "إرسال قالب واتساب معتمد للعميل — يتطلب تأكيد المستخدم",
    parameters: {
      type: "object",
      properties: {
        reservationNumber: { type: "string" },
        reservationId: { type: "string" },
        phone: { type: "string" },
        customerName: { type: "string" },
      },
    },
  },
  {
    type: "function" as const,
    name: "list_gifts",
    description: "عرض الإهداءات وحالتها",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "PENDING_ACCEPTANCE|ACCEPTED|..." },
      },
    },
  },
  {
    type: "function" as const,
    name: "list_wishes",
    description: "عرض الأمنيات وحالتها",
    parameters: {
      type: "object",
      properties: { status: { type: "string" } },
    },
  },
  {
    type: "function" as const,
    name: "list_song_requests",
    description: "عرض طلبات الأغاني وحالتها",
    parameters: {
      type: "object",
      properties: { status: { type: "string" } },
    },
  },
];

export function previewWriteAction(toolName: AiToolName, args: Record<string, unknown>): string {
  switch (toolName) {
    case "assign_table":
      return `تعيين الحجز ${args.reservationNumber || args.reservationId || "—"} على الطاولة ${args.tableNumber}`;
    case "mark_customer_arrived":
      return `تسجيل وصول ${args.customerName || args.reservationNumber || "العميل"}`;
    case "create_reservation":
      return `إنشاء حجز لـ ${args.customerName} — ${args.date} ${args.time}`;
    case "update_reservation":
      return `تعديل الحجز ${args.reservationNumber || args.reservationId || "—"}`;
    case "send_whatsapp_template":
      return `إرسال قالب واتساب إلى ${args.customerName || args.phone || "العميل"}`;
    default:
      return `تنفيذ: ${toolName}`;
  }
}

export async function executeAiTool(
  toolName: AiToolName,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  const { restaurantId } = ctx;

  switch (toolName) {
    case "get_today_reservations": {
      const { reservations, pagination } = await queryReservations({
        restaurantId,
        quick: "today",
        branchId: args.branchId as string | undefined,
        pageSize: 50,
      });
      return {
        ok: true,
        summary: `تم العثور على ${pagination.total} حجز اليوم`,
        data: { reservations: reservations.map(slimReservation), total: pagination.total },
      };
    }

    case "search_reservations": {
      const query = String(args.query || "").trim();
      if (!query) return { ok: false, summary: "نص البحث مطلوب", error: "query required" };
      const { reservations, pagination } = await queryReservations({
        restaurantId,
        q: query,
        status: args.status as string | undefined,
        pageSize: 30,
      });
      return {
        ok: true,
        summary: `نتائج البحث: ${pagination.total} حجز`,
        data: { reservations: reservations.map(slimReservation) },
      };
    }

    case "get_available_tables": {
      const branchId = args.branchId as string | undefined;
      const guestCount = args.guestCount ? Number(args.guestCount) : undefined;
      const activeSessions = await prisma.tableSession.findMany({
        where: {
          restaurantId,
          endedAt: null,
          status: { not: "COMPLETED" },
          ...(branchId ? { branchId } : {}),
        },
        select: { tableId: true },
      });
      const occupied = new Set(activeSessions.map((s) => s.tableId));
      const tables = await prisma.diningTable.findMany({
        where: {
          isActive: true,
          branch: { restaurantId, isActive: true, ...(branchId ? { id: branchId } : {}) },
        },
        orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
        take: 200,
      });
      let available = tables.filter((t) => !occupied.has(t.id));
      if (guestCount) {
        const suggested = await suggestBestTable(restaurantId, guestCount, branchId);
        if (suggested) {
          available = [
            suggested,
            ...available.filter((t) => t.id !== suggested.id),
          ];
        }
      }
      return {
        ok: true,
        summary: `${available.length} طاولة متاحة`,
        data: {
          tables: available.slice(0, 40).map((t) => ({
            id: t.id,
            number: displayTableNumber(t.displayNumber || t.label || String(t.number)),
            capacity: t.capacity,
            zone: t.floorZone,
          })),
        },
      };
    }

    case "search_customers": {
      const where: Record<string, unknown> = { restaurantId };
      if (args.phone) where.customerPhone = { contains: String(args.phone).trim() };
      if (args.name) {
        where.customerName = { contains: String(args.name).trim(), mode: "insensitive" };
      }
      const rows = await prisma.customerProfile.findMany({
        where: where as never,
        orderBy: { lastVisitAt: "desc" },
        take: 20,
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          visitCount: true,
          lastVisitAt: true,
          isVip: true,
        },
      });
      return {
        ok: true,
        summary: `${rows.length} عميل`,
        data: {
          customers: rows.map((c) =>
            applyPhonePrivacy(
              {
                id: c.id,
                customerName: c.customerName,
                customerPhone: c.customerPhone,
                visitCount: c.visitCount,
                lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
                isVip: c.isVip,
              },
              ctx.userRole
            )
          ),
        },
      };
    }

    case "get_customer_history": {
      let profileId = args.customerId as string | undefined;
      if (!profileId && (args.phone || args.name)) {
        const found = await prisma.customerProfile.findFirst({
          where: {
            restaurantId,
            ...(args.phone
              ? { customerPhone: { contains: String(args.phone).trim() } }
              : {
                  customerName: {
                    contains: String(args.name).trim(),
                    mode: "insensitive",
                  },
                }),
          },
          select: { id: true },
        });
        profileId = found?.id;
      }
      if (!profileId) {
        return { ok: false, summary: "العميل غير موجود", error: "not found" };
      }
      const profile = await prisma.customerProfile.findFirst({
        where: { id: profileId, restaurantId },
        include: {
          visits: { orderBy: { arrivalTime: "desc" }, take: 10 },
          reservations: { orderBy: [{ date: "desc" }], take: 10 },
        },
      });
      if (!profile) return { ok: false, summary: "العميل غير موجود", error: "not found" };
      return {
        ok: true,
        summary: `سجل ${profile.customerName}: ${profile.visits.length} زيارة، ${profile.reservations.length} حجز`,
        data: {
          customerName: profile.customerName,
          visitCount: profile.visitCount,
          visits: profile.visits.map((v) => ({
            date: v.arrivalTime?.toISOString() ?? null,
            tableNumber: v.tableDisplayNumber,
            guestCount: v.guestCount,
            status: v.visitStatus,
          })),
          reservations: profile.reservations.map((r) => ({
            reservationNumber: r.reservationNumber,
            date: r.date.toISOString(),
            time: r.time,
            status: r.status,
            statusLabel: REGISTER_STATUS_LABELS[r.status],
          })),
        },
      };
    }

    case "get_daily_visitor_report": {
      const period = (args.period === "yesterday" ? "yesterday" : "today") as "today" | "yesterday";
      const businessConfig = await getRestaurantBusinessDayConfig(restaurantId);
      const { from, to } = resolveDateRange(period, null, null, businessConfig);
      const [reports, visitReports] = await Promise.all([
        buildCustomerReports(restaurantId, from, to, period, undefined, businessConfig),
        buildVisitReports(restaurantId, from, to, businessConfig),
      ]);
      return {
        ok: true,
        summary: `تقرير ${period === "yesterday" ? "أمس" : "اليوم"}: ${reports.totalVenueVisitors} زائر`,
        data: {
          period,
          businessDayNote: reports.businessDayNote,
          uniqueVisitors: reports.uniqueVisitors,
          totalVenueVisitors: reports.totalVenueVisitors,
          totalCompanions: reports.totalCompanions,
          registeredCustomers: reports.registeredCustomers,
          visitReports,
        },
      };
    }

    case "get_whatsapp_connection_status": {
      const hub = await fetchWhatsAppHubData(restaurantId);
      const conn = hub.connection;
      const connected = Boolean(conn?.connected && conn?.isActive);
      return {
        ok: true,
        summary: connected ? "واتساب متصل" : "واتساب غير متصل",
        data: {
          connected,
          isActive: conn?.isActive ?? false,
          hasToken: conn?.hasToken ?? false,
          phoneNumberId: conn?.phoneNumberId ? "configured" : null,
          templateCount: hub.templates?.length ?? 0,
          messagesSent: hub.stats?.sent ?? 0,
        },
      };
    }

    case "list_gifts": {
      let gifts = await listRestaurantGifts(restaurantId);
      if (args.status) gifts = gifts.filter((g) => g.status === args.status);
      if (args.status === undefined) {
        gifts = gifts.filter((g) =>
          ["PENDING_ACCEPTANCE", "ACCEPTED", "PAID", "PREPARING"].includes(g.status)
        );
      }
      return {
        ok: true,
        summary: `${gifts.length} إهداء`,
        data: { gifts: gifts.slice(0, 30) },
      };
    }

    case "list_wishes": {
      let wishes = await listRestaurantWishes(restaurantId);
      if (args.status) wishes = wishes.filter((w) => w.status === args.status);
      else wishes = wishes.filter((w) => w.status === "SUBMITTED");
      return {
        ok: true,
        summary: `${wishes.length} أمنية`,
        data: { wishes: wishes.slice(0, 30) },
      };
    }

    case "list_song_requests": {
      let requests = await listRestaurantSongRequests(restaurantId);
      if (args.status) requests = requests.filter((r) => r.status === args.status);
      else requests = requests.filter((r) => r.status === "PENDING_REVIEW");
      return {
        ok: true,
        summary: `${requests.length} طلب أغنية`,
        data: { requests: requests.slice(0, 30) },
      };
    }

    case "create_reservation": {
      const customerName = String(args.customerName || "").trim();
      const customerPhone = String(args.customerPhone || "").trim();
      const date = String(args.date || "");
      const time = String(args.time || "");
      if (!customerName || !customerPhone || !date || !time) {
        return { ok: false, summary: "بيانات الحجز ناقصة", error: "validation" };
      }
      const branch = await prisma.branch.findFirst({
        where: { restaurantId, isActive: true },
        select: { id: true },
      });
      if (!branch) return { ok: false, summary: "لا يوجد فرع", error: "no branch" };

      const reservationNumber = await nextReservationNumber(restaurantId);
      const profile = await upsertCustomerProfile(
        restaurantId,
        customerName,
        customerPhone
      );

      const created = await prisma.reservation.create({
        data: {
          restaurantId,
          branchId: branch.id,
          customerName,
          customerPhone,
          guestCount: Number(args.guestCount) || 2,
          date: new Date(date),
          time,
          notes: args.notes ? String(args.notes) : null,
          status: "CONFIRMED",
          source: "ai_assistant",
          reservationNumber,
          customerProfileId: profile.id,
          createdByUserId: ctx.userId,
        },
      });

      return {
        ok: true,
        summary: `تم إنشاء الحجز ${created.reservationNumber}`,
        beforeState: null,
        afterState: slimReservation(serializeRegisterRow(created, new Map())),
        data: { reservationNumber: created.reservationNumber, id: created.id },
      };
    }

    case "update_reservation": {
      const reservation = await findReservation(restaurantId, args as never);
      if (!reservation) return { ok: false, summary: "الحجز غير موجود", error: "not found" };
      const before = { ...reservation };
      const patch: Record<string, unknown> = { updatedByUserId: ctx.userId };
      if (args.customerName) patch.customerName = String(args.customerName).trim();
      if (args.customerPhone) patch.customerPhone = String(args.customerPhone).trim();
      if (args.guestCount != null) patch.guestCount = Number(args.guestCount);
      if (args.date) patch.date = new Date(String(args.date));
      if (args.time) patch.time = String(args.time);
      if (args.notes !== undefined) patch.notes = args.notes ? String(args.notes) : null;
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: patch as never,
      });
      return {
        ok: true,
        summary: `تم تحديث الحجز ${updated.reservationNumber}`,
        beforeState: {
          reservationNumber: before.reservationNumber,
          customerName: before.customerName,
          guestCount: before.guestCount,
        },
        afterState: slimReservation(serializeRegisterRow(updated, new Map())),
      };
    }

    case "assign_table": {
      const reservation = await findReservation(restaurantId, args as never);
      if (!reservation) return { ok: false, summary: "الحجز غير موجود", error: "not found" };
      const table = await findTableByNumber(restaurantId, String(args.tableNumber));
      if (!table) return { ok: false, summary: "الطاولة غير موجودة", error: "table not found" };

      const conflict = await checkReservationConflict(
        restaurantId,
        table.id,
        reservation.date,
        reservation.id
      );
      if (conflict) {
        return { ok: false, summary: "الطاولة محجوزة في هذا التاريخ", error: "conflict" };
      }

      const minSpend = effectiveMinimumSpend(
        reservation.minimumSpendAmount != null
          ? Number(reservation.minimumSpendAmount)
          : null,
        table.minimumSpendAmount != null ? Number(table.minimumSpendAmount) : null
      );

      const before = {
        reservationNumber: reservation.reservationNumber,
        table: reservation.tableNumberSnapshot,
      };
      await markReservationArrived(reservation.id, restaurantId);
      const updated = await assignReservationTable(
        reservation.id,
        restaurantId,
        table,
        staffCtx(ctx),
        minSpend
      );
      return {
        ok: true,
        summary: `تم تعيين ${updated.reservationNumber} على طاولة ${displayTableNumber(table.displayNumber || table.label || String(table.number))}`,
        beforeState: before,
        afterState: slimReservation(serializeRegisterRow(updated, new Map())),
      };
    }

    case "mark_customer_arrived": {
      const reservation = await findReservation(restaurantId, args as never);
      if (!reservation) return { ok: false, summary: "الحجز غير موجود", error: "not found" };
      const before = { status: reservation.status, arrivedAt: reservation.arrivedAt };
      const updated = await markReservationArrived(
        reservation.id,
        restaurantId,
        args.guestCount != null ? Number(args.guestCount) : undefined
      );
      return {
        ok: true,
        summary: `تم تسجيل وصول ${updated.customerName} (${updated.reservationNumber})`,
        beforeState: before,
        afterState: { status: updated.status, arrivedAt: updated.arrivedAt },
      };
    }

    case "send_whatsapp_template": {
      if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.userRole)) {
        return { ok: false, summary: "صلاحية الإرسال للمالك/المدير فقط", error: "forbidden" };
      }
      let phone = args.phone ? String(args.phone) : null;
      let customerName = args.customerName ? String(args.customerName) : null;
      let tableNumber = "1";
      if (args.reservationId || args.reservationNumber) {
        const reservation = await findReservation(restaurantId, args as never);
        if (!reservation) return { ok: false, summary: "الحجز غير موجود", error: "not found" };
        phone = reservation.customerPhone;
        customerName = reservation.customerName;
        tableNumber =
          reservation.tableNumberSnapshot ||
          (reservation.tableNumber != null ? String(reservation.tableNumber) : "1");
      }
      if (!phone) return { ok: false, summary: "رقم الجوال مطلوب", error: "phone required" };

      const result = await sendTestWhatsAppMessage({
        restaurantId,
        testPhone: phone,
        customerName: customerName || undefined,
        tableNumber,
      });
      if (!result.ok) {
        return { ok: false, summary: result.error, error: result.error };
      }
      return {
        ok: true,
        summary: `تم إرسال قالب واتساب إلى ${maskPhone(phone)}`,
        data: { messageId: result.messageId },
      };
    }

    default:
      return { ok: false, summary: "أداة غير مدعومة", error: "unknown tool" };
  }
}
