"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  getCart,
  saveCart,
  cartTotal,
  type CartItem,
} from "@/lib/cart";
import {
  t,
  itemName,
  itemDescription,
  categoryName,
  effectivePrice,
  type Locale,
} from "@/lib/i18n";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  Globe,
} from "lucide-react";
import { ProductMediaModal } from "@/components/menu/product-media";
import { CategoryProductLayout } from "@/components/menu/category-layout";
import { MenuSkeleton } from "@/components/media/media-uploader";
import { fontCss } from "@/lib/restaurant-links";

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
  isFeatured: boolean;
  isAvailable?: boolean;
  calories?: number | null;
  prepTimeMinutes?: number | null;
  galleryUrls?: string[] | null;
}

interface SubCategory {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  color?: string;
  icon?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "IMAGE" | "VIDEO";
  items: MenuItem[];
}

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  color?: string;
  icon?: string;
  imageUrl?: string;
  videoUrl?: string;
  previewUrl?: string;
  mediaType?: "IMAGE" | "VIDEO";
  items: MenuItem[];
  children: SubCategory[];
}

function sectionTabMedia(cat: Category) {
  const src =
    cat.previewUrl ||
    (cat.mediaType === "VIDEO" ? cat.videoUrl : cat.imageUrl);
  if (src) {
    if (cat.mediaType === "VIDEO" && cat.videoUrl) {
      return (
        <video
          src={src}
          className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
          muted
          playsInline
        />
      );
    }
    return (
      <img
        src={src}
        alt=""
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-full text-lg ring-2 ring-white"
      style={{ backgroundColor: `${cat.color || "#047857"}33` }}
    >
      {cat.icon || "🍽️"}
    </span>
  );
}

interface MenuData {
  table: { id: string; number: number; label?: string };
  branch: { id: string; name: string; nameEn?: string };
  restaurant: {
    id: string;
    name: string;
    nameEn?: string;
    logoUrl?: string;
    coverUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    buttonColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  categories: Category[];
}

function guestToken() {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("menuos_guest");
  if (!token) {
    token = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("menuos_guest", token);
  }
  return token;
}

export default function CustomerMenuPage() {
  const params = useParams();
  const tableId = params.tableId as string;

  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [openedItem, setOpenedItem] = useState<MenuItem | null>(null);
  const [locale, setLocale] = useState<Locale>("ar");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "favorites">("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<MenuItem[]>([]);

  async function callService(type: string) {
    await fetch("/api/table-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, type }),
    });
    alert(locale === "ar" ? "تم إرسال الطلب" : "Request sent");
  }

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    setCart(getCart(tableId));
    fetch(`/api/public/menu/${tableId}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setMenu(data);
        if (data.suggestedItems) setSuggested(data.suggestedItems);
        if (data.categories[0]) {
          setActiveCategory(data.categories[0].id);
        }
      })
      .catch(() => setError(locale === "ar" ? "الطاولة غير موجودة" : "Table not found"))
      .finally(() => setLoading(false));
  }, [tableId, locale]);

  useEffect(() => {
    if (!menu) return;
    fetch(
      `/api/favorites?restaurantId=${menu.restaurant.id}&guestToken=${guestToken()}`
    )
      .then((r) => r.json())
      .then((items: { id: string }[]) =>
        setFavorites(Array.isArray(items) ? items.map((i) => i.id) : [])
      )
      .catch(() => {});
  }, [menu]);

  function updateCart(items: CartItem[]) {
    setCart(items);
    saveCart(tableId, items);
  }

  function addToCart(item: MenuItem) {
    const price = effectivePrice(item);
    const name = itemName(item, locale);
    const existing = cart.find((i) => i.id === item.id);
    const next = existing
      ? cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      : [
          ...cart,
          { id: item.id, name, price, quantity: 1, imageUrl: item.imageUrl },
        ];
    updateCart(next);
  }

  function updateQty(id: string, delta: number) {
    updateCart(
      cart
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  async function toggleFavorite(itemId: string) {
    if (!menu) return;
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: menu.restaurant.id,
        menuItemId: itemId,
        guestToken: guestToken(),
      }),
    });
    const data = await res.json();
    if (data.favorited) {
      setFavorites((f) => [...f, itemId]);
    } else {
      setFavorites((f) => f.filter((id) => id !== itemId));
    }
  }

  function trackView(itemId: string) {
    fetch(`/api/public/menu/items/${itemId}/view`, { method: "POST" }).catch(
      () => {}
    );
  }

  const activeCat = menu?.categories.find((c) => c.id === activeCategory);

  const brand = menu?.restaurant;
  const theme = {
    primary: brand?.primaryColor || "#047857",
    secondary: brand?.secondaryColor || "#065f46",
    background: brand?.backgroundColor || "#f9fafb",
    button: brand?.buttonColor || "#047857",
    text: brand?.textColor || "#111827",
  };

  const displayItems = useMemo(() => {
    if (!activeCat) return [];

    let items: MenuItem[] = activeCat.items || [];

    if (filter === "featured") {
      items = items.filter((i) => i.isFeatured);
    } else if (filter === "favorites") {
      items = items.filter((i) => favorites.includes(i.id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((item) => {
        const n = itemName(item, locale).toLowerCase();
        const d = (itemDescription(item, locale) || "").toLowerCase();
        return n.includes(q) || d.includes(q);
      });
    }

    return items;
  }, [activeCat, filter, favorites, search, locale]);

  const total = cartTotal(cart);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#f9fafb" }}>
        <MenuSkeleton />
      </div>
    );
  }
  if (error || !menu) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-lg text-red-600">{error || "Error"}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: fontCss(brand?.fontFamily),
        ["--menu-primary" as string]: theme.primary,
        ["--menu-secondary" as string]: theme.secondary,
        ["--menu-button" as string]: theme.button,
        ["--menu-text" as string]: theme.text,
      }}
    >
      {brand?.coverUrl && (
        <div className="relative h-32 w-full overflow-hidden">
          <img src={brand.coverUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}
      <header
        className="sticky top-0 z-30 px-4 py-4 text-white shadow-lg"
        style={{ backgroundColor: theme.primary }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {menu.restaurant.logoUrl && (
            <img
              src={menu.restaurant.logoUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30"
            />
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold">
              {locale === "ar"
                ? menu.restaurant.name
                : menu.restaurant.nameEn || menu.restaurant.name}
            </h1>
            <p className="text-sm opacity-80">
              {locale === "ar" ? menu.branch.name : menu.branch.nameEn || menu.branch.name}
              {" · "}
              {locale === "ar" ? `طاولة ${menu.table.number}` : `Table ${menu.table.number}`}
            </p>
          </div>
          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="rounded-lg p-2"
            style={{ backgroundColor: theme.secondary }}
            aria-label="Toggle language"
          >
            <Globe className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="sticky top-[76px] z-20 space-y-2 border-b border-gray-200 bg-white px-4 py-2">
        <div className="relative mx-auto max-w-lg">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ltr:left-3 rtl:right-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(locale, "search")}
            className="w-full rounded-full border border-gray-200 py-2 text-sm ltr:pl-10 ltr:pr-4 rtl:pl-4 rtl:pr-10"
          />
        </div>
        <div className="mx-auto flex max-w-lg gap-1 overflow-x-auto scrollbar-hide">
          {(["all", "featured", "favorites"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === f ? "text-white" : "bg-gray-100 text-gray-700"
              }`}
              style={filter === f ? { backgroundColor: theme.button } : undefined}
            >
              {f === "all"
                ? t(locale, "all")
                : f === "featured"
                  ? t(locale, "featured")
                  : t(locale, "favorites")}
            </button>
          ))}
        </div>
        <div className="mx-auto flex max-w-lg gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {menu.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                activeCategory === cat.id ? "bg-gray-50" : ""
              }`}
            >
              <div
                className="rounded-full"
                style={
                  activeCategory === cat.id
                    ? { boxShadow: `0 0 0 2px ${cat.color || theme.button}` }
                    : undefined
                }
              >
                {sectionTabMedia(cat)}
              </div>
              <span
                className={`max-w-[72px] truncate text-center text-xs font-medium ${
                  activeCategory === cat.id ? "text-gray-900" : "text-gray-600"
                }`}
              >
                {categoryName(cat, locale)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        {displayItems.length === 0 ? (
          <p className="py-8 text-center text-gray-500">{t(locale, "noResults")}</p>
        ) : (
          <CategoryProductLayout
            items={displayItems}
            locale={locale}
            favorites={favorites}
            accentColor={activeCat?.color || theme.button}
            buttonColor={theme.button}
            featuredLabel={t(locale, "featured")}
            unavailableLabel={t(locale, "unavailable")}
            addLabel={t(locale, "addToCart")}
            caloriesLabel={locale === "ar" ? "سعرة" : "cal"}
            onOpen={(item) => {
              trackView(item.id);
              setOpenedItem(item);
            }}
            onFavorite={toggleFavorite}
            onAdd={addToCart}
          />
        )}
        {suggested.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-gray-900">
              {locale === "ar" ? "قد يعجبك أيضاً" : "You may also like"}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {suggested.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="min-w-[140px] shrink-0 rounded-xl bg-white p-3 text-right shadow ring-1 ring-gray-100"
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="mb-2 h-20 w-full rounded-lg object-cover" />
                  )}
                  <p className="text-sm font-semibold">{itemName(item, locale)}</p>
                  <p className="text-xs" style={{ color: theme.button }}>
                    {formatCurrency(effectivePrice(item))}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-20 left-0 right-0 z-30 mx-auto flex max-w-lg justify-center gap-2 px-4">
        {[
          { type: "CALL_WAITER", label: locale === "ar" ? "نادل" : "Waiter" },
          { type: "REQUEST_BILL", label: locale === "ar" ? "فاتورة" : "Bill" },
          { type: "HELP", label: locale === "ar" ? "مساعدة" : "Help" },
        ].map((btn) => (
          <button
            key={btn.type}
            onClick={() => callService(btn.type)}
            className="rounded-full bg-white px-4 py-2 text-xs font-medium shadow ring-1"
            style={{ color: theme.primary, borderColor: theme.primary }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full px-6 py-3 text-white shadow-xl"
          style={{ backgroundColor: theme.button }}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="font-bold">{cartCount}</span>
          <span className="font-bold">{formatCurrency(total)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
          <div className="max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t(locale, "cart")}</h2>
              <button onClick={() => setCartOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm" style={{ color: theme.button }}>
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="rounded-full bg-gray-100 p-1"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="rounded-full bg-emerald-100 p-1 text-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-between text-lg font-bold">
              <span>{locale === "ar" ? "الإجمالي" : "Total"}</span>
              <span style={{ color: theme.button }}>{formatCurrency(total)}</span>
            </div>
            <Link href={`/checkout/${tableId}`} className="mt-4 block">
              <Button className="w-full" size="lg" onClick={() => setCartOpen(false)}>
                {t(locale, "checkout")}
              </Button>
            </Link>
          </div>
        </div>
      )}

      <ProductMediaModal
        item={openedItem ?? { id: "", name: "", isFeatured: false }}
        locale={locale}
        open={!!openedItem}
        onClose={() => setOpenedItem(null)}
      />
    </div>
  );
}
