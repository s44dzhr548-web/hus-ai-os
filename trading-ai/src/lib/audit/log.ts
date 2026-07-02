import type { AuditEntry, Recommendation, RiskLevel } from "@/types/trading";

const MAX_ENTRIES = 500;
const auditLog: AuditEntry[] = [];

export function logRecommendation(entry: Omit<AuditEntry, "id" | "createdAt">): AuditEntry {
  const row: AuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  auditLog.unshift(row);
  if (auditLog.length > MAX_ENTRIES) auditLog.pop();
  return row;
}

export function getAuditLog(limit = 100, symbol?: string): AuditEntry[] {
  let rows = auditLog;
  if (symbol) rows = rows.filter((r) => r.symbol === symbol.toUpperCase());
  return rows.slice(0, limit);
}

export function getAuditStats() {
  const total = auditLog.length;
  const live = auditLog.filter((r) => r.dataSource === "live").length;
  return { total, live, demo: total - live };
}

export type { Recommendation, RiskLevel };
