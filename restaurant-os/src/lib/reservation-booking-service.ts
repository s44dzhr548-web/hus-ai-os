import prisma from "@/lib/prisma";
import { upsertCustomerProfile } from "@/lib/reception";
import { nextReservationNumber } from "@/lib/reservation-register";
import { recordReservationStatusChange } from "@/lib/reservation-audit";
import { normalizeSaudiPhone, isValidSaudiPhone } from "@/lib/phone-sa";
import {
  buildReservationSlots,
  isPastDate,
  maxGuestCountFromConfig,
} from "@/lib/reservation-slots";
import {
  generateReservationPublicToken,
  reservationPublicUrl,
  serializePublicReservation,
  isReservationEditableByCustomer,
} from "@/lib/reservation-public";

export type CreatePublicReservationInput = {
  slug: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  guestCount: number;
  sessionType?: string | null;
  occasion?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
};

async function notifyRestaurantWhatsAppSafe(_reservationId: string) {
  try {
    // Optional outbound notification — failure must never block booking.
    // Integrate Meta Cloud API here when restaurant WhatsApp is connected.
  } catch {
    /* swallow */
  }
}

export async function validatePublicReservationInput(
  input: CreatePublicReservationInput,
  restaurant: {
    id: string;
    workingHours: unknown;
    landingPageConfig: unknown;
    timezone: string;
  }
) {
  const name = input.customerName?.trim();
  if (!name || name.length < 2) {
    throw new Error("الاسم مطلوب");
  }

  const phone = normalizeSaudiPhone(input.customerPhone);
  if (!phone || !isValidSaudiPhone(input.customerPhone)) {
    throw new Error("رقم الجوال غير صحيح");
  }

  if (!input.date || isPastDate(input.date, restaurant.timezone)) {
    throw new Error("التاريخ غير صالح");
  }

  const maxGuests = maxGuestCountFromConfig(restaurant.landingPageConfig);
  const guests = Math.floor(Number(input.guestCount));
  if (!Number.isFinite(guests) || guests < 1 || guests > maxGuests) {
    throw new Error(`عدد الضيوف يجب أن يكون بين 1 و ${maxGuests}`);
  }

  const booked = await prisma.reservation.findMany({
    where: {
      restaurantId: restaurant.id,
      date: new Date(input.date),
      status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
    },
    select: { time: true },
  });

  const slots = buildReservationSlots({
    workingHoursRaw: restaurant.workingHours,
    date: input.date,
    timezone: restaurant.timezone,
    bookedTimes: booked.map((b) => b.time),
  });

  const slot = slots.find((s) => s.time === input.time);
  if (!slot) {
    throw new Error("الوقت غير متاح");
  }
  if (!slot.available) {
    throw new Error("هذا الوقت غير متاح");
  }

  const sessionType = input.sessionType?.trim() || null;
  if (sessionType && !["INDOOR", "OUTDOOR", "NO_PREFERENCE"].includes(sessionType)) {
    throw new Error("نوع الجلسة غير صالح");
  }

  return { phone, guests, sessionType, name };
}

export async function createPublicReservation(input: CreatePublicReservationInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.reservation.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: {
        restaurant: { select: { name: true, nameAr: true, slug: true } },
      },
    });
    if (existing?.publicAccessToken) {
      return {
        reservation: existing,
        view: serializePublicReservation(existing, existing.restaurant)!,
        publicUrl: reservationPublicUrl(existing.publicAccessToken),
        duplicate: true,
      };
    }
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      isActive: true,
      name: true,
      nameAr: true,
      slug: true,
      workingHours: true,
      landingPageConfig: true,
      timezone: true,
      receptionDepositAmount: true,
    },
  });

  if (!restaurant || !restaurant.isActive) {
    throw new Error("المطعم غير موجود");
  }

  const validated = await validatePublicReservationInput(input, restaurant);
  const profile = await upsertCustomerProfile(
    restaurant.id,
    validated.name,
    validated.phone
  );

  const reservationNumber = await nextReservationNumber(restaurant.id);
  const publicAccessToken = generateReservationPublicToken();

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurant.id,
      customerProfileId: profile.id,
      customerName: validated.name,
      customerPhone: validated.phone,
      guestCount: validated.guests,
      date: new Date(input.date),
      time: String(input.time),
      sessionType: validated.sessionType,
      occasion: input.occasion?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "PENDING",
      source: "public",
      reservationNumber,
      publicAccessToken,
      idempotencyKey: input.idempotencyKey || null,
      minimumSpendAmount: restaurant.receptionDepositAmount,
    },
    include: {
      restaurant: { select: { name: true, nameAr: true, slug: true } },
    },
  });

  await recordReservationStatusChange(reservation.id, null, "PENDING", undefined, "public booking");
  void notifyRestaurantWhatsAppSafe(reservation.id);

  const view = serializePublicReservation(reservation, reservation.restaurant)!;
  return {
    reservation,
    view,
    publicUrl: reservationPublicUrl(publicAccessToken),
    duplicate: false,
  };
}

