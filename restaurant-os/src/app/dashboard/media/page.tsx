"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Card,
  LoadingSpinner,
  Badge,
  Select,
} from "@/components/ui";
import { MediaUploader } from "@/components/media/media-uploader";
import {
  Copy,
  ExternalLink,
  Film,
  ImageIcon,
  RefreshCw,
  Upload,
  CheckCircle2,
} from "lucide-react";

type MediaKind = "image" | "video";

interface MediaUsage {
  type: string;
  labelAr: string;
  labelEn: string;
  entityId?: string;
  entityName?: string;
}

interface MediaLibraryItem {
  url: string;
  kind: MediaKind;
  usages: MediaUsage[];
}

interface LibraryResponse {
  items: MediaLibraryItem[];
  storage: { r2Configured: boolean; permanentStorageEnabled?: boolean };
  restaurant: {
    slug: string;
    heroVideoUrl: string | null;
    heroImageUrl: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  } | null;
  categories: { id: string; name: string }[];
  menuItems: { id: string; name: string; category: string }[];
  counts: { total: number; images: number; videos: number };
}

type FilterKind = "all" | "image" | "video";

type PublishTarget =
  | "hero_video"
  | "hero_image"
  | "logo"
  | "cover"
  | "menu_item_image"
  | "menu_item_video"
  | "menu_item_gallery"
  | "category_image"
  | "category_video";

const PUBLISH_OPTIONS: { value: PublishTarget; label: string; needsItem?: boolean; needsCategory?: boolean; kind?: MediaKind }[] = [
  { value: "hero_video", label: "نشر كفيديو الهيرو (Landing Page)", kind: "video" },
  { value: "hero_image", label: "نشر كصورة بديلة للهيرو", kind: "image" },
  { value: "logo", label: "نشر كشعار المطعم", kind: "image" },
  { value: "cover", label: "نشر كغلاف المطعم", kind: "image" },
  { value: "menu_item_image", label: "نشر كصورة صنف منيو", needsItem: true, kind: "image" },
  { value: "menu_item_video", label: "نشر كفيديو صنف منيو", needsItem: true, kind: "video" },
  { value: "menu_item_gallery", label: "إضافة لمعرض صنف", needsItem: true },
  { value: "category_image", label: "نشر كصورة قسم", needsCategory: true, kind: "image" },
  { value: "category_video", label: "نشر كفيديو قسم", needsCategory: true, kind: "video" },
];

