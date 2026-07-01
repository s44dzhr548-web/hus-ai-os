"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Input,
  Modal,
  Badge,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import { SortableList } from "@/components/ui/sortable-list";
import { UnifiedMediaField } from "@/components/media/unified-media-field";
import { normalizeHex } from "@/lib/colors";
import {
  emptyMediaField,
  mediaFieldFromDb,
  toDbMediaPayload,
  type MediaFieldValue,
} from "@/lib/media-types";
import { ChevronLeft, Pencil, Trash2, UtensilsCrossed } from "lucide-react";

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
  mediaType?: string;
  isActive: boolean;
  _count?: { items: number };
}

const emptySection = {
  nameAr: "",
  nameEn: "",
  color: "#047857",
  icon: "",
  isActive: true,
  media: emptyMediaField("image"),
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySection);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  function load() {
    fetch("/api/menu/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptySection);
    setErrors({});
    setApiError("");
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      nameAr: cat.nameAr || cat.name || "",
      nameEn: cat.nameEn || "",
      color: normalizeHex(cat.color || "#047857"),
      icon: cat.icon || "",
      isActive: cat.isActive,
      media: mediaFieldFromDb(cat),
    });
    setErrors({});
    setApiError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptySection);
    setErrors({});
    setApiError("");
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.nameAr.trim()) next.nameAr = "اسم القسم بالعربي مطلوب";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setApiError("");
    const mediaPayload = toDbMediaPayload(form.media);

    const res = await fetch("/api/menu/categories", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingId ? { id: editingId } : {}),
        name: form.nameAr,
        nameAr: form.nameAr,
        nameEn: form.nameEn || null,
        color: normalizeHex(form.color),
        icon: form.icon || null,
        isActive: form.isActive,
        ...mediaPayload,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setApiError(data.error || "فشل الحفظ");
      return;
    }

    closeModal();
    load();
  }

  async function saveOrder(items: Category[]) {
    setCategories(items);
    await fetch("/api/menu/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((c, i) => ({ id: c.id, sortOrder: i + 1 })),
      }),
    });
  }

  async function deleteSection(id: string, name: string) {
    if (!confirm(`حذف القسم «${name}» وجميع أصنافه؟`)) return;
    await fetch(`/api/menu/categories?id=${id}`, { method: "DELETE" });
    load();
  }

  function sectionThumb(cat: Category) {
    const src =
      cat.previewUrl ||
      (cat.mediaType === "VIDEO" ? cat.videoUrl : cat.imageUrl);
    if (src) {
      if (cat.mediaType === "VIDEO" && cat.videoUrl) {
        return (
          <video
            src={src}
            className="h-12 w-12 rounded-lg object-cover"
            muted
            playsInline
          />
        );
      }
      return (
        <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />
      );
    }
    return (
      <div
        className="flex h-12 w-12 items-center justify-center rounded-lg text-xl"
        style={{ backgroundColor: `${cat.color || "#047857"}22` }}
      >
        {cat.icon || "🍽️"}
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-8">
      <PageHeader
        title="المنيو"
        description="أقسام المنيو — أضف الأقسام ثم الأصناف داخل كل قسم"
        action={
          <Button onClick={openCreate} className="min-h-11">
            إضافة قسم
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="لا توجد أقسام"
          description="ابدأ بإنشاء قسم مثل: الأطباق الرئيسية، المشروبات، الحلويات"
          action={
            <Button onClick={openCreate} className="min-h-11">
              إضافة قسم
            </Button>
          }
        />
      ) : (
        <SortableList
          items={categories}
          onReorder={saveOrder}
          renderItem={(cat) => (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {sectionThumb(cat)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{cat.nameAr || cat.name}</h3>
                      {cat.nameEn && (
                        <p className="text-xs text-gray-400" dir="ltr">
                          {cat.nameEn}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        {cat._count?.items ?? 0} صنف
                      </p>
                    </div>
                    <Badge variant={cat.isActive ? "success" : "danger"}>
                      {cat.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/menu/categories/${cat.id}`}>
                  <Button size="sm" className="min-h-10">
                    <UtensilsCrossed className="h-4 w-4" />
                    الأصناف
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-10"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-10 text-red-600"
                  onClick={() => deleteSection(cat.id, cat.nameAr || cat.name)}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          )}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "تعديل القسم" : "قسم جديد"}
      >
        <form onSubmit={handleSave} className="max-h-[70vh] space-y-4 overflow-y-auto">
          <Input
            label="اسم القسم (عربي) *"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            placeholder="الأطباق الرئيسية"
            error={errors.nameAr}
          />
          <Input
            label="اسم القسم (English)"
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            placeholder="Main Dishes"
            dir="ltr"
          />

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.color}
              onChange={(e) =>
                setForm({ ...form, color: normalizeHex(e.target.value) })
              }
              className="h-11 w-14 shrink-0 cursor-pointer rounded border"
              aria-label="لون القسم"
            />
            <Input
              label="لون القسم"
              value={form.color}
              onChange={(e) =>
                setForm({ ...form, color: normalizeHex(e.target.value) })
              }
              dir="ltr"
            />
          </div>

          <Input
            label="أيقونة (إيموجي)"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="🍔 🥗 ☕"
          />

          <UnifiedMediaField
            label="صورة أو فيديو القسم (اختياري)"
            value={form.media}
            onChange={(media) => setForm({ ...form, media })}
          />

          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4"
            />
            القسم نشط ويظهر للعملاء
          </label>

          {apiError && <p className="text-sm text-red-600">{apiError}</p>}

          <Button type="submit" className="w-full min-h-11" loading={saving}>
            حفظ
          </Button>
        </form>
      </Modal>
    </div>
  );
}
