import { NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";
import { isPlatformAdminUser } from "@/lib/permissions";
import {
  checkFeature,
  checkLimit,
  checkPermission,
  getEffectiveLimits,
  getRestaurantUsage,
  type FeatureFlag,
  type LimitResource,
  type PermissionResult,
} from "@/lib/subscription-limits";

async function platformAdminBypass(): Promise<boolean> {
  try {
    const session = await getSession();
    return isPlatformAdminUser(session?.user);
  } catch {
    return false;
  }
}

async function withBypass<T extends PermissionResult>(
  restaurantId: string,
  run: () => Promise<T>
): Promise<T> {
  if (await platformAdminBypass()) {
    const usage = await getRestaurantUsage(restaurantId);
    const limits = getEffectiveLimits(usage.plan, usage.limitOverrides);
    return { allowed: true, usage, limits } as T;
  }
  return run();
}

export async function assertPermission(
  restaurantId: string,
  check:
    | { type: "limit"; resource: LimitResource; increment?: number }
    | { type: "feature"; feature: FeatureFlag }
): Promise<NextResponse | null> {
  const result = await withBypass(restaurantId, () =>
    checkPermission(restaurantId, check)
  );
  return permissionError(result);
}

export async function assertFeature(
  restaurantId: string,
  feature: FeatureFlag
): Promise<NextResponse | null> {
  return permissionError(
    await withBypass(restaurantId, () => checkFeature(restaurantId, feature))
  );
}

export async function assertLimit(
  restaurantId: string,
  resource: LimitResource,
  increment = 1
): Promise<NextResponse | null> {
  return permissionError(
    await withBypass(restaurantId, () =>
      checkLimit(restaurantId, resource, increment)
    )
  );
}

export async function checkLimitAllowed(
  restaurantId: string,
  resource: LimitResource,
  increment = 1
): Promise<PermissionResult> {
  return withBypass(restaurantId, () =>
    checkLimit(restaurantId, resource, increment)
  );
}

export function permissionError(result: PermissionResult): NextResponse | null {
  if (result.allowed) return null;
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      upgrade: true,
      usage: {
        branches: result.usage.branches,
        tables: result.usage.tables,
        categories: result.usage.categories,
        items: result.usage.items,
      },
      limits: result.limits,
    },
    { status: 403 }
  );
}
