import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  ACTIVE_RESTAURANT_COOKIE,
  isPlatformAdminUser,
  roleCanAccessNavItem,
} from "@/lib/permissions";
import { userCanAccessRestaurant } from "@/lib/restaurant-access";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requirePlatformAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };

  if (!isPlatformAdminUser(session!.user)) {
    return {
      session,
      error: NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

export function restaurantIdFromRequest(req: NextRequest): string | null {
  return (
    req.nextUrl.searchParams.get("restaurantId") ||
    req.headers.get("x-restaurant-id") ||
    null
  );
}

async function resolveActiveRestaurantId(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  requestedRestaurantId?: string | null
): Promise<string | null> {
  const platformAdmin = isPlatformAdminUser(session.user);

  if (platformAdmin) {
    if (requestedRestaurantId) return requestedRestaurantId;
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value;
    if (fromCookie) return fromCookie;
    return session.user.restaurantId ?? null;
  }

  if (requestedRestaurantId) {
    const allowed = await userCanAccessRestaurant(
      session.user.id,
      requestedRestaurantId,
      false
    );
    if (allowed) return requestedRestaurantId;
    return null;
  }

  return session.user.restaurantId ?? null;
}

export async function requireRestaurant(requestedRestaurantId?: string | null) {
  const { session, error } = await requireAuth();
  if (error) {
    return {
      session: null,
      restaurantId: null,
      isPlatformAdmin: false,
      error,
    };
  }

  const platformAdmin = isPlatformAdminUser(session!.user);
  const explicitRequest = requestedRestaurantId ?? null;

  if (explicitRequest && !platformAdmin) {
    const allowed = await userCanAccessRestaurant(
      session!.user.id,
      explicitRequest,
      false
    );
    if (!allowed) {
      return {
        session,
        restaurantId: null,
        isPlatformAdmin: false,
        error: NextResponse.json(
          { error: "لا تملك صلاحية لهذا المطعم", code: "RESTAURANT_FORBIDDEN" },
          { status: 403 }
        ),
      };
    }
  }

  let restaurantId = await resolveActiveRestaurantId(session!, requestedRestaurantId);

  if (!restaurantId && !platformAdmin) {
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: session!.user.id },
      orderBy: { createdAt: "asc" },
    });
    restaurantId = restaurant?.id ?? null;
  }

  if (platformAdmin) {
    if (!restaurantId) {
      const first = await prisma.restaurant.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      restaurantId = first?.id ?? null;
    }

    if (!restaurantId) {
      return {
        session,
        restaurantId: null,
        isPlatformAdmin: true,
        error: NextResponse.json({ error: "No restaurants found" }, { status: 404 }),
      };
    }

    const exists = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!exists) {
      return {
        session,
        restaurantId: null,
        isPlatformAdmin: true,
        error: NextResponse.json({ error: "Restaurant not found" }, { status: 404 }),
      };
    }

    return { session, restaurantId, isPlatformAdmin: true, error: null };
  }

  if (!restaurantId) {
    return {
      session,
      restaurantId: null,
      isPlatformAdmin: false,
      error: NextResponse.json({ error: "No restaurant linked" }, { status: 403 }),
    };
  }

  const allowed = await userCanAccessRestaurant(
    session!.user.id,
    restaurantId,
    false
  );

  if (!allowed) {
    return {
      session,
      restaurantId: null,
      isPlatformAdmin: false,
      error: NextResponse.json(
        { error: "Access denied for this restaurant", code: "RESTAURANT_FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { session, restaurantId, isPlatformAdmin: false, error: null };
}

export async function requireRestaurantFromRequest(req: NextRequest) {
  return requireRestaurant(restaurantIdFromRequest(req));
}

export async function requireRestaurantRole(
  allowedRoles: string[],
  requestedRestaurantId?: string | null
) {
  const result = await requireRestaurant(requestedRestaurantId);
  if (result.error) return result;

  if (result.isPlatformAdmin) return result;

  const role = result.session!.user.role;
  if (!roleCanAccessNavItem(role, allowedRoles)) {
    return {
      ...result,
      error: NextResponse.json(
        { error: "صلاحيات غير كافية", code: "ROLE_FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return result;
}
