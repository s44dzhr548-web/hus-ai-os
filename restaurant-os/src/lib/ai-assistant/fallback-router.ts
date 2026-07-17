import type { AiToolName } from "@/lib/ai-assistant/types";

type RoutedCommand = {
  tool: AiToolName;
  args: Record<string, unknown>;
};

const READ_PATTERNS: Array<{ re: RegExp; tool: AiToolName; args?: Record<string, unknown> }> = [
  { re: /حجوزات\s*اليوم|اعرض\s*حجوزات\s*اليوم/i, tool: "get_today_reservations" },
  { re: /زوار\s*أمس|عدد\s*زوار\s*أمس/i, tool: "get_daily_visitor_report", args: { period: "yesterday" } },
  { re: /زوار\s*اليوم|عدد\s*زوار\s*اليوم/i, tool: "get_daily_visitor_report", args: { period: "today" } },
  { re: /واتساب.*متصل|اتصال\s*واتساب|فحص\s*واتساب/i, tool: "get_whatsapp_connection_status" },
  { re: /الأمنيات|اعرض\s*الأمنيات/i, tool: "list_wishes" },
  { re: /الإهداء|الإهداءات|اهداءات\s*معلق/i, tool: "list_gifts" },
  { re: /طلبات\s*الأغاني|طلب\s*أغنية|الأغاني/i, tool: "list_song_requests" },
  { re: /الطاولات\s*المتاح|طاولات\s*متاح/i, tool: "get_available_tables" },
];

const WRITE_PATTERNS: Array<{
  re: RegExp;
  tool: AiToolName;
  parse: (m: RegExpMatchArray) => Record<string, unknown>;
}> = [
  {
    re: /ع[يّ]?[n]?\s*(?:الحجز\s*)?(?:رقم\s*)?([A-Za-z0-9-]+)\s*على\s*طاولة\s*(\d+)/i,
    tool: "assign_table",
    parse: (m) => ({ reservationNumber: m[1], tableNumber: m[2] }),
  },
  {
    re: /سج[ّ]?ل\s*وصول\s*(.+)/i,
    tool: "mark_customer_arrived",
    parse: (m) => ({ customerName: m[1].trim() }),
  },
];

export function routeFallbackCommand(message: string): RoutedCommand | null {
  const text = message.trim();
  for (const w of WRITE_PATTERNS) {
    const m = text.match(w.re);
    if (m) return { tool: w.tool, args: w.parse(m) };
  }
  for (const p of READ_PATTERNS) {
    if (p.re.test(text)) return { tool: p.tool, args: p.args || {} };
  }
  if (/ابحث\s*عن\s*حجز\s*(.+)/i.test(text)) {
    const q = text.match(/ابحث\s*عن\s*حجز\s*(.+)/i)?.[1]?.trim();
    if (q) return { tool: "search_reservations", args: { query: q } };
  }
  if (/ابحث\s*عن\s*عميل\s*(.+)/i.test(text)) {
    const q = text.match(/ابحث\s*عن\s*عميل\s*(.+)/i)?.[1]?.trim();
    if (q) return { tool: "search_customers", args: { name: q } };
  }
  return null;
}

export function formatToolResultSummary(
  tool: string,
  result: { summary: string; data?: unknown }
): string {
  return result.summary || `تم تنفيذ ${tool}`;
}
