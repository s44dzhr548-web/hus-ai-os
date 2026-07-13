/** Predefined table areas — stored in `floorZone` */
export const TABLE_AREAS = [
  { id: "indoor", labelAr: "داخلي", labelEn: "Indoor" },
  { id: "outdoor", labelAr: "خارجي", labelEn: "Outdoor" },
  { id: "vip", labelAr: "VIP", labelEn: "VIP" },
  { id: "family", labelAr: "عائلات", labelEn: "Family" },
  { id: "smoking", labelAr: "مدخنين", labelEn: "Smoking" },
  { id: "events", labelAr: "فعاليات", labelEn: "Events" },
] as const;

export type TableAreaId = (typeof TABLE_AREAS)[number]["id"] | string;

export function areaLabel(id: string | null | undefined, locale: "ar" | "en" = "ar") {
  if (!id) return locale === "ar" ? "غير محدد" : "Unassigned";
  const preset = TABLE_AREAS.find((a) => a.id === id);
  if (preset) return locale === "ar" ? preset.labelAr : preset.labelEn;
  return id;
}

export function isPresetArea(id: string) {
  return TABLE_AREAS.some((a) => a.id === id);
}
