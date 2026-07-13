export type HomepageSectionId =
  | "menu"
  | "reservations"
  | "offers"
  | "branches"
  | "track_order"
  | "rate_visit"
  | "contact"
  | "whatsapp"
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

const SECTION_DEFINITIONS: Record<
  HomepageSectionId,
  Omit<HomepageSectionConfig, "order">
> = {
  menu: { id: "menu", titleAr: "المنيو", titleEn: "Menu", enabled: true },
  reservations: {
    id: "reservations",
    titleAr: "حجز طاولة",
    titleEn: "Reserve Table",
    enabled: true,
  },
  offers: { id: "offers", titleAr: "العروض", titleEn: "Offers", enabled: true },
  branches: {
    id: "branches",
    titleAr: "الفروع",
    titleEn: "Branches",
    enabled: true,
  },
  track_order: {
    id: "track_order",
    titleAr: "تتبع الطلب",
    titleEn: "Track Order",
    enabled: true,
  },
  rate_visit: {
    id: "rate_visit",
    titleAr: "تقييم الزيارة",
    titleEn: "Rate Visit",
    enabled: true,
  },
  contact: { id: "contact", titleAr: "تواصل", titleEn: "Contact", enabled: true },
  whatsapp: {
    id: "whatsapp",
    titleAr: "واتساب",
    titleEn: "WhatsApp",
    enabled: true,
  },
  events: { id: "events", titleAr: "الحفلات", titleEn: "Events", enabled: false },
  wishes: { id: "wishes", titleAr: "الأمنيات", titleEn: "Wishes", enabled: false },
  gift: { id: "gift", titleAr: "إهداء طاولة", titleEn: "Gift a Table", enabled: false },
};

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = Object.values(
  SECTION_DEFINITIONS
).map((s, order) => ({ ...s, order }));

export function parseHomepageSections(raw: unknown): HomepageSectionConfig[] {
  const byId = new Map<HomepageSectionId, HomepageSectionConfig>();
  for (const def of DEFAULT_HOMEPAGE_SECTIONS) {
    byId.set(def.id, { ...def });
  }

  if (Array.isArray(raw)) {
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
  }

  return [...byId.values()].sort((a, b) => a.order - b.order);
}

export function serializeHomepageSections(sections: HomepageSectionConfig[]) {
  return sections.map((s, i) => ({ ...s, order: i }));
}

export const SECTION_ICONS: Record<HomepageSectionId, string> = {
  menu: "🍽",
  reservations: "🪑",
  offers: "🎁",
  branches: "📍",
  track_order: "📦",
  rate_visit: "⭐",
  contact: "📞",
  whatsapp: "💬",
  events: "🎉",
  wishes: "💫",
  gift: "🎁",
};
