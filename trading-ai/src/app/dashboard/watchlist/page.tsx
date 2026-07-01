import { WatchlistClient } from "@/components/watchlist-client";

export default function WatchlistPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Watchlist</h1>
      <p className="mt-1 text-sm text-zinc-500">Stocks · Crypto · Forex · Saudi market</p>
      <div className="mt-8">
        <WatchlistClient />
      </div>
    </div>
  );
}
