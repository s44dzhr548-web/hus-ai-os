import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { tableCodeFor, menuUrlForTable } from "@/lib/table-code";
import type { SubscriptionPlan } from "@prisma/client";
import { validatePasswordStrength } from "@/lib/password-policy";

export function generateOwnerPassword(): string {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%&*";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const core = Array.from({ length: 8 }, () =>
    pick(lower + upper + digits + special)
  ).join("");
  return `MenuOS${pick(upper)}${pick(lower)}${pick(digits)}${pick(special)}${core}`;
}

export async function resetOwnerPassword(ownerId: string) {
  const plainPassword = generateOwnerPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  await prisma.user.update({
    where: { id: ownerId },
    data: { passwordHash },
  });
  return plainPassword;
}

export async function verifyOwnerCredentials(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  userId?: string;
  restaurantId?: string;
  restaurantName?: string;
  role?: string;
  error?: string;
}> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    include: {
      restaurants: { orderBy: { createdAt: "asc" }, take: 1 },
      staff: {
        where: { isActive: true },
        include: { restaurant: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user) {
    return { ok: false, error: "user_not_found" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "invalid_password" };
  }

  const owned = user.restaurants[0];
  const staff = user.staff[0];
  const restaurant = owned ?? staff?.restaurant ?? null;

  if (!restaurant) {
    return { ok: false, error: "no_restaurant_linked" };
  }

  return {
    ok: true,
    userId: user.id,
    restaurantId: restaurant.id,
    restaurantName: restaurant.nameAr || restaurant.name,
    role: owned ? "OWNER" : staff?.role ?? "STAFF",
  };
}

interface CreateOwnerRestaurantInput {
  restaurantName: string;
  restaurantNameAr?: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  plan?: SubscriptionPlan | string;
  trialDays?: number;
  password?: string;
}

export async function createOwnerRestaurant(input: CreateOwnerRestaurantInput) {
  const {
    restaurantName,
    restaurantNameAr,
    ownerName,
    ownerEmail,
    phone,
    plan = "FREE",
    trialDays = 14,
    password,
  } = input;

  const email = ownerEmail.trim().toLowerCase();
  const plainPassword = password?.trim() || generateOwnerPassword();

  const passwordCheck = validatePasswordStrength(plainPassword);
  if (!passwordCheck.valid) {
    throw new Error("PASSWORD_WEAK");
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const slugBase =
    slugify(restaurantName) ||
    slugify(restaurantNameAr || "") ||
    email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase() ||
    "restaurant";
  const slug = `${slugBase}-${Date.now().toString(36)}`;
  const trialEnd = new Date(Date.now() + (trialDays || 14) * 24 * 60 * 60 * 1000);
  const validPlan = ["FREE", "BASIC", "PRO", "ENTERPRISE"].includes(plan)
    ? (plan as SubscriptionPlan)
    : "FREE";

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: ownerName,
      },
    });

    const restaurant = await tx.restaurant.create({
      data: {
        ownerId: user.id,
        name: restaurantName,
        nameAr: restaurantNameAr || restaurantName,
        slug,
        phone,
        email,
        isActive: true,
        subscription: {
          create: {
            plan: validPlan,
            status: "TRIAL",
            endDate: trialEnd,
          },
        },
      },
    });

    const branch = await tx.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: "Main Branch",
        nameAr: "الفرع الرئيسي",
        city: "الرياض",
        phone,
        isActive: true,
      },
    });

    await tx.staff.create({
      data: {
        userId: user.id,
        restaurantId: restaurant.id,
        branchId: branch.id,
        role: "OWNER",
        name: ownerName,
        phone,
        isActive: true,
      },
    });

    const tableCode = tableCodeFor(slug, 1);
    const table = await tx.diningTable.create({
      data: {
        branchId: branch.id,
        number: 1,
        label: "طاولة 1",
        tableCode,
        capacity: 4,
        isActive: true,
      },
    });

    await tx.diningTable.update({
      where: { id: table.id },
      data: { qrCode: menuUrlForTable(table.id, slug, tableCode) },
    });

    return { user, restaurant, branch, table, plainPassword };
  });

  const loginCheck = await verifyOwnerCredentials(email, result.plainPassword);

  return {
    ...result,
    loginVerified: loginCheck.ok,
    loginError: loginCheck.error,
  };
}
