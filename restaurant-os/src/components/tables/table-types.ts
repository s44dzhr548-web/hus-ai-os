export interface TableRow {
  id: string;
  number: number;
  label?: string | null;
  capacity: number;
  isActive: boolean;
  isArchived?: boolean;
  qrCode?: string | null;
  tableCode?: string | null;
  floorZone?: string | null;
  floorMapX?: number | null;
  floorMapY?: number | null;
  operationalStatus?: string;
  sortOrder: number;
  branch: { name: string; nameAr?: string };
  _count?: { orders: number; reservations: number; tableSessions: number };
}

export interface QrData {
  menuUrl: string;
  qrDataUrl: string;
}

export interface TableSection {
  id: string;
  labelAr: string;
  labelEn: string;
  color?: string;
  custom?: boolean;
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
  w: number;
  h: number;
}

export interface FloorPlanConfig {
  width: number;
  height: number;
  shapes: FloorPlanShape[];
  tableMeta?: Record<string, FloorPlanTableMeta>;
  updatedAt?: string;
}
