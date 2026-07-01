export type Locale = "ar" | "en";

export const translations = {
  ar: {
    menu: "القائمة",
    search: "بحث...",
    favorites: "المفضلة",
    addToCart: "أضف للسلة",
    cart: "السلة",
    checkout: "الدفع",
    all: "الكل",
    featured: "مميز",
    unavailable: "غير متوفر",
    noResults: "لا توجد نتائج",
    language: "English",
  },
  en: {
    menu: "Menu",
    search: "Search...",
    favorites: "Favorites",
    addToCart: "Add to cart",
    cart: "Cart",
    checkout: "Checkout",
    all: "All",
    featured: "Featured",
    unavailable: "Unavailable",
    noResults: "No results",
    language: "العربية",
  },
} as const;

export function t(locale: Locale, key: keyof typeof translations.ar): string {
  return translations[locale][key];
}

export function itemName(
  item: { name: string; nameAr?: string | null; nameEn?: string | null },
  locale: Locale
) {
  if (locale === "ar") return item.nameAr || item.name;
  return item.nameEn || item.name;
}

export function itemDescription(
  item: {
    description?: string | null;
    descriptionAr?: string | null;
    descriptionEn?: string | null;
  },
  locale: Locale
) {
  if (locale === "ar") return item.descriptionAr || item.description;
  return item.descriptionEn || item.description;
}

export function categoryName(
  cat: { name: string; nameAr?: string | null; nameEn?: string | null },
  locale: Locale
) {
  if (locale === "ar") return cat.nameAr || cat.name;
  return cat.nameEn || cat.name;
}

export function effectivePrice(item: {
  price: number | string;
  discountPrice?: number | string | null;
}) {
  const price = Number(item.price);
  const discount = item.discountPrice != null ? Number(item.discountPrice) : null;
  if (discount != null && discount > 0 && discount < price) return discount;
  return price;
}
