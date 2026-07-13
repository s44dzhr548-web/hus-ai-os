"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  Button,
  Select,
  Input,
  Modal,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import { TABLE_AREAS } from "@/lib/table-areas";
import type { EnterpriseTableStats } from "@/lib/table-enterprise-stats";
import { filterTables, type TableFilterKey } from "@/lib/table-enterprise-stats";
import { parseFloorPlan } from "@/lib/table-sections";
import {
  Grid3X3,
  LayoutGrid,
  ListChecks,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Undo2,
} from "lucide-react";
import type { FloorPlanTableMeta } from "@/lib/table-sections";
import { TableStatsBar } from "./table-stats-bar";
import { TableEnterpriseGrid } from "./table-enterprise-grid";
import { TableFloorView } from "./table-floor-view";
import { TableBulkToolbar } from "./table-bulk-toolbar";
import { TableStatusLegend } from "./table-status-legend";
import { TablePreviewPanel } from "./table-preview-panel";
import { TableQrCenter } from "./table-qr-center";
import { useAutoSave, useTableUndo } from "./use-table-enterprise";
import type {
  FloorPlanConfig,
  QrData,
  TableRow,
  TableSection,
} from "./table-types";

interface Branch {
  id: string;
  name: string;
  nameAr?: string;
}

const DEFAULT_STATS: EnterpriseTableStats = {
  total: 0,
  active: 0,
  disabled: 0,
  archived: 0,
  occupied: 0,
  free: 0,
  reserved: 0,
  qrGenerated: 0,
  missingQr: 0,
};

