export type HomepageSectionId =
  | "menu"
  | "reservations"
  | "offers"
  | "events"
  | "wishes"
  | "gift";

export interface HomepageSectionConfig {
  id: HomepageSectionId;
  titleAr: string;
  titleEn: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  { id: "menu", titleAr: "المنيو", titleEn: "Menu", enabled: true, order: 0 },
  { id: "reservations", titleAr: "الحجوزات", titleEn: "Reservations", enabled: true, order: 1 },
  { id: "offers", titleAr: "العروض", titleEn: "Offers", enabled: true, order: 2 },
  { id: "events", titleAr: "الحفلات", titleEn: "Events", enabled: true, order: 3 },
  { id: "wishes", titleAr: "الأمنيات", titleEn: "Wishes", enabled: true, order: 4 },
  { id: "gift", titleAr: "طلب إهداء", titleEn: "Gift Order", enabled: true, order: 5 },
];

export function parseHomepageSections(raw: unknown): HomepageSectionConfig[] {
  if (!Array.isArray(raw)) return [...DEFAULT_HOMEPAGE_SECTIONS];
  const byId = new Map(DEFAULT_HOMEPAGE_SECTIONS.map((s) => [s.id, { ...s }]));
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = o.id as HomepageSectionId;
    if (!byId.has(id)) continue;
    const base = byId.get(id)!;
    byId.set(id, {
      id,
      titleAr: typeof o.titleAr === "string" ? o.titleAr : base.titleAr,
      titleEn: typeof o.titleEn === "string" ? o.titleEn : base.titleEn,
      enabled: typeof o.enabled === "boolean" ? o.enabled : base.enabled,
      order: typeof o.order === "number" ? o.order : base.order,
    });
  }
  return [...byId.values()].sort((a, b) => a.order - b.order);
}

export function serializeHomepageSections(sections: HomepageSectionConfig[]) {
  return sections.map((s, i) => ({ ...s, order: i }));
}

export const SECTION_ICONS: Record<HomepageSectionId, string> = {
  menu: "🍽️",
  reservations: "📅",
  offers: "✨",
  events: "🎉",
  wishes: "💫",
  gift: "🎁",
};
