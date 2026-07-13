export interface MonitoringSettings {
  maxWaitMinutes?: number;
  maxSessionMinutes?: number;
  maxOccupancyPercent?: number;
  maxTableOccupiedMinutes?: number;
}

export const DEFAULT_MONITORING_SETTINGS: MonitoringSettings = {
  maxWaitMinutes: 20,
  maxSessionMinutes: 180,
  maxOccupancyPercent: 85,
  maxTableOccupiedMinutes: 240,
};

export function parseMonitoringSettings(raw: unknown): MonitoringSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MONITORING_SETTINGS };
  const o = raw as MonitoringSettings;
  return {
    maxWaitMinutes: o.maxWaitMinutes ?? DEFAULT_MONITORING_SETTINGS.maxWaitMinutes,
    maxSessionMinutes: o.maxSessionMinutes ?? DEFAULT_MONITORING_SETTINGS.maxSessionMinutes,
    maxOccupancyPercent: o.maxOccupancyPercent ?? DEFAULT_MONITORING_SETTINGS.maxOccupancyPercent,
    maxTableOccupiedMinutes:
      o.maxTableOccupiedMinutes ?? DEFAULT_MONITORING_SETTINGS.maxTableOccupiedMinutes,
  };
}

export const SESSION_STATUS_AR: Record<string, string> = {
  WAITING: "انتظار",
  SEATED: "جلس",
  ORDERING: "يطلب",
  FOOD_PREPARING: "تناول",
  SERVING: "تناول",
  PAID: "دفع",
  COMPLETED: "مكتمل",
  AVAILABLE: "متاح",
};

export const MONITORING_OWNER_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
