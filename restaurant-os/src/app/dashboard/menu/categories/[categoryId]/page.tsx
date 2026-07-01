"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  Modal,
  Badge,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { SortableList } from "@/components/ui/sortable-list";
import { UnifiedMediaField } from "@/components/media/unified-media-field";
import {
  emptyMediaField,
  mediaFieldFromDb,
  toDbMediaPayload,
  type MediaFieldValue,
} from "@/lib/media-types";
import { ArrowRight, Copy, Pencil, Trash2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number | string;
  discountPrice?: number | string | null;
  calories?: number | null;
  imageUrl?: string;
  videoUrl?: string;
  previewUrl?: string;
  mediaType?: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

interface Category {
  id: string;
  name: string;
  nameAr?: string;
}

const emptyForm = {
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  price: "",
  discountPrice: "",
  calories: "",
  media: emptyMediaField("image"),
  isFeatured: false,
  isAvailable: true,
};

export default function CategoryItemsPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  function load() {
    Promise.all([
      fetch("/api/menu/categories").then((r) => r.json()),
      fetch(`/api/menu/items?categoryId=${categoryId}`).then((r) => r.json()),
    ])
      .then(([cats, its]) => {
        const list = Array.isArray(cats) ? cats : [];
        const cat = list.find((c: Category) => c.id === categoryId);
        setCategory(cat ? { id: categoryId, ...cat } : null);
        setItems(Array.isArray(its) ? its : []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [categoryId]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setApiError("");
    setModalOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditingId(item.id);
    setForm({
      nameAr: item.nameAr || item.name || "",
      nameEn: item.nameEn || "",
      descriptionAr: item.descriptionAr || item.description || "",
      descriptionEn: item.descriptionEn || "",
      price: String(item.price),
      discountPrice: item.discountPrice ? String(item.discountPrice) : "",
      calories: item.calories != null ? String(item.calories) : "",
      media: mediaFieldFromDb(item),
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
    });
    setErrors({});
    setApiError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setApiError("");
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.nameAr.trim()) next.nameAr = "اسم الصنف بالعربي مطلوب";
    if (!form.price || isNaN(parseFloat(form.price))) next.price = "السعر مطلوب";
    if (!form.calories || isNaN(parseInt(form.calories, 10)))
      next.calories = "السعرات الحرارية مطلوبة";
    if (!form.descriptionAr.trim())
      next.descriptionAr = "الوصف بالعربي مطلوب";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setApiError("");
    const mediaPayload = toDbMediaPayload(form.media);

    const payload = {
      categoryId,
      name: form.nameAr,
      nameAr: form.nameAr,
      nameEn: form.nameEn || undefined,
      description: form.descriptionAr,
      descriptionAr: form.descriptionAr,
      descriptionEn: form.descriptionEn || undefined,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : undefined,
      calories: parseInt(form.calories, 10),
      ...mediaPayload,
      isFeatured: form.isFeatured,
      isAvailable: form.isAvailable,
    };

    const res = await fetch("/api/menu/items", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
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

  async function toggleAvailability(item: MenuItem) {
    await fetch("/api/menu/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
    });
    load();
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`حذف «${item.nameAr || item.name}»؟`)) return;
    await fetch(`/api/menu/items?id=${item.id}`, { method: "DELETE" });
    load();
  }

  async function duplicateItem(item: MenuItem) {
    const res = await fetch("/api/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateFrom: item.id }),
    });
    if (res.ok) load();
  }

  async function saveItemOrder(reordered: MenuItem[]) {
    setItems(reordered);
    await fetch("/api/menu/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((item, i) => ({ id: item.id, sortOrder: i + 1 })),
      }),
    });
  }

  function itemThumb(item: MenuItem) {
    const isVideo = item.mediaType === "VIDEO";
    const src = item.previewUrl || (isVideo ? item.videoUrl : item.imageUrl);
    if (!src) return null;
    if (isVideo && item.videoUrl) {
      return (
        <video src={src} className="h-16 w-16 rounded-lg object-cover" muted playsInline />
      );
    }
    return <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-8">
      <Link
        href="/dashboard/menu/categories"
        className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm text-emerald-600 hover:underline"
      >
        <ArrowRight className="h-4 w-4" />
        جميع أقسام المنيو
      </Link>

      <PageHeader
        title={category?.nameAr || category?.name || "أصناف القسم"}
        description="أضف الأصناف مع السعر والسعرات والصورة"
        action={
          <Button onClick={openCreate} className="min-h-11">
            إضافة صنف
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="لا توجد أصناف"
          description="أضف أول صنف في هذا القسم"
          action={
            <Button onClick={openCreate} className="min-h-11">
              إضافة صنف
            </Button>
          }
        />
      ) : (
        <SortableList
          items={items}
          onReorder={saveItemOrder}
          renderItem={(item) => (
            <div className="flex gap-3">
              {itemThumb(item)}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{item.nameAr || item.name}</h3>
                  <div className="flex shrink-0 flex-col gap-1">
                    {item.isFeatured && <Badge variant="warning">مميز</Badge>}
                    <Badge variant={item.isAvailable ? "success" : "danger"}>
                      {item.isAvailable ? "متاح" : "غير متاح"}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {item.descriptionAr || item.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(Number(item.price))}
                  </span>
                  {item.calories != null && (
                    <span className="text-gray-500">{item.calories} سعرة</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="min-h-9" onClick={() => openEdit(item)}>
                    <Pencil className="h-3 w-3" />
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-9" onClick={() => duplicateItem(item)}>
                    <Copy className="h-3 w-3" />
                    نسخ
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-9" onClick={() => toggleAvailability(item)}>
                    {item.isAvailable ? "إيقاف" : "تفعيل"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9 text-red-600"
                    onClick={() => deleteItem(item)}
                  >
                    <Trash2 className="h-3 w-3" />
                    حذف
                  </Button>
                </div>
              </div>
            </div>
          )}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "تعديل الصنف" : "صنف جديد"}
      >
        <form onSubmit={handleSave} className="max-h-[70vh] space-y-4 overflow-y-auto">
          <Input
            label="اسم الصنف (عربي) *"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            error={errors.nameAr}
          />
          <Input
            label="اسم الصنف (English)"
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            dir="ltr"
          />
          <Textarea
            label="الوصف (عربي) *"
            value={form.descriptionAr}
            onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
            error={errors.descriptionAr}
          />
          <Textarea
            label="الوصف (English)"
            value={form.descriptionEn}
            onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            dir="ltr"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="السعر (ر.س) *"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              error={errors.price}
              dir="ltr"
            />
            <Input
              label="سعر الخصم"
              type="number"
              step="0.01"
              min="0"
              value={form.discountPrice}
              onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
              dir="ltr"
            />
          </div>
          <Input
            label="السعرات الحرارية *"
            type="number"
            min="0"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
            error={errors.calories}
            dir="ltr"
          />

          <UnifiedMediaField
            label="صورة الصنف (فيديو اختياري)"
            value={form.media}
            onChange={(media: MediaFieldValue) => setForm({ ...form, media })}
          />

          <div className="flex flex-col gap-2">
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="h-4 w-4"
              />
              صنف مميز
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                className="h-4 w-4"
              />
              متاح للطلب
            </label>
          </div>

          {apiError && <p className="text-sm text-red-600">{apiError}</p>}

          <Button type="submit" className="w-full min-h-11" loading={saving}>
            حفظ
          </Button>
        </form>
      </Modal>
    </div>
  );
}
