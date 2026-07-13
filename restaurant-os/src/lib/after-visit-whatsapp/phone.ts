/** Normalize Saudi/mobile numbers to E.164 digits without + (e.g. 9665xxxxxxxx) */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("966") && digits.length >= 12) return digits;
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `966${digits}`;
  return digits.length >= 10 ? digits : null;
}

export function isValidCustomerPhone(raw: string | null | undefined): boolean {
  return normalizeWhatsAppPhone(raw) != null;
}
