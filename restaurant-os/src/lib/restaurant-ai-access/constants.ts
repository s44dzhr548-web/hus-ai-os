import type { PlatformBrainRoleId } from "@/lib/platform/ai-providers-constants";

/** Roles assignable per restaurant (excludes platform-only engineer). */
export const RESTAURANT_AI_ROLES = [
  { id: "MENU_OS_ASSISTANT" as const, labelAr: "مساعد Menu OS" },
  { id: "MARKETING_MANAGER" as const, labelAr: "مدير التسويق" },
  { id: "AD_COPYWRITER" as const, labelAr: "كاتب الإعلانات" },
  { id: "DATA_ANALYST" as const, labelAr: "محلل البيانات" },
] as const;

export type RestaurantAiRoleId = (typeof RESTAURANT_AI_ROLES)[number]["id"];

export const RESTAURANT_AI_ROLE_IDS: RestaurantAiRoleId[] = RESTAURANT_AI_ROLES.map((r) => r.id);

export const PLATFORM_ONLY_AI_ROLE: PlatformBrainRoleId = "PLATFORM_ENGINEER";

/** Rough estimate per gpt-4o-mini request (SAR). */
export const ESTIMATED_COST_PER_REQUEST_SAR = 0.015;

export const DEFAULT_DAILY_LIMIT = 200;
export const DEFAULT_MONTHLY_LIMIT = 3000;
export const DEFAULT_MONTHLY_COST_SAR = 500;

export function isRestaurantAiRole(roleId: string): roleId is RestaurantAiRoleId {
  return RESTAURANT_AI_ROLE_IDS.includes(roleId as RestaurantAiRoleId);
}

export function restaurantRoleLabel(roleId: string): string {
  return RESTAURANT_AI_ROLES.find((r) => r.id === roleId)?.labelAr ?? roleId;
}
