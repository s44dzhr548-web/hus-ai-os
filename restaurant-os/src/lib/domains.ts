/**
 * Custom domain resolution for multi-tenant restaurants.
 * Map hostnames to restaurant slugs for white-label menus.
 */

export interface DomainConfig {
  hostname: string;
  restaurantSlug: string;
  verified: boolean;
}

export function getPlatformDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

export function isCustomDomainHost(host: string): boolean {
  const platform = getPlatformDomain();
  const normalized = host.split(":")[0].toLowerCase();
  return (
    normalized !== platform &&
    normalized !== "localhost" &&
    !normalized.endsWith(".vercel.app")
  );
}

export function buildMenuUrl(tableId: string, customDomain?: string | null): string {
  if (customDomain) {
    return `https://${customDomain}/menu/${tableId}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  return `${base}/menu/${tableId}`;
}

export function buildRestaurantMenuUrl(
  restaurantSlug: string,
  customDomain?: string | null
): string {
  if (customDomain) {
    return `https://${customDomain}/menu`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  return `${base}/menu?restaurant=${restaurantSlug}`;
}
