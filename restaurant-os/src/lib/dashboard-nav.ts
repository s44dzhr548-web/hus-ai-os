import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  GitBranch,
  Table2,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  BarChart3,
  Gift,
  CreditCard,
  Bell,
  Shield,
  Layers,
  ListTree,
  Palette,
} from "lucide-react";
import {
  PLATFORM_ADMIN_ROLE,
  isPlatformAdminUser,
  roleCanAccessNavItem,
  type AppRole,
} from "@/lib/permissions";

export type DashboardRole = AppRole;

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: DashboardRole[];
}

export const platformNavItems: NavItem[] = [
  { href: "/dashboard/platform", label: "إدارة المنصة", icon: Shield },
  { href: "/dashboard/platform/subscriptions", label: "الاشتراكات", icon: CreditCard },
  { href: "/dashboard/platform/billing", label: "الإيرادات", icon: CreditCard },
  { href: "/dashboard/platform/security", label: "الأمان", icon: Shield },
];

export const restaurantNavItems: NavItem[] = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/dashboard/onboarding", label: "البدء", icon: Layers, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/settings", label: "إعدادات المطعم", icon: Store, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/restaurant", label: "بيانات المطعم", icon: Store, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/branches", label: "الفروع", icon: GitBranch, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/tables", label: "الطاولات", icon: Table2, roles: ["OWNER", "ADMIN", "MANAGER", "WAITER"] },
  { href: "/dashboard/menu/categories", label: "المنيو", icon: UtensilsCrossed, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/branding", label: "تخصيص المنيو", icon: Palette, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/menu/options", label: "الخيارات والإضافات", icon: ListTree, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/dashboard/kitchen", label: "المطبخ", icon: ChefHat, roles: ["OWNER", "ADMIN", "MANAGER", "KITCHEN"] },
  { href: "/dashboard/waiter-calls", label: "طلبات الخدمة", icon: Bell, roles: ["OWNER", "ADMIN", "MANAGER", "WAITER"] },
  { href: "/dashboard/reports", label: "التحليلات", icon: BarChart3, roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER"] },
  { href: "/dashboard/payments", label: "الدفع", icon: CreditCard, roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/dashboard/loyalty", label: "الولاء", icon: Gift, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/billing", label: "الفوترة", icon: CreditCard, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/subscription", label: "الاشتراك", icon: CreditCard, roles: ["OWNER", "ADMIN"] },
];

export function getSidebarNavItems(opts: {
  isPlatformAdmin?: boolean;
  role?: DashboardRole;
}): NavItem[] {
  if (isPlatformAdminUser(opts)) {
    return [...platformNavItems, ...restaurantNavItems];
  }

  const role = opts.role ?? "OWNER";
  return restaurantNavItems.filter((item) => roleCanAccessNavItem(role, item.roles));
}

export function isRouteAllowedForUser(
  pathname: string,
  opts: { isPlatformAdmin?: boolean; role?: DashboardRole }
): boolean {
    if (isPlatformAdminUser(opts)) {
    if (
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/platform")
    ) {
      return true;
    }
    return restaurantNavItems.some(
      (item) =>
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href))
    );
  }

  if (pathname === "/dashboard") return true;

  const items = getSidebarNavItems(opts);
  return items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );
}

export function defaultDashboardPath(opts: {
  isPlatformAdmin?: boolean;
  role?: DashboardRole;
}): string {
  if (isPlatformAdminUser(opts)) return "/dashboard/platform";
  if (opts.role === "KITCHEN") return "/dashboard/kitchen";
  if (opts.role === "WAITER") return "/dashboard/waiter-calls";
  if (opts.role === "CASHIER") return "/dashboard/payments";
  return "/dashboard";
}

export { PLATFORM_ADMIN_ROLE };
