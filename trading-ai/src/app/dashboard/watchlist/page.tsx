"use client";

import { WatchlistClient } from "@/components/watchlist-client";
import { PageHeader } from "@/components/trading-shell";
import { useI18n } from "@/lib/i18n/context";

export default function WatchlistPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.watchlist.title} subtitle={t.watchlist.subtitle} />
      <WatchlistClient />
    </div>
  );
}