export async function getPublicReservationByToken(token: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { publicAccessToken: token },
    include: {
      restaurant: { select: { name: true, nameAr: true, slug: true, isActive: true } },
      table: { select: { id: true, number: true, label: true, displayNumber: true } },
    },
  });
  if (!reservation || !reservation.restaurant.isActive) return null;

  const withTable = {
    ...reservation,
    tableNumber: reservation.tableNumber ?? reservation.table?.number ?? null,
    tableLabel:
      reservation.tableLabel ??
      reservation.table?.displayNumber ??
      reservation.table?.label ??
      null,
  };

  return serializePublicReservation(withTable, reservation.restaurant);
}

export async function updatePublicReservationByToken(
  token: string,
  patch: {
    date?: string;
    time?: string;
    guestCount?: number;
    notes?: string | null;
    occasion?: string | null;
    sessionType?: string | null;
  }
) {
  const reservation = await prisma.reservation.findFirst({
    where: { publicAccessToken: token },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          slug: true,
          workingHours: true,
          landingPageConfig: true,
          timezone: true,
        },
      },
    },
  });

  if (!reservation) throw new Error("الحجز غير موجود");
  if (!isReservationEditableByCustomer(reservation.status)) {
    throw new Error("تم تأكيد الحجز، للتعديل يرجى التواصل مع المطعم.");
  }

  const date = patch.date ?? reservation.date.toISOString().slice(0, 10);
  const time = patch.time ?? reservation.time;
  const guestCount = patch.guestCount ?? reservation.guestCount;

  await validatePublicReservationInput(
    {
      slug: reservation.restaurant.slug,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      date,
      time,
      guestCount,
      sessionType: patch.sessionType ?? reservation.sessionType,
    },
    reservation.restaurant
  );

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      date: new Date(date),
      time,
      guestCount: Math.floor(guestCount),
      notes: patch.notes !== undefined ? patch.notes?.trim() || null : undefined,
      occasion: patch.occasion !== undefined ? patch.occasion?.trim() || null : undefined,
      sessionType:
        patch.sessionType !== undefined ? patch.sessionType?.trim() || null : undefined,
    },
    include: {
      restaurant: { select: { name: true, nameAr: true, slug: true } },
      table: { select: { number: true, label: true, displayNumber: true } },
    },
  });

  const withTable = {
    ...updated,
    tableNumber: updated.tableNumber ?? updated.table?.number ?? null,
    tableLabel:
      updated.tableLabel ?? updated.table?.displayNumber ?? updated.table?.label ?? null,
  };

  return serializePublicReservation(withTable, updated.restaurant)!;
}

export async function cancelPublicReservationByToken(token: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { publicAccessToken: token },
    include: {
      restaurant: { select: { name: true, nameAr: true, slug: true } },
    },
  });

  if (!reservation) throw new Error("الحجز غير موجود");
  if (!isReservationEditableByCustomer(reservation.status)) {
    throw new Error("تم تأكيد الحجز، للتعديل يرجى التواصل مع المطعم.");
  }

  const previous = reservation.status;
  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: {
      restaurant: { select: { name: true, nameAr: true, slug: true } },
    },
  });

  await recordReservationStatusChange(
    reservation.id,
    previous,
    "CANCELLED",
    undefined,
    "customer cancel"
  );

  return serializePublicReservation(updated, updated.restaurant)!;
}

export async function getPublicReservationSlots(slug: string, date: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true, workingHours: true, timezone: true },
  });
  if (!restaurant || !restaurant.isActive) {
    throw new Error("المطعم غير موجود");
  }
  if (isPastDate(date, restaurant.timezone)) {
    return [];
  }

  const booked = await prisma.reservation.findMany({
    where: {
      restaurantId: restaurant.id,
      date: new Date(date),
      status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
    },
    select: { time: true },
  });

  return buildReservationSlots({
    workingHoursRaw: restaurant.workingHours,
    date,
    timezone: restaurant.timezone,
    bookedTimes: booked.map((b) => b.time),
  });
}
