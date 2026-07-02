"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MarketBrowseItem, MarketCategory, MarketSortOption } from "@/lib/market/markets-browser";
import { MARKET_CATEGORIES, MARKET_SORT_OPTIONS } from "@/lib/market/markets-browser";
import { MarketsAssetCard } from "./markets-asset-card";
import { useI18n } from "@/lib/i18n/context";

type BrowseResponse = {
  items: MarketBrowseItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  category: MarketCategory;
  sort: MarketSortOption;
};

export function MarketsClient() {
  const { t, locale } = useI18n();
  const [category, setCategory] = useState<MarketCategory>("all");
  const [sort, setSort] = useState<MarketSortOption>("ai_opportunity");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [items, setItems] = useState<MarketBrowseItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      const params = new URLSearchParams({
        category,
        sort,
        page: String(pageNum),
        pageSize: "12",
        lang: locale,
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/markets/browse?${params}`);
      const data: BrowseResponse = await res.json();
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(data.page);
    },
    [category, sort, search, locale]
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(1, true).finally(() => setLoading(false));
  }, [fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadingMore(true);
          fetchPage(page + 1, false).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchPage]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  const categoryLabel = (c: MarketCategory) => t.markets.categories[c];
  const sortLabel = (s: MarketSortOption) => t.markets.sort[s];

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200/90">{t.markets.disclaimer}</div>

      <form onSubmit={applySearch} className="flex flex-wrap gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t.markets.searchPlaceholder}
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
          {t.markets.searchOptional}
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setSearch("");
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            {t.markets.clearSearch}
          </button>
        )}
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">{t.markets.filterBy}</p>
        <div className="flex flex-wrap gap-2">
          {MARKET_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                category === c ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="market-sort" className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
          {t.markets.sortBy}
        </label>
        <select
          id="market-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as MarketSortOption)}
          className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          {MARKET_SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {sortLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-zinc-500">
        {t.markets.showing} {items.length} / {total} · {categoryLabel(category)} · {sortLabel(sort)}
      </p>

      {loading ? (
        <p className="text-zinc-500">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-500">{t.common.empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <MarketsAssetCard key={`${item.symbol}-${item.rank}`} item={item} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="py-4 text-center text-sm text-zinc-500">
        {loadingMore ? t.markets.loadingMore : hasMore ? t.markets.scrollMore : t.markets.endOfList}
      </div>
    </div>
  );
}
