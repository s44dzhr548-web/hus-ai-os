"use client";

import { useCallback, useRef, useState } from "react";
import { areaLabel } from "@/lib/table-areas";
import {
  getTableMeta,
  SECTION_ZONE_COLORS,
  type FloorPlanTableMeta,
  type TableShape,
} from "@/lib/table-sections";
import { statusStyles, tableVisualStatus } from "@/lib/table-status";
import { Circle, Maximize2, Square, RectangleHorizontal } from "lucide-react";
import type { FloorPlanConfig, FloorPlanShape, TableRow, TableSection } from "./table-types";

interface TableFloorViewProps {
  tables: TableRow[];
  sections: TableSection[];
  floorPlan: FloorPlanConfig;
  canManage: boolean;
  bulkMode: boolean;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onTableMove: (id: string, x: number, y: number) => void;
  onTableMetaChange: (id: string, meta: FloorPlanTableMeta) => void;
  onOpen: (table: TableRow) => void;
  onFloorPlanChange: (plan: FloorPlanConfig) => void;
}

function shapeRadius(shape: TableShape) {
  if (shape === "circle") return "9999px";
  if (shape === "square") return "8px";
  return "6px";
}

export function TableFloorView({
  tables,
  sections,
  floorPlan,
  canManage,
  bulkMode,
  selected,
  onSelect,
  onTableMove,
  onTableMetaChange,
  onOpen,
  onFloorPlanChange,
}: TableFloorViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [designMode, setDesignMode] = useState(true);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; meta: FloorPlanTableMeta } | null>(
    null
  );

  const pctFromEvent = useCallback((ev: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(2, Math.min(98, ((ev.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(2, Math.min(98, ((ev.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const startTableDrag = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      if (!canManage || bulkMode) return;
      e.preventDefault();
      e.stopPropagation();
      setActiveTable(tableId);
      dragRef.current = { id: tableId, moved: false };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        dragRef.current.moved = true;
        const { x, y } = pctFromEvent(ev);
        onTableMove(tableId, x, y);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [canManage, bulkMode, onTableMove, pctFromEvent]
  );

  const startResize = useCallback(
    (e: React.MouseEvent, tableId: string, meta: FloorPlanTableMeta) => {
      if (!canManage || !designMode) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { id: tableId, startX: e.clientX, startY: e.clientY, meta: { ...meta } };

      const onMove = (ev: MouseEvent) => {
        const r = resizeRef.current;
        if (!r) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = ((ev.clientX - r.startX) / rect.width) * 100;
        const dy = ((ev.clientY - r.startY) / rect.height) * 100;
        const w = Math.max(4, Math.min(24, r.meta.w + dx));
        const h =
          r.meta.shape === "circle"
            ? w
            : r.meta.shape === "square"
              ? w
              : Math.max(3, Math.min(20, r.meta.h + dy));
        onTableMetaChange(tableId, { ...r.meta, w, h });
      };
      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [canManage, designMode, onTableMetaChange]
  );

  function addZone(section?: TableSection) {
    if (!canManage) return;
    const idx = floorPlan.shapes.filter((s) => s.type === "zone").length;
    const shape: FloorPlanShape = {
      id: section ? `zone-${section.id}` : `zone-${Date.now()}`,
      type: "zone",
      x: 5 + (idx % 3) * 30,
      y: 5 + Math.floor(idx / 3) * 28,
      w: 28,
      h: 22,
      label: section?.labelAr || "منطقة جديدة",
      sectionId: section?.id,
      color: section?.color || SECTION_ZONE_COLORS[section?.id || ""] || "#94a3b844",
    };
    onFloorPlanChange({
      ...floorPlan,
      shapes: [...floorPlan.shapes, shape],
    });
  }

  function addAllSectionZones() {
    const existing = new Set(floorPlan.shapes.map((s) => s.sectionId).filter(Boolean));
    const toAdd = sections.filter((s) => !existing.has(s.id));
    if (!toAdd.length) return;
    const newShapes = [...floorPlan.shapes];
    toAdd.forEach((section, i) => {
      newShapes.push({
        id: `zone-${section.id}`,
        type: "zone",
        x: 3 + (i % 2) * 48,
        y: 3 + Math.floor(i / 2) * 30,
        w: 45,
        h: 26,
        label: section.labelAr,
        sectionId: section.id,
        color: section.color || SECTION_ZONE_COLORS[section.id] || "#94a3b844",
      });
    });
    onFloorPlanChange({ ...floorPlan, shapes: newShapes });
  }

  function setShape(tableId: string, shape: TableShape) {
    const meta = getTableMeta(floorPlan, tableId);
    const next: FloorPlanTableMeta =
      shape === "rectangle"
        ? { shape, w: Math.max(meta.w, 10), h: Math.max(meta.h, 6) }
        : shape === "square"
          ? { shape, w: 7, h: 7 }
          : { shape, w: 6, h: 6 };
    onTableMetaChange(tableId, next);
  }

  return (
    <div className="space-y-3" data-testid="table-floor-view">
      <div className="flex flex-wrap items-center gap-2">
        {canManage && (
          <>
            <button
              type="button"
              onClick={() => setDesignMode((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                designMode
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {designMode ? "مصمم المخطط: ON" : "مصمم المخطط: OFF"}
            </button>
            {designMode && (
              <>
                <button
                  type="button"
                  onClick={() => addZone()}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  + منطقة مخصصة
                </button>
                <button
                  type="button"
                  onClick={addAllSectionZones}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  إظهار الأقسام (داخلي، VIP…)
                </button>
              </>
            )}
          </>
        )}
        {activeTable && designMode && canManage && (
          <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
            <span className="px-2 text-[10px] text-slate-500">الشكل:</span>
            {(
              [
                ["circle", Circle],
                ["square", Square],
                ["rectangle", RectangleHorizontal],
              ] as const
            ).map(([shape, Icon]) => (
              <button
                key={shape}
                type="button"
                onClick={() => setShape(activeTable, shape)}
                className="rounded p-1.5 hover:bg-slate-100"
                title={shape}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={canvasRef}
        className="relative mx-auto w-full overflow-hidden rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-slate-100 via-white to-slate-50 shadow-inner"
        style={{
          aspectRatio: `${floorPlan.width}/${floorPlan.height}`,
          maxHeight: "min(72vh, 720px)",
          minHeight: 280,
        }}
      >
        {floorPlan.shapes.map((shape) => (
          <div
            key={shape.id}
            className="pointer-events-none absolute border border-slate-300/50"
            style={{
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              width: `${shape.w}%`,
              height: `${shape.h}%`,
              backgroundColor: shape.color || "#94a3b833",
              borderRadius: 8,
            }}
          >
            {shape.label && (
              <span className="absolute left-2 top-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {shape.label}
              </span>
            )}
          </div>
        ))}

        {tables.map((table) => {
          const meta = getTableMeta(floorPlan, table.id);
          const x = table.floorMapX ?? 10 + (table.sortOrder % 6) * 14;
          const y = table.floorMapY ?? 12 + Math.floor(table.sortOrder / 6) * 14;
          const visual = tableVisualStatus(table);
          const styles = statusStyles(visual);
          const isSelected = selected.has(table.id);
          const isActive = activeTable === table.id;

          return (
            <div
              key={table.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%`, width: `${meta.w}%`, height: `${meta.h}%` }}
            >
              <button
                type="button"
                onMouseDown={(e) => startTableDrag(e, table.id)}
                onClick={() => {
                  if (bulkMode && canManage) {
                    onSelect(table.id);
                    return;
                  }
                  if (dragRef.current?.moved) return;
                  setActiveTable(table.id);
                  if (!designMode) onOpen(table);
                }}
                className={`relative flex h-full w-full flex-col items-center justify-center border-2 text-xs font-bold shadow-lg transition ${styles.bg} ${styles.border} ${styles.text} ${
                  isSelected ? "ring-2 ring-emerald-500 ring-offset-1" : ""
                } ${isActive ? `ring-2 ${styles.ring}` : ""} ${bulkMode ? "cursor-pointer" : canManage ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                style={{ borderRadius: shapeRadius(meta.shape) }}
              >
                <span className="text-sm sm:text-base">#{table.number}</span>
                <span className="max-w-full truncate px-1 text-[9px] font-normal opacity-80">
                  {areaLabel(table.floorZone)}
                </span>
                {bulkMode && canManage && (
                  <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-3 w-3"
                    />
                  </span>
                )}
              </button>
              {designMode && canManage && isActive && (
                <button
                  type="button"
                  aria-label="Resize"
                  onMouseDown={(e) => startResize(e, table.id, meta)}
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400">
        {canManage
          ? "اسحب الطاولات — غيّر الحجم من الزاوية — اختر دائري / مربع / مستطيل"
          : "خريطة تفاعلية للمطعم — انقر على طاولة للتفاصيل"}
      </p>
    </div>
  );
}
