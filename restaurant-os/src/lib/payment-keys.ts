/**
 * Platform Moyasar keys — always read from environment variables.
 * Never use placeholder values from the database.
 */

const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /^pk_test_placeholder$/i,
  /^sk_test_placeholder$/i,
  /^pk_test_tap_placeholder$/i,
  /^sk_test_tap_placeholder$/i,
];

export function isPlaceholderPaymentKey(value?: string | null): boolean {
  if (!value?.trim()) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

export function sanitizePaymentKey(value?: string | null): string {
  if (isPlaceholderPaymentKey(value)) return "";
  return value!.trim();
}

export function getMoyasarPublishableKey(): string {
  return (process.env.MOYASAR_PUBLISHABLE_KEY || "").trim();
}

export function getMoyasarSecretKey(): string {
  return (process.env.MOYASAR_SECRET_KEY || "").trim();
}

export function getMoyasarBillingMode(): "live" | "mock" | "auto" {
  const mode = (process.env.MOYASAR_BILLING_MODE || "auto").toLowerCase();
  if (mode === "live" || mode === "mock") return mode;
  return "auto";
}

/** Customer restaurant checkout (QR orders) — defaults to mock for server-side API checkout. */
export function getRestaurantCheckoutMode(): "live" | "mock" {
  const mode = (process.env.MOYASAR_RESTAURANT_CHECKOUT_MODE || "mock").toLowerCase();
  return mode === "live" ? "live" : "mock";
}

export function moyasarKeysConfigured(): boolean {
  const pub = getMoyasarPublishableKey();
  const sec = getMoyasarSecretKey();
  return (
    pub.length > 0 &&
    sec.length > 0 &&
    !isPlaceholderPaymentKey(pub) &&
    !isPlaceholderPaymentKey(sec)
  );
}

/** Resolve publishable key for Moyasar provider (env only). */
export function resolveMoyasarPublishableKey(_restaurantKey?: string | null): string {
  return getMoyasarPublishableKey();
}

/** Resolve secret key for Moyasar provider (env only). */
export function resolveMoyasarSecretKey(_restaurantKey?: string | null): string {
  return getMoyasarSecretKey();
}

/** Mask key for API responses — never expose placeholders. */
export function maskSecretKey(value?: string | null): string {
  const clean = sanitizePaymentKey(value);
  return clean ? "••••••••" : "";
}

/** Safe publishable key for API/UI — empty if placeholder or missing. */
export function safePublishableKey(value?: string | null): string {
  const fromEnv = getMoyasarPublishableKey();
  if (fromEnv && !isPlaceholderPaymentKey(fromEnv)) return fromEnv;
  return sanitizePaymentKey(value);
}
