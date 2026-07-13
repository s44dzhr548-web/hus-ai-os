import { TABLE_AREAS } from "@/lib/table-areas";

export interface TableSection {
  id: string;
  labelAr: string;
  labelEn: string;
  color?: string;
  custom?: boolean;
}

export function defaultSections(): TableSection[] {
  return TABLE_AREAS.map((a) => ({
    id: a.id,
    labelAr: a.labelAr,
    labelEn: a.labelEn,
    custom: false,
  }));
}

export function parseBranchSections(raw: unknown): TableSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultSections();
  return raw
    .filter((s) => s && typeof s === "object" && typeof (s as TableSection).id === "string")
    .map((s) => ({
      id: String((s as TableSection).id),
      labelAr: String((s as TableSection).labelAr || (s as TableSection).id),
      labelEn: String((s as TableSection).labelEn || (s as TableSection).id),
      color: (s as TableSection).color,
      custom: (s as TableSection).custom ?? true,
    }));
}

export interface FloorPlanShape {
  id: string;
  type: "rect" | "zone";
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  sectionId?: string;
  color?: string;
}

export type TableShape = "circle" | "square" | "rectangle";

export interface FloorPlanTableMeta {
  shape: TableShape;
  /** Width as % of canvas */
  w: number;
  /** Height as % of canvas */
  h: number;
}

export interface FloorPlanConfig {
  width: number;
  height: number;
  shapes: FloorPlanShape[];
  tableMeta?: Record<string, FloorPlanTableMeta>;
  updatedAt?: string;
}

export const DEFAULT_TABLE_META: FloorPlanTableMeta = {
  shape: "circle",
  w: 6,
  h: 6,
};

export function parseFloorPlan(raw: unknown): FloorPlanConfig {
  if (!raw || typeof raw !== "object") {
    return { width: 800, height: 600, shapes: [], tableMeta: {} };
  }
  const o = raw as FloorPlanConfig;
  return {
    width: o.width || 800,
    height: o.height || 600,
    shapes: Array.isArray(o.shapes) ? o.shapes : [],
    tableMeta: o.tableMeta && typeof o.tableMeta === "object" ? o.tableMeta : {},
    updatedAt: o.updatedAt,
  };
}

export function getTableMeta(
  plan: FloorPlanConfig,
  tableId: string,
  shapeHint?: TableShape
): FloorPlanTableMeta {
  const stored = plan.tableMeta?.[tableId];
  if (stored) return stored;
  if (shapeHint === "rectangle") return { shape: "rectangle", w: 10, h: 6 };
  if (shapeHint === "square") return { shape: "square", w: 7, h: 7 };
  return { ...DEFAULT_TABLE_META };
}

export const SECTION_ZONE_COLORS: Record<string, string> = {
  indoor: "#3b82f640",
  outdoor: "#22c55e40",
  vip: "#a855f740",
  family: "#f9731640",
  smoking: "#64748b40",
  events: "#ec489940",
};

export function newSection(labelAr: string): TableSection {
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return { id, labelAr, labelEn: labelAr, custom: true, color: "#64748b" };
}
