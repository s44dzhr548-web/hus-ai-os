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
  ConciergeBell,
  CalendarDays,
  Users,
  UserCog,
  Megaphone,
  Images,
  Activity,
  Sparkles,
  Music,
  Bot,
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

/** Routes marketing staff may access */
export const MARKETING_STAFF_ROUTES = [
  "/dashboard/marketing",
];

/** Routes reception staff may access */
export const RECEPTION_STAFF_ROUTES = [
  "/dashboard/reception",
  "/dashboard/reservations",
  "/dashboard/customers",
  "/dashboard/tables",
  "/dashboard/gifts",
  "/dashboard/wishes",
  "/dashboard/song-requests",
  "/dashboard/ai-assistant",
  "/dashboard/staff/activity",
  "/dashboard/staff/login-history",
];

export const platformNavItems: NavItem[] = [
  { href: "/dashboard/platform", label: "إدارة المنصة", icon: Shield },
  { href: "/dashboard/platform/subscriptions", label: "الاشتراكات", icon: CreditCard },
  { href: "/dashboard/platform/billing", label: "الإيرادات", icon: CreditCard },
  { href: "/dashboard/platform/security", label: "الأمان", icon: Shield },
  { href: "/dashboard/platform/integrations", label: "Platform Integrations", icon: Activity },
  { href: "/dashboard/platform/meta", label: "Meta / WhatsApp", icon: Activity },
  { href: "/dashboard/platform/ai-engineer/permissions", label: "صلاحيات مهندس المنصة الذكي", icon: Bot },
];

export const restaurantNavItems: NavItem[] = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"] },
  { href: "/dashboard/staff", label: "الموظفون", icon: UserCog, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/staff/activity", label: "سجل نشاط المستخدمين", icon: Activity, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION"] },
  { href: "/dashboard/staff/login-history", label: "سجل الدخول", icon: Shield, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION"] },
  { href: "/dashboard/onboarding", label: "البدء", icon: Layers, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/settings", label: "إعدادات المطعم", icon: Store, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/restaurant", label: "بيانات المطعم", icon: Store, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/branches", label: "الفروع", icon: GitBranch, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/tables", label: "إدارة الطاولات", icon: Table2, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "WAITER"] },
  { href: "/dashboard/monitoring", label: "لوحة مراقبة المطعم", icon: Activity, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/gifts", label: "الإهداءات", icon: Gift, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION"] },
  { href: "/dashboard/wishes", label: "الأمنيات", icon: Sparkles, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION"] },
  { href: "/dashboard/song-requests", label: "طلبات الأغاني", icon: Music, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION"] },
  { href: "/dashboard/ai-assistant", label: "مساعد Menu OS الذكي", icon: Bot, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"] },
  { href: "/dashboard/reception", label: "الاستقبال", icon: ConciergeBell, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"] },
  { href: "/dashboard/reservations", label: "الحجوزات", icon: CalendarDays, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"] },
  { href: "/dashboard/customers", label: "سجل العملاء", icon: Users, roles: ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"] },
  { href: "/dashboard/menu/categories", label: "المنيو", icon: UtensilsCrossed, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/branding", label: "Landing Page Builder", icon: Palette, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/media", label: "مركز الوسائط", icon: Images, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/marketing", label: "التسويق الذكي", icon: Megaphone, roles: ["OWNER", "ADMIN", "MARKETING", "MANAGER"] },
  { href: "/dashboard/menu/options", label: "الخيارات والإضافات", icon: ListTree, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { href: "/dashboard/orders", label: "الطلبات", icon: ClipboardList, roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"] },
  { href: "/dashboard/kitchen", label: "المطبخ", icon: ChefHat, roles: ["OWNER", "ADMIN", "MANAGER", "KITCHEN"] },
  { href: "/dashboard/waiter-calls", label: "طلبات الخدمة", icon: Bell, roles: ["OWNER", "ADMIN", "MANAGER", "WAITER"] },
  { href: "/dashboard/reports", label: "التحليلات", icon: BarChart3, roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER"] },
  { href: "/dashboard/payments", label: "الدفع", icon: CreditCard, roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/dashboard/loyalty", label: "الولاء", icon: Gift, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/billing", label: "الفوترة", icon: CreditCard, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/subscription", label: "الاشتراك", icon: CreditCard, roles: ["OWNER", "ADMIN"] },
];

/** Manager read-only WhatsApp marketing routes */
export const MANAGER_WHATSAPP_MARKETING_ROUTES = [
  "/dashboard/marketing/whatsapp",
  "/dashboard/marketing/automations",
  "/dashboard/marketing/campaigns",
];

function managerWhatsAppMarketingAllowed(pathname: string): boolean {
  return MANAGER_WHATSAPP_MARKETING_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isMarketingStaff(role?: DashboardRole) {
  return role === "MARKETING";
}

function marketingRouteAllowed(pathname: string): boolean {
  return MARKETING_STAFF_ROUTES.some(
    (route) =>
      pathname === route ||
      (route !== "/dashboard" && pathname.startsWith(route))
  );
}

function isReceptionStaff(role?: DashboardRole) {
  return role === "RECEPTION";
}

function receptionRouteAllowed(pathname: string): boolean {
  return RECEPTION_STAFF_ROUTES.some(
    (route) =>
      pathname === route ||
      (route !== "/dashboard" && pathname.startsWith(route))
  );
}

export function getSidebarNavItems(opts: {
  isPlatformAdmin?: boolean;
  role?: DashboardRole;
}): NavItem[] {
  if (isPlatformAdminUser(opts)) {
    return [...platformNavItems, ...restaurantNavItems];
  }

  const role = opts.role ?? "OWNER";

  if (isReceptionStaff(role)) {
    return restaurantNavItems.filter((item) =>
      roleCanAccessNavItem("RECEPTION", item.roles)
    );
  }

  if (isMarketingStaff(role)) {
    return restaurantNavItems.filter((item) =>
      roleCanAccessNavItem("MARKETING", item.roles)
    );
  }

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

  if (isReceptionStaff(opts.role)) {
    if (pathname === "/dashboard") return false;
    return getSidebarNavItems(opts).some(
      (item) =>
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href))
    );
  }

  if (opts.role === "MANAGER" && pathname.startsWith("/dashboard/marketing")) {
    return managerWhatsAppMarketingAllowed(pathname);
  }

  if (isMarketingStaff(opts.role)) {
    if (pathname === "/dashboard") return false;
    return marketingRouteAllowed(pathname);
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
  if (opts.role === "RECEPTION") return "/dashboard/reception";
  if (opts.role === "MARKETING") return "/dashboard/marketing/command-center";
  if (opts.role === "KITCHEN") return "/dashboard/kitchen";
  if (opts.role === "WAITER") return "/dashboard/waiter-calls";
  if (opts.role === "CASHIER") return "/dashboard/payments";
  return "/dashboard";
}

export { PLATFORM_ADMIN_ROLE };
