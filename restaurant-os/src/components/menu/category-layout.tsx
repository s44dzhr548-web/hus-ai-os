"use client";

import { Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { itemName, itemDescription, effectivePrice, type Locale } from "@/lib/i18n";
import { ProductCardMedia } from "@/components/menu/product-media";

export type CategoryLayoutType = "GRID" | "LIST" | "CARDS" | "IMAGE_FIRST" | "VIDEO_FIRST" | "COMPACT";

interface MenuItem {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;
  discountPrice?: number | null;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | string;
  previewUrl?: string;
  calories?: number | null;
  isFeatured: boolean;
  isAvailable?: boolean;
}

interface CategoryLayoutProps {
  layout?: CategoryLayoutType;
  items: MenuItem[];
  locale: Locale;
  favorites: string[];
  accentColor: string;
  buttonColor: string;
  featuredLabel: string;
  unavailableLabel: string;
  addLabel: string;
  caloriesLabel?: string;
  onOpen: (item: MenuItem) => void;
  onFavorite: (id: string) => void;
  onAdd: (item: MenuItem) => void;
}

function CaloriesBadge({
  calories,
  locale,
  label,
}: {
  calories?: number | null;
  locale: Locale;
  label?: string;
}) {
  if (calories == null) return null;
  return (
    <span className="text-xs text-gray-500">
      {calories} {label || (locale === "ar" ? "سعرة" : "cal")}
    </span>
  );
}

function ItemCard({
  item,
  locale,
  favorites,
  featuredLabel,
  unavailableLabel,
  addLabel,
  caloriesLabel,
  buttonColor,
  onOpen,
  onFavorite,
  onAdd,
}: {
  item: MenuItem;
  locale: Locale;
  favorites: string[];
  featuredLabel: string;
  unavailableLabel: string;
  addLabel: string;
  caloriesLabel?: string;
  buttonColor: string;
  onOpen: (item: MenuItem) => void;
  onFavorite: (id: string) => void;
  onAdd: (item: MenuItem) => void;
}) {
  const price = effectivePrice(item);
  const unavailable = item.isAvailable === false;
  const hasMedia = !!(item.videoUrl || item.imageUrl || item.previewUrl);

  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ${unavailable ? "opacity-75" : ""}`}>
      {hasMedia && (
        <ProductCardMedia
          item={item}
          locale={locale}
          isFavorite={favorites.includes(item.id)}
          featuredLabel={featuredLabel}
          onOpen={() => onOpen(item)}
          onFavorite={() => onFavorite(item.id)}
        />
      )}
      <div className="p-4">
        <h3 className="font-bold">{itemName(item, locale)}</h3>
        {itemDescription(item, locale) && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">
            {itemDescription(item, locale)}
          </p>
        )}
        <div className="mt-2">
          <CaloriesBadge calories={item.calories} locale={locale} label={caloriesLabel} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-bold" style={{ color: buttonColor }}>
            {formatCurrency(price)}
          </span>
          <Button
            size="sm"
            disabled={unavailable}
            onClick={() => onAdd(item)}
            style={{ backgroundColor: buttonColor }}
            className="min-h-10 shrink-0"
          >
            {unavailable ? unavailableLabel : addLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CategoryProductLayout({
  items,
  locale,
  favorites,
  buttonColor,
  featuredLabel,
  unavailableLabel,
  addLabel,
  caloriesLabel,
  onOpen,
  onFavorite,
  onAdd,
}: CategoryLayoutProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          locale={locale}
          favorites={favorites}
          featuredLabel={featuredLabel}
          unavailableLabel={unavailableLabel}
          addLabel={addLabel}
          caloriesLabel={caloriesLabel}
          buttonColor={buttonColor}
          onOpen={onOpen}
          onFavorite={onFavorite}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
