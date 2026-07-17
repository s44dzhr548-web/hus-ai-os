export const AI_ASSISTANT_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "RECEPTION",
  "CASHIER",
  "WAITER",
] as const;

export type AiToolName =
  | "get_today_reservations"
  | "search_reservations"
  | "create_reservation"
  | "update_reservation"
  | "get_available_tables"
  | "assign_table"
  | "mark_customer_arrived"
  | "search_customers"
  | "get_customer_history"
  | "get_daily_visitor_report"
  | "get_whatsapp_connection_status"
  | "send_whatsapp_template"
  | "list_gifts"
  | "list_wishes"
  | "list_song_requests";

export const READ_TOOLS: AiToolName[] = [
  "get_today_reservations",
  "search_reservations",
  "get_available_tables",
  "search_customers",
  "get_customer_history",
  "get_daily_visitor_report",
  "get_whatsapp_connection_status",
  "list_gifts",
  "list_wishes",
  "list_song_requests",
];

export const WRITE_TOOLS: AiToolName[] = [
  "create_reservation",
  "update_reservation",
  "assign_table",
  "mark_customer_arrived",
  "send_whatsapp_template",
];

export const BLOCKED_TOOLS = new Set([
  "delete_data",
  "refund_payment",
  "modify_subscription",
  "modify_permissions",
  "bulk_whatsapp",
  "run_sql",
  "run_terminal",
  "modify_files",
]);

export type ToolContext = {
  restaurantId: string;
  userId: string;
  userName?: string | null;
  userRole: string;
};

export type ToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  beforeState?: unknown;
  afterState?: unknown;
  error?: string;
};

export type PendingActionPayload = {
  pendingActionId: string;
  toolName: AiToolName;
  previewSummary: string;
  expiresAt: string;
};

export type ChatAssistantResponse = {
  message: string;
  toolResults?: Array<{ tool: string; summary: string; data?: unknown }>;
  pendingAction?: PendingActionPayload;
};

export const SUGGESTED_COMMANDS = [
  "اعرض حجوزات اليوم",
  "ابحث عن حجز باسم محمد",
  "كم عدد زوار أمس؟",
  "هل واتساب المطعم متصل؟",
  "اعرض الأمنيات الجديدة",
  "اعرض طلبات الأغاني",
  "اعرض الإهداءات المعلقة",
  "اعرض الطاولات المتاحة",
];
