const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function normalizeHex(value: string, fallback = "#047857"): string {
  const trimmed = value.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  const short = trimmed.replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(short)) {
    const expanded = short
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${expanded}`.toLowerCase();
  }
  return fallback;
}