export function TableManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [stats, setStats] = useState<EnterpriseTableStats>(DEFAULT_STATS);
  const [sections, setSections] = useState<TableSection[]>([]);
  const [floorPlan, setFloorPlan] = useState<FloorPlanConfig>(parseFloorPlan(null));
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "floor">("floor");
  const [bulkMode, setBulkMode] = useState(false);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TableFilterKey>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [qrCenterOpen, setQrCenterOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [previewTable, setPreviewTable] = useState<TableRow | null>(null);
  const [previewDetail, setPreviewDetail] = useState<Record<string, unknown> | null>(null);
  const [previewQr, setPreviewQr] = useState<QrData | null>(null);
  const [editTable, setEditTable] = useState<TableRow | null>(null);

  const [form, setForm] = useState({
    number: "",
    label: "",
    capacity: "4",
    floorZone: "",
    tableCode: "",
  });
  const [bulkCount, setBulkCount] = useState("10");
  const [newSectionName, setNewSectionName] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveZone, setMoveZone] = useState("");

  const { push: pushUndo, undo, canUndo } = useTableUndo();
  const { schedule: autoSave, saving: autoSaving, lastSaved } = useAutoSave();

  const loadTables = useCallback(
    (bId?: string) => {
      const id = bId || branchId;
      if (!id) return;
      const params = new URLSearchParams({ branchId: id, format: "full" });
      if (showArchived) params.set("archived", "1");
      fetch(`/api/tables?${params}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.tables) {
            setTables(data.tables);
            setStats(data.stats || DEFAULT_STATS);
            if (data.sections) setSections(data.sections);
            if (data.floorPlan) setFloorPlan(parseFloorPlan(data.floorPlan));
          }
        });
    },
    [branchId, showArchived]
  );

  useEffect(() => {
    fetch("/api/tables/management")
      .then((r) => r.json())
      .then((d) => setCanManage(!!d.canManage));
    fetch("/api/branches")
      .then((r) => r.json())
      .then((data: Branch[]) => {
        if (Array.isArray(data)) {
          setBranches(data);
          if (data[0]) {
            setBranchId(data[0].id);
            loadTables(data[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [loadTables]);

  useEffect(() => {
    if (branchId) loadTables();
  }, [branchId, loadTables]);

  const filtered = useMemo(
    () =>
      filterTables(tables, {
        search,
        area: areaFilter,
        filter: showArchived ? "archived" : statusFilter,
      }),
    [tables, search, areaFilter, statusFilter, showArchived]
  );

  const areaOptions = useMemo(() => {
    const fromSections = sections.length
      ? sections
      : TABLE_AREAS.map((a) => ({ id: a.id, labelAr: a.labelAr, labelEn: a.labelEn }));
    return fromSections;
  }, [sections]);

  async function apiPost(body: Record<string, unknown>) {
    const res = await fetch("/api/tables/management", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشل");
    return data;
  }

  async function bulkWithBackup(action: string, extra?: Record<string, unknown>) {
    const ids = [...selected];
    if (!ids.length) return;
    setSaving(true);
    try {
      await apiPost({ action: "bulk-backup", branchId, ids });
      await apiPost({ action: "bulk", bulkAction: action, ids, branchId, ...extra });
      setSelected(new Set());
      loadTables();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setSaving(false);
    }
  }

  async function openPreview(table: TableRow) {
    setPreviewTable(table);
    setPreviewDetail(null);
    setPreviewQr(null);
    const [detailRes, qrRes] = await Promise.all([
      fetch(`/api/tables/${table.id}/preview`),
      fetch(`/api/qr?tableId=${table.id}`),
    ]);
    if (detailRes.ok) setPreviewDetail(await detailRes.json());
    if (qrRes.ok) setPreviewQr(await qrRes.json());
  }

  function handleTableMove(id: string, x: number, y: number) {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, floorMapX: x, floorMapY: y } : t))
    );
    autoSave(async () => {
      const prev = tables.find((t) => t.id === id);
      await apiPost({
        action: "floor-positions",
        positions: [{ id, floorMapX: x, floorMapY: y }],
      });
      if (prev) {
        pushUndo({
          label: "move",
          undo: async () => {
            await apiPost({
              action: "floor-positions",
              positions: [
                {
                  id,
                  floorMapX: prev.floorMapX ?? 10,
                  floorMapY: prev.floorMapY ?? 10,
                },
              ],
            });
            loadTables();
          },
        });
      }
    });
  }

  function handleFloorPlanChange(plan: FloorPlanConfig) {
    setFloorPlan(plan);
    autoSave(async () => {
      await fetch("/api/tables/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, floorPlan: plan }),
      });
    });
  }

  function handleTableMetaChange(id: string, meta: FloorPlanTableMeta) {
    const next = {
      ...floorPlan,
      tableMeta: { ...(floorPlan.tableMeta || {}), [id]: meta },
    };
    setFloorPlan(next);
    autoSave(async () => {
      await fetch("/api/tables/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, floorPlan: next }),
      });
    });
  }

  async function bulkRestore() {
    const ids = [...selected];
    if (!ids.length) return;
    setSaving(true);
    try {
      for (const id of ids) {
        await apiPost({ action: "restore", id });
      }
      setSelected(new Set());
      loadTables();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setSaving(false);
    }
  }

  async function bulkMove() {
    if (!moveZone) return;
    await bulkWithBackup("move", { floorZone: moveZone });
    setMoveOpen(false);
    setMoveZone("");
  }

  async function handleRenumber() {
    if (!confirm("إعادة ترقيم 1، 2، 3…؟")) return;
    setSaving(true);
    try {
      await apiPost({ action: "renumber", branchId });
      loadTables();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    const next = [
      ...sections,
      {
        id: `custom-${Date.now()}`,
        labelAr: newSectionName.trim(),
        labelEn: newSectionName.trim(),
        custom: true,
      },
    ];
    await fetch("/api/tables/sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, sections: next }),
    });
    setSections(next);
    setNewSectionName("");
    setSectionOpen(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        number: form.number,
        label: form.label,
        capacity: form.capacity,
        floorZone: form.floorZone,
        tableCode: form.tableCode || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      alert((await res.json()).error || "فشل");
      return;
    }
    setAddOpen(false);
    setForm({ number: "", label: "", capacity: "4", floorZone: "", tableCode: "" });
    loadTables();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTable) return;
    setSaving(true);
    const res = await fetch("/api/tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editTable.id,
        number: form.number,
        label: form.label,
        capacity: form.capacity,
        floorZone: form.floorZone,
        tableCode: form.tableCode || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      alert((await res.json()).error || "فشل");
      return;
    }
    setEditTable(null);
    setPreviewTable(null);
    loadTables();
  }

  function onDragStart(id: string) {
    setDragId(id);
  }

  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const list = [...filtered];
    const fromIdx = list.findIndex((t) => t.id === dragId);
    const toIdx = list.findIndex((t) => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const order = list.map((t, i) => ({ id: t.id, sortOrder: i }));
    setTables((prev) => {
      const map = new Map(order.map((o) => [o.id, o.sortOrder]));
      return prev.map((t) => ({ ...t, sortOrder: map.get(t.id) ?? t.sortOrder }));
    });
    setDragId(null);
    await apiPost({ action: "reorder", order });
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-8">
      <PageHeader
        title="إدارة الطاولات — Enterprise"
        description={
          canManage
            ? "مصمم المخطط الافتراضي — سحب، تغيير حجم، أقسام، QR، وإجراءات جماعية"
            : "عرض فقط — التعديل لمالك المطعم"
        }
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {canUndo && (
                <Button variant="outline" size="sm" onClick={undo}>
                  <Undo2 className="h-4 w-4" />
                  تراجع
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setQrCenterOpen(true)}>
                <QrCode className="h-4 w-4" />
                مركز QR
              </Button>
              <Button variant="outline" size="sm" onClick={handleRenumber} loading={saving}>
                <RefreshCw className="h-4 w-4" />
                إعادة ترقيم
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSectionOpen(true)}>
                + قسم
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                <Plus className="h-4 w-4" />
                جماعي
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                طاولة
              </Button>
            </div>
          ) : null
        }
      />

      {(autoSaving || lastSaved) && (
        <p className="mb-2 text-xs text-gray-400">
          {autoSaving ? "جاري الحفظ التلقائي…" : `آخر حفظ: ${lastSaved?.toLocaleTimeString("ar-SA")}`}
        </p>
      )}

      <TableStatsBar stats={stats} />
      <div className="mb-4">
        <TableStatusLegend />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        {branches.length > 0 && (
          <div className="min-w-[140px] flex-1 sm:flex-none">
            <Select label="الفرع" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr || b.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="min-w-[140px] flex-1">
          <Input
            label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="رقم أو اسم..."
          />
        </div>
        <Select label="المنطقة" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          <option value="">الكل</option>
          {areaOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.labelAr}
            </option>
          ))}
        </Select>
        <Select
          label="فلتر"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TableFilterKey)}
        >
          <option value="all">الكل</option>
          <option value="active">نشطة</option>
          <option value="disabled">معطلة</option>
          <option value="occupied">مشغولة</option>
          <option value="free">متاحة</option>
          <option value="reserved">محجوزة</option>
          <option value="qr">QR جاهز</option>
          <option value="no-qr">بدون QR</option>
        </Select>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          أرشيف
        </label>
        <div className="flex gap-1 pb-1">
          <button
            type="button"
            data-testid="view-mode-floor"
            onClick={() => setViewMode("floor")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
              viewMode === "floor" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            مخطط
          </button>
          <button
            type="button"
            data-testid="view-mode-grid"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
              viewMode === "grid" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            شبكة
          </button>
          {canManage && (
            <button
              type="button"
              data-testid="bulk-mode-toggle"
              onClick={() => {
                setBulkMode((v) => !v);
                setSelected(new Set());
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                bulkMode ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              <ListChecks className="h-4 w-4" />
              تحديد متعدد
            </button>
          )}
        </div>
      </div>

      {bulkMode && canManage && (
        <TableBulkToolbar
          count={selected.size}
          showArchived={showArchived}
          saving={saving}
          onEnable={() => bulkWithBackup("enable")}
          onDisable={() => bulkWithBackup("disable")}
          onArchive={() => bulkWithBackup("delete")}
          onDelete={() => {
            if (confirm("أرشفة الطاولات المحددة؟ (لا يُحذف السجل نهائياً)")) {
              bulkWithBackup("delete");
            }
          }}
          onRestore={bulkRestore}
          onMove={() => setMoveOpen(true)}
          onPrintQr={() => {
            window.open(`/api/qr/print?branchId=${branchId}&ids=${[...selected].join(",")}`, "_blank");
          }}
          onExport={() => {
            window.open(
              `/api/tables/export?branchId=${branchId}&ids=${[...selected].join(",")}`,
              "_blank"
            );
          }}
          onClear={() => setSelected(new Set())}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="لا توجد طاولات"
          action={canManage ? <Button onClick={() => setAddOpen(true)}>إضافة</Button> : undefined}
        />
      ) : viewMode === "floor" ? (
        <TableFloorView
          tables={filtered}
          sections={areaOptions}
          floorPlan={floorPlan}
          canManage={canManage}
          bulkMode={bulkMode}
          selected={selected}
          onSelect={(id) =>
            setSelected((prev) => {
              const n = new Set(prev);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            })
          }
          onTableMove={handleTableMove}
          onTableMetaChange={handleTableMetaChange}
          onOpen={openPreview}
          onFloorPlanChange={handleFloorPlanChange}
        />
      ) : (
        <TableEnterpriseGrid
          tables={filtered}
          selected={selected}
          bulkMode={bulkMode}
          canManage={canManage}
          onSelect={(id) =>
            setSelected((prev) => {
              const n = new Set(prev);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            })
          }
          onSelectAll={(checked) => {
            setSelected(checked ? new Set(filtered.map((t) => t.id)) : new Set());
          }}
          onOpen={openPreview}
          onDragStart={onDragStart}
          onDrop={onDrop}
          dragId={dragId}
        />
      )}

      <TablePreviewPanel
        table={previewTable}
        detail={previewDetail as never}
        qr={previewQr}
        canManage={canManage}
        onClose={() => setPreviewTable(null)}
        onEdit={() => {
          if (!previewTable) return;
          setEditTable(previewTable);
          setForm({
            number: String(previewTable.number),
            label: previewTable.label || "",
            capacity: String(previewTable.capacity),
            floorZone: previewTable.floorZone || "",
            tableCode: previewTable.tableCode || "",
          });
        }}
        onArchive={async () => {
          if (!previewTable) return;
          await fetch(`/api/tables?id=${previewTable.id}`, { method: "DELETE" });
          setPreviewTable(null);
          loadTables();
        }}
        onRegenerateQr={async () => {
          if (!previewTable) return;
          await apiPost({ action: "regenerate-qr", id: previewTable.id });
          openPreview(previewTable);
        }}
      />

      <TableQrCenter
        open={qrCenterOpen}
        onClose={() => setQrCenterOpen(false)}
        branchId={branchId}
        selectedCount={selected.size}
        canManage={canManage}
        loading={saving}
        onRegenerateAll={async () => {
          setSaving(true);
          try {
            await apiPost({ action: "regenerate-all-qr", branchId });
            loadTables();
          } finally {
            setSaving(false);
          }
        }}
        onRegenerateSelected={async () => {
          for (const id of selected) {
            await apiPost({ action: "regenerate-qr", id });
          }
          loadTables();
        }}
        onPrintAll={() => window.open(`/api/qr/print?branchId=${branchId}`, "_blank")}
        onPrintSelected={() => {
          window.open(
            `/api/qr/print?branchId=${branchId}&ids=${[...selected].join(",")}`,
            "_blank"
          );
        }}
        onExportSelected={() => {
          window.open(
            `/api/tables/export?branchId=${branchId}&ids=${[...selected].join(",")}`,
            "_blank"
          );
        }}
      />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة طاولة">
        <TableForm form={form} setForm={setForm} areas={areaOptions} onSubmit={handleCreate} saving={saving} />
      </Modal>
      <Modal open={!!editTable} onClose={() => setEditTable(null)} title="تعديل طاولة">
        <TableForm form={form} setForm={setForm} areas={areaOptions} onSubmit={handleEdit} saving={saving} edit />
      </Modal>
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="إنشاء جماعي">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            await fetch("/api/tables", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bulk: true, branchId, count: bulkCount }),
            });
            setSaving(false);
            setBulkOpen(false);
            loadTables();
          }}
          className="space-y-4"
        >
          <Input
            label="العدد"
            type="number"
            min={1}
            value={bulkCount}
            onChange={(e) => setBulkCount(e.target.value)}
          />
          <Button type="submit" className="w-full" loading={saving}>
            إنشاء
          </Button>
        </form>
      </Modal>
      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title="نقل إلى منطقة">
        <div className="space-y-4">
          <Select label="المنطقة" value={moveZone} onChange={(e) => setMoveZone(e.target.value)}>
            <option value="">— اختر —</option>
            {areaOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.labelAr}
              </option>
            ))}
          </Select>
          <Button className="w-full" loading={saving} disabled={!moveZone} onClick={bulkMove}>
            نقل {selected.size} طاولة
          </Button>
        </div>
      </Modal>
      <Modal open={sectionOpen} onClose={() => setSectionOpen(false)} title="قسم جديد">
        <form onSubmit={handleAddSection} className="space-y-4">
          <Input
            label="اسم القسم"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">
            إضافة
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function TableForm({
  form,
  setForm,
  areas,
  onSubmit,
  saving,
  edit,
}: {
  form: { number: string; label: string; capacity: string; floorZone: string; tableCode: string };
  setForm: (f: typeof form) => void;
  areas: TableSection[];
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  edit?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="رقم الطاولة"
        type="number"
        value={form.number}
        onChange={(e) => setForm({ ...form, number: e.target.value })}
        required
      />
      <Input
        label="الاسم المعروض"
        value={form.label}
        onChange={(e) => setForm({ ...form, label: e.target.value })}
      />
      <Input
        label="السعة"
        type="number"
        value={form.capacity}
        onChange={(e) => setForm({ ...form, capacity: e.target.value })}
      />
      <Select
        label="المنطقة"
        value={form.floorZone}
        onChange={(e) => setForm({ ...form, floorZone: e.target.value })}
      >
        <option value="">—</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.labelAr}
          </option>
        ))}
      </Select>
      <Input
        label="tableCode (QR)"
        value={form.tableCode}
        onChange={(e) => setForm({ ...form, tableCode: e.target.value })}
        dir="ltr"
        placeholder={edit ? undefined : "تلقائي"}
      />
      <Button type="submit" className="w-full" loading={saving}>
        حفظ
      </Button>
    </form>
  );
}
