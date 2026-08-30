/** Saudi mobile number normalization and validation. */

const SA_MOBILE = /^(\+966|966|0)?5[0-9]{8}$/;

export function normalizeSaudiPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("966")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);

  if (!/^5[0-9]{8}$/.test(local)) return null;
  return `+966${local}`;
}

export function isValidSaudiPhone(raw: string): boolean {
  const normalized = normalizeSaudiPhone(raw);
  if (!normalized) return false;
  return SA_MOBILE.test(normalized.replace("+", "+")) || normalized.startsWith("+9665");
}

export function formatSaudiPhoneDisplay(normalized: string): string {
  if (!normalized.startsWith("+966")) return normalized;
  const local = normalized.slice(4);
  return `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

export function saPhoneInputValue(raw: string): string {
  const normalized = normalizeSaudiPhone(raw);
  if (normalized) return normalized;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `+966${digits}`;
  return raw;
}
