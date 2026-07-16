const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";
const ENGLISH = "0123456789";

/** Canonical table number for uniqueness checks (branch-scoped). */
export function normalizeTableNumber(input: string | number | null | undefined): string {
  if (input == null) return "";
  let s = String(input).trim().normalize("NFKC");

  for (let i = 0; i < 10; i++) {
    s = s.replace(new RegExp(ARABIC_INDIC[i], "g"), ENGLISH[i]);
    s = s.replace(new RegExp(PERSIAN[i], "g"), ENGLISH[i]);
  }

  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^(طاولة|table)[\s\-_]*/i, "");
  s = s.toLowerCase();
  s = s.replace(/[\s\-_]+/g, "");
  return s;
}

/** Owner-facing display value (preserves readable form). */
export function displayTableNumber(input: string | number | null | undefined): string {
  if (input == null) return "";
  let s = String(input).trim().normalize("NFKC");
  for (let i = 0; i < 10; i++) {
    s = s.replace(new RegExp(ARABIC_INDIC[i], "g"), ENGLISH[i]);
    s = s.replace(new RegExp(PERSIAN[i], "g"), ENGLISH[i]);
  }
  return s.replace(/\s+/g, " ").trim();
}

export function numericTableNumber(normalized: string): number | null {
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const n = parseInt(normalized, 10);
  return Number.isFinite(n) ? n : null;
}

export const TABLE_DUPLICATE_ERROR_AR =
  "يوجد بالفعل جدول أو طاولة تحمل الرقم نفسه، سواء كُتب بالأرقام العربية أو الإنجليزية.";
