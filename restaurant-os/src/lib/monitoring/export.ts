import { toCsv } from "@/lib/customer-history";

export function monitoringStatsCsv(stats: Record<string, number | string>) {
  return toCsv(
    ["metric", "value"],
    Object.entries(stats).map(([metric, value]) => ({ metric, value }))
  );
}

export function liveCustomersCsv(
  rows: {
    customerName: string;
    customerPhone?: string | null;
    tableNumber: number;
    enteredAt: string;
    waitingMinutes: number;
    sessionMinutes: number;
    staffName?: string | null;
    statusLabel: string;
  }[]
) {
  return toCsv(
    [
      "customerName",
      "customerPhone",
      "tableNumber",
      "enteredAt",
      "waitingMinutes",
      "sessionMinutes",
      "staffName",
      "status",
    ],
    rows.map((r) => ({
      customerName: r.customerName,
      customerPhone: r.customerPhone ?? "",
      tableNumber: r.tableNumber,
      enteredAt: r.enteredAt,
      waitingMinutes: r.waitingMinutes,
      sessionMinutes: r.sessionMinutes,
      staffName: r.staffName ?? "",
      status: r.statusLabel,
    }))
  );
}

export function staffPerformanceCsv(
  rows: {
    name: string;
    customersToday: number;
    customersWeek: number;
    customersMonth: number;
    tablesAssigned: number;
    sessionsCompleted: number;
    avgServiceMinutes: number;
    avgStayMinutes: number;
    workingHours: number;
  }[]
) {
  return toCsv(
    [
      "name",
      "customersToday",
      "customersWeek",
      "customersMonth",
      "tablesAssigned",
      "sessionsCompleted",
      "avgServiceMinutes",
      "avgStayMinutes",
      "workingHours",
    ],
    rows as Record<string, unknown>[]
  );
}

export function auditFeedCsv(
  rows: { source: string; action: string; detail: string; actor: string | null; at: string }[]
) {
  return toCsv(["source", "action", "detail", "actor", "at"], rows as Record<string, unknown>[]);
}

export function monitoringPdfHtml(
  title: string,
  sections: { heading: string; rows: string[][] }[]
) {
  const body = sections
    .map(
      (s) => `
    <h2>${s.heading}</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
      ${s.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
    </table>`
    )
    .join("");

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;padding:24px}h1{color:#065f46}h2{margin-top:24px;color:#334155}</style></head>
  <body><h1>${title}</h1>${body}<p style="margin-top:32px;color:#94a3b8;font-size:11px">Menu OS — Owner Monitoring</p></body></html>`;
}
