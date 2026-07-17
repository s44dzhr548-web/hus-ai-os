"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LandingSubPage } from "@/components/customer/landing-sub-page";
import { CustomerSessionGate } from "@/components/customer/customer-session-gate";
import { Button } from "@/components/ui";
import {
  SONG_TARGETS,
  SONG_TARGET_LABELS_AR,
  SONG_STATUS_LABELS_AR,
} from "@/lib/song-requests/types";
import type { SongRequestTarget } from "@prisma/client";

type SongRow = {
  id: string;
  songName: string;
  artistName: string | null;
  status: string;
  statusLabel: string;
  targetLabel: string;
  createdAt: string;
};

type TargetTable = {
  tableId: string;
  tableNumber: string;
  tableLabel: string | null;
};

export default function SongRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0a09] p-8 text-white">...</div>}>
      <SongRequestForm />
    </Suspense>
  );
}

function SongRequestForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableId = searchParams.get("table");

  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#d4af37");
  const [songName, setSongName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [dedicationMessage, setDedicationMessage] = useState("");
  const [target, setTarget] = useState<SongRequestTarget>("SAME_TABLE");
  const [targetTableId, setTargetTableId] = useState("");
  const [targetTables, setTargetTables] = useState<TargetTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [sessionBlocked, setSessionBlocked] = useState(!tableId);
  const [requests, setRequests] = useState<SongRow[]>([]);

  useEffect(() => {
    fetch(`/api/public/restaurants/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setRestaurantName(data.nameAr || data.name || "");
        setLogoUrl(data.logoUrl);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!tableId) {
      setSessionBlocked(true);
      return;
    }
    fetch(`/api/public/song-requests?tableId=${tableId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setSessionBlocked(true);
          return;
        }
        setRequests(data.requests || []);
      })
      .catch(() => setSessionBlocked(true));

    fetch(`/api/public/song-requests?tableId=${tableId}&tables=1`)
      .then((r) => r.json())
      .then((data) => setTargetTables(data.tables || []))
      .catch(() => {});
  }, [tableId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tableId) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/public/song-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId,
        songName,
        artistName: artistName || null,
        linkUrl: linkUrl || null,
        dedicationMessage: dedicationMessage || null,
        target,
        targetTableId: target === "OTHER_TABLE" ? targetTableId : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الإرسال");
      return;
    }
    setDone(true);
    setRequests((prev) => [data.request, ...prev]);
    setSongName("");
    setArtistName("");
    setLinkUrl("");
    setDedicationMessage("");
  }

  if (sessionBlocked) {
    return (
      <CustomerSessionGate slug={slug} title="طلب أغنية" primaryColor={primaryColor} />
    );
  }

  return (
    <LandingSubPage
      slug={slug}
      title="طلب أغنية"
      restaurantName={restaurantName || "..."}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      {done && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm">
          تم إرسال طلب الأغنية — قيد المراجعة
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm opacity-80">اسم الأغنية *</label>
          <input
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            required
            className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
            placeholder="مثال: يا ليل"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm opacity-80">اسم الفنان (اختياري)</label>
          <input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
            placeholder="مثال: محمد عبده"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm opacity-80">رابط YouTube / Spotify (اختياري)</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            type="url"
            dir="ltr"
            className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
            placeholder="https://"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm opacity-80">رسالة إهداء (اختياري)</label>
          <textarea
            value={dedicationMessage}
            onChange={(e) => setDedicationMessage(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
            placeholder="رسالة للإهداء..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm opacity-80">الهدف</label>
          <div className="space-y-2">
            {SONG_TARGETS.map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                  target === t
                    ? "border-white/50 bg-white/15"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="target"
                  checked={target === t}
                  onChange={() => setTarget(t)}
                  className="accent-amber-400"
                />
                {SONG_TARGET_LABELS_AR[t]}
              </label>
            ))}
          </div>
        </div>

        {target === "OTHER_TABLE" && (
          <div>
            <label className="mb-2 block text-sm opacity-80">الطاولة المستهدفة *</label>
            <select
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              required
              className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40"
            >
              <option value="">اختر الطاولة</option>
              {targetTables.map((t) => (
                <option key={t.tableId} value={t.tableId}>
                  طاولة {t.tableNumber}
                  {t.tableLabel ? ` (${t.tableLabel})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={loading} className="w-full">
          إرسال طلب الأغنية
        </Button>
      </form>

      {requests.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold opacity-80">طلباتك السابقة</h2>
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">
                  {r.songName}
                  {r.artistName ? ` — ${r.artistName}` : ""}
                </span>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                  {SONG_STATUS_LABELS_AR[r.status as keyof typeof SONG_STATUS_LABELS_AR] ||
                    r.statusLabel}
                </span>
              </div>
              <p className="text-xs opacity-60">{r.targetLabel}</p>
            </div>
          ))}
        </div>
      )}
    </LandingSubPage>
  );
}
