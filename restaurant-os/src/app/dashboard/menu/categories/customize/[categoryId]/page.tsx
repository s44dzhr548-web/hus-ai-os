"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Input,
  Select,
  LoadingSpinner,
} from "@/components/ui";
import { UnifiedMediaField } from "@/components/media/unified-media-field";
import { CategoryCustomizePreview } from "@/components/menu/category-banner";
import { normalizeHex } from "@/lib/colors";
import {
  emptyMediaField,
  mediaFieldFromDb,
  mediaKindToDb,
  toDbMediaPayload,
  type MediaFieldValue,
} from "@/lib/media-types";
import { ArrowRight } from "lucide-react";

const LAYOUTS = [
  { id: "CARDS", label: "بطاقات" },
  { id: "GRID", label: "شبكة" },
  { id: "LIST", label: "قائمة" },
  { id: "IMAGE_FIRST", label: "صورة أولاً" },
  { id: "VIDEO_FIRST", label: "فيديو أولاً" },
  { id: "COMPACT", label: "مضغوط" },
];

interface CategoryRow {
  id: string;
  name?: string;
  nameAr?: string;
  color?: string;
  icon?: string;
  imageUrl?: string;
  videoUrl?: string;
  previewUrl?: string;
  mediaType?: string;
  layout?: string;
  children?: CategoryRow[];
}

const defaultForm = {
  nameAr: "",
  color: "#047857",
  icon: "",
  media: emptyMediaField("image"),
  layout: "CARDS",
};

export default function CategoryCustomizePage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    fetch("/api/menu/categories")
      .then((r) => r.json())
      .then((cats) => {
        const all = Array.isArray(cats) ? (cats as CategoryRow[]) : [];
        const flat = all.flatMap((c) => [c, ...(c.children || [])]);
        const cat = flat.find((c) => c.id === categoryId);
        if (cat) {
          setForm({
            nameAr: cat.nameAr || cat.name || "",
            color: normalizeHex(cat.color || "#047857"),
            icon: cat.icon || "",
            media: mediaFieldFromDb(cat),
            layout: cat.layout || "CARDS",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  function setMedia(media: MediaFieldValue) {
    setForm((f) => ({ ...f, media }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.media.mediaType === "video" && !form.media.videoUrl) {
      setError("ارفع فيديو للقسم أو غيّر نوع الوسائط إلى «صورة»");
      return;
    }

    setSaving(true);
    const mediaPayload = toDbMediaPayload(form.media);
    const res = await fetch("/api/menu/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: categoryId,
        color: normalizeHex(form.color),
        icon: form.icon || null,
        ...mediaPayload,
        layout: form.layout,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "فشل الحفظ");
      return;
    }

    router.push("/dashboard/menu/categories");
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={`تخصيص: ${form.nameAr}`}
        description="اللون والأيقونة ووسائط القسم — معاينة مباشرة قبل الحفظ"
        action={
          <Link href="/dashboard/menu/categories">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Button>
          </Link>
        }
      />

      <form onSubmit={save} className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow">
        <CategoryCustomizePreview
          mediaType={mediaKindToDb(form.media.mediaType)}
          imageUrl={form.media.imageUrl}
          videoUrl={form.media.videoUrl}
          color={form.color}
          icon={form.icon}
          nameAr={form.nameAr}
          layout={form.layout}
        />

        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: normalizeHex(e.target.value) })}
            className="h-10 w-14 cursor-pointer rounded border"
            aria-label="لون القسم"
          />
          <Input
            label="لون القسم"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: normalizeHex(e.target.value) })}
            dir="ltr"
          />
        </div>

        <Input
          label="أيقونة (إيموجي)"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          placeholder="🍔 ☕ 🥗"
        />

        <UnifiedMediaField
          label="وسائط القسم"
          value={form.media}
          onChange={setMedia}
        />

        <Select
          label="طريقة عرض المنتجات"
          value={form.layout}
          onChange={(e) => setForm({ ...form, layout: e.target.value })}
        >
          {LAYOUTS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" loading={saving}>
          حفظ التخصيص
        </Button>
      </form>
    </div>
  );
}
