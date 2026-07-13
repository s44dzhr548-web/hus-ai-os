export const PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN";

export type AppRole =
  | typeof PLATFORM_ADMIN_ROLE
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "RECEPTION"
  | "CASHIER"
  | "KITCHEN"
  | "WAITER"
  | "MARKETING"
  | string
  | null;

export interface SessionUserLike {
  isPlatformAdmin?: boolean;
  role?: string | null;
}

export function isPlatformAdminUser(user?: SessionUserLike | null): boolean {
  return Boolean(user?.isPlatformAdmin) || user?.role === PLATFORM_ADMIN_ROLE;
}

export function resolveAuthRole(opts: {
  isPlatformAdmin: boolean;
  isOwner: boolean;
  staffRole?: string | null;
}): AppRole {
  if (opts.isPlatformAdmin) return PLATFORM_ADMIN_ROLE;
  if (opts.isOwner) return "OWNER";
  return opts.staffRole ?? null;
}

const FULL_ACCESS_STAFF = new Set(["OWNER", "ADMIN"]);

export function roleCanAccessNavItem(
  role: AppRole,
  allowedRoles?: (string | null)[]
): boolean {
  if (!allowedRoles?.length) return true;
  if (role === PLATFORM_ADMIN_ROLE) return true;
  if (FULL_ACCESS_STAFF.has(role ?? "")) return true;
  return allowedRoles.includes(role ?? "");
}

export const ACTIVE_RESTAURANT_COOKIE = "menuos_active_restaurant";
