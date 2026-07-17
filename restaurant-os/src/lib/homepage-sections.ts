import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  CalendarDays,
  Gift,
  Sparkles,
  Music,
  Tag,
  PartyPopper,
  MapPin,
  Package,
  Star,
  Phone,
  MessageCircle,
} from "lucide-react";

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
  | "gift"
  | "song_request";

export interface HomepageSectionConfig {
  id: HomepageSectionId;
  titleAr: string;
  titleEn: string;
  enabled: boolean;
  order: number;
}

/** Primary customer landing navigation (max 7 tiles) */
export const PRIMARY_NAV_SECTION_IDS: HomepageSectionId[] = [
  "menu",
  "reservations",
  "gift",
  "wishes",
  "song_request",
  "offers",
  "events",
];

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
  gift: { id: "gift", titleAr: "الإهداء", titleEn: "Gifts", enabled: true },
  wishes: { id: "wishes", titleAr: "الأمنيات", titleEn: "Wishes", enabled: true },
  song_request: {
    id: "song_request",
    titleAr: "طلب أغنية",
    titleEn: "Song Request",
    enabled: true,
  },
  offers: { id: "offers", titleAr: "العروض", titleEn: "Offers", enabled: true },
  events: { id: "events", titleAr: "الحفلات", titleEn: "Events", enabled: true },
  branches: {
    id: "branches",
    titleAr: "الفروع",
    titleEn: "Branches",
    enabled: false,
  },
  track_order: {
    id: "track_order",
    titleAr: "تتبع الطلب",
    titleEn: "Track Order",
    enabled: false,
  },
  rate_visit: {
    id: "rate_visit",
    titleAr: "تقييم الزيارة",
    titleEn: "Rate Visit",
    enabled: false,
  },
  contact: { id: "contact", titleAr: "تواصل", titleEn: "Contact", enabled: false },
  whatsapp: {
    id: "whatsapp",
    titleAr: "واتساب",
    titleEn: "WhatsApp",
    enabled: false,
  },
};

const PRIMARY_ORDER: Record<HomepageSectionId, number> = {
  menu: 0,
  reservations: 1,
  gift: 2,
  wishes: 3,
  song_request: 4,
  offers: 5,
  events: 6,
  branches: 10,
  track_order: 11,
  rate_visit: 12,
  contact: 13,
  whatsapp: 14,
};

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = Object.values(
  SECTION_DEFINITIONS
).map((s) => ({ ...s, order: PRIMARY_ORDER[s.id] }));

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

/** Legacy emoji icons for admin preview fallback */
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
  wishes: "✨",
  gift: "🎁",
  song_request: "🎵",
};

export const SECTION_LUCIDE_ICONS: Record<HomepageSectionId, LucideIcon> = {
  menu: UtensilsCrossed,
  reservations: CalendarDays,
  gift: Gift,
  wishes: Sparkles,
  song_request: Music,
  offers: Tag,
  events: PartyPopper,
  branches: MapPin,
  track_order: Package,
  rate_visit: Star,
  contact: Phone,
  whatsapp: MessageCircle,
};

export type CustomerFeatureFlags = {
  tableGiftsEnabled?: boolean;
  customerWishesEnabled?: boolean;
  customerSongRequestsEnabled?: boolean;
};

/** Maps customer feature sections to restaurant DB flags */
export const FEATURE_FLAG_BY_SECTION: Partial<
  Record<HomepageSectionId, keyof CustomerFeatureFlags>
> = {
  gift: "tableGiftsEnabled",
  wishes: "customerWishesEnabled",
  song_request: "customerSongRequestsEnabled",
};

export const FEATURE_SECTION_EMOJI: Partial<Record<HomepageSectionId, string>> = {
  gift: "🎁",
  wishes: "✨",
  song_request: "🎵",
};

export function filterSectionsByFeatureFlags(
  sections: HomepageSectionConfig[],
  flags: CustomerFeatureFlags
): HomepageSectionConfig[] {
  return sections.filter((s) => {
    const flagKey = FEATURE_FLAG_BY_SECTION[s.id];
    if (flagKey) {
      return flags[flagKey] === true;
    }
    return true;
  });
}

export function resolvePrimaryNavSections(
  sections: HomepageSectionConfig[],
  flags: CustomerFeatureFlags
): HomepageSectionConfig[] {
  const byId = new Map<HomepageSectionId, HomepageSectionConfig>();
  for (const def of DEFAULT_HOMEPAGE_SECTIONS) {
    byId.set(def.id, { ...def });
  }
  for (const s of sections) {
    if (byId.has(s.id)) {
      byId.set(s.id, { ...byId.get(s.id)!, ...s });
    }
  }

  return PRIMARY_NAV_SECTION_IDS.flatMap((id) => {
    const section = byId.get(id)!;
    const flagKey = FEATURE_FLAG_BY_SECTION[id];

    if (flagKey) {
      if (flags[flagKey] !== true) return [];
      return [{ ...section, enabled: true }];
    }

    if (!section.enabled) return [];
    return [section];
  });
}