export default function MediaCenterPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [pendingUploads, setPendingUploads] = useState<MediaLibraryItem[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<PublishTarget>("hero_video");
  const [itemId, setItemId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/media/library");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as LibraryResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل المكتبة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allItems = useMemo(() => {
    const map = new Map<string, MediaLibraryItem>();
    for (const item of data?.items || []) map.set(item.url, item);
    for (const pending of pendingUploads) {
      if (!map.has(pending.url)) map.set(pending.url, pending);
    }
    return Array.from(map.values());
  }, [data?.items, pendingUploads]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return allItems;
    return allItems.filter((i) => i.kind === filter);
  }, [allItems, filter]);

  const activeItem = allItems.find((i) => i.url === selectedUrl) || null;

  function registerUpload(url: string, kind: MediaKind) {
    if (!url) return;
    setPendingUploads((prev) => {
      if (prev.some((p) => p.url === url)) return prev;
      return [{ url, kind, usages: [] }, ...prev];
    });
    setSelectedUrl(url);
    setMessage("تم الرفع إلى التخزين — اختر وجهة النشر ثم انقر «نشر»");
  }

  async function publishSelected() {
    if (!selectedUrl) {
      setError("اختر وسيطاً للنشر");
      return;
    }
    const opt = PUBLISH_OPTIONS.find((o) => o.value === publishTarget);
    if (opt?.kind && activeItem && activeItem.kind !== opt.kind) {
      setError(`هذا الهدف يتطلب ${opt.kind === "video" ? "فيديو" : "صورة"}`);
      return;
    }
    if (opt?.needsItem && !itemId) {
      setError("اختر صنفاً من المنيو");
      return;
    }
    if (opt?.needsCategory && !categoryId) {
      setError("اختر قسماً");
      return;
    }

    setPublishing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/media/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: selectedUrl,
          targetType: publishTarget,
          itemId: itemId || undefined,
          categoryId: categoryId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل النشر");
      setData((prev) => (prev ? { ...prev, items: json.items } : prev));
      setPendingUploads((prev) => prev.filter((p) => p.url !== selectedUrl));
      setMessage("تم النشر بنجاح — الوسائط مرتبطة الآن في قاعدة البيانات");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل النشر");
    } finally {
      setPublishing(false);
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("تم نسخ الرابط");
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const storageOk = data?.storage?.r2Configured;

  return (
    <div className="space-y-6">
      <PageHeader
        title="مركز الوسائط"
        description="Media Center — رفع الصور والفيديو، المعاينة، والنشر للصفحة الرئيسية والمنيو"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => load(true)} loading={refreshing}>
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
            {data?.restaurant?.slug && (
              <Link href={`/r/${data.restaurant.slug}`} target="_blank">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4" />
                  معاينة الصفحة
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {!storageOk && (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          التخزين الدائم (R2) غير مفعّل — الرفع غير متاح حتى ضبط متغيرات R2 في الإنتاج.
        </Card>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Upload className="h-5 w-5" />
            رفع وسائط جديدة
          </h2>
          <MediaUploader
            mediaType="image"
            label="رفع صورة (jpg, png, webp)"
            value=""
            onChange={(url) => registerUpload(url, "image")}
          />
          <MediaUploader
            mediaType="video"
            label="رفع فيديو (mp4, mov, webm)"
            value=""
            onChange={(url) => registerUpload(url, "video")}
          />
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">نشر الوسائط</h2>
          <p className="text-sm text-gray-600">
            اختر وسيطاً من المكتبة، حدد الوجهة، ثم انقر نشر لربطه بقاعدة البيانات والصفحة
            العامة.
          </p>
          <Select
            label="وجهة النشر"
            value={publishTarget}
            onChange={(e) => setPublishTarget(e.target.value as PublishTarget)}
          >
            {PUBLISH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {PUBLISH_OPTIONS.find((o) => o.value === publishTarget)?.needsItem && (
            <Select
              label="الصنف"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">— اختر صنفاً —</option>
              {(data?.menuItems || []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.category})
                </option>
              ))}
            </Select>
          )}
          {PUBLISH_OPTIONS.find((o) => o.value === publishTarget)?.needsCategory && (
            <Select
              label="القسم"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— اختر قسماً —</option>
              {(data?.categories || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          {activeItem ? (
            <div className="rounded-lg border bg-gray-50 p-3 text-xs break-all">
              <span className="font-medium">المحدد: </span>
              {activeItem.url}
            </div>
          ) : (
            <p className="text-sm text-gray-500">لم يتم اختيار وسيط بعد</p>
          )}
          <Button onClick={publishSelected} loading={publishing} disabled={!selectedUrl}>
            نشر / ربط
          </Button>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">تصفية:</span>
        {(["all", "image", "video"] as FilterKind[]).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "primary" : "outline"}
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "الكل" : k === "image" ? "صور" : "فيديو"}
            {k === "all" && data?.counts ? ` (${data.counts.total})` : ""}
            {k === "image" && data?.counts ? ` (${data.counts.images})` : ""}
            {k === "video" && data?.counts ? ` (${data.counts.videos})` : ""}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          لا توجد وسائط بعد. ارفع صورة أو فيديو للبدء.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <Card
              key={item.url}
              className={`overflow-hidden cursor-pointer transition ring-2 ${
                selectedUrl === item.url ? "ring-emerald-500" : "ring-transparent hover:ring-gray-200"
              }`}
              onClick={() => setSelectedUrl(item.url)}
            >
              <div className="relative aspect-video bg-gray-100">
                {item.kind === "video" ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute left-2 top-2">
                  <Badge variant={item.kind === "video" ? "info" : "default"}>
                    {item.kind === "video" ? (
                      <Film className="mr-1 inline h-3 w-3" />
                    ) : (
                      <ImageIcon className="mr-1 inline h-3 w-3" />
                    )}
                    {item.kind === "video" ? "فيديو" : "صورة"}
                  </Badge>
                </div>
                {item.usages.length === 0 && (
                  <div className="absolute right-2 top-2">
                    <Badge variant="warning">بانتظار النشر</Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                {item.usages.length > 0 ? (
                  <ul className="space-y-1 text-xs text-gray-600">
                    {item.usages.slice(0, 3).map((u, idx) => (
                      <li key={`${u.type}-${idx}`}>• {u.labelAr}</li>
                    ))}
                    {item.usages.length > 3 && (
                      <li>+{item.usages.length - 3} استخدامات أخرى</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-700">مرفوع — غير منشور بعد</p>
                )}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl(item.url);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex"
                  >
                    <Button size="sm" variant="outline" type="button">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {data?.restaurant && (
        <Card className="p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-2">الوسائط المنشورة حالياً</p>
          <ul className="space-y-1 text-xs font-mono break-all">
            <li>Hero Video: {data.restaurant.heroVideoUrl || "—"}</li>
            <li>Hero Image: {data.restaurant.heroImageUrl || "—"}</li>
            <li>Logo: {data.restaurant.logoUrl || "—"}</li>
            <li>Cover: {data.restaurant.coverUrl || "—"}</li>
          </ul>
        </Card>
      )}
    </div>
  );
}
