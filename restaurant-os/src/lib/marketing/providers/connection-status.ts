/** Shared rules for marketing AI / video provider connection UI and API. */

const USABLE_STATUSES = new Set([
  "HEALTHY",
  "CONNECTED",
  "ACTIVE",
  "VALID",
]);

export function isProviderConnectionUsable(
  status: string | null | undefined,
  hasSecret: boolean
): boolean {
  if (!hasSecret) return false;
  const normalized = (status ?? "DISCONNECTED").toUpperCase();
  if (normalized === "INVALID_KEY" || normalized === "EXPIRED") return false;
  if (USABLE_STATUSES.has(normalized)) return true;
  // Encrypted key stored but status stale (e.g. after deploy) — still usable until explicit disconnect
  if (normalized === "DISCONNECTED" || normalized === "NEEDS_RECONNECT") return true;
  return false;
}

export function uiConnectionLabel(
  status: string | null | undefined,
  hasSecret: boolean
): "connected" | "disconnected" {
  return isProviderConnectionUsable(status, hasSecret) ? "connected" : "disconnected";
}

export function normalizeProviderKey(key: string): string {
  return key.trim().toUpperCase();
}

export function providerKeyForApi(key: string): string {
  return normalizeProviderKey(key).toLowerCase();
}
