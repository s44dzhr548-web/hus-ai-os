import { DEFAULT_MESSAGE_BODY } from "./types";

export function renderTemplateBody(
  template: string,
  vars: [string, string, string, string]
): string {
  return template
    .replace(/\{\{1\}\}/g, vars[0])
    .replace(/\{\{2\}\}/g, vars[1])
    .replace(/\{\{3\}\}/g, vars[2])
    .replace(/\{\{4\}\}/g, vars[3]);
}

export function buildTemplateVariables(params: {
  customerName: string;
  restaurantName: string;
  tableNumber: string;
  reviewUrl: string;
  messageBody?: string | null;
}): { bodyText: string; bodyParams: { type: "text"; text: string }[] } {
  const vars: [string, string, string, string] = [
    params.customerName,
    params.restaurantName,
    params.tableNumber,
    params.reviewUrl,
  ];
  const template = params.messageBody?.trim() || DEFAULT_MESSAGE_BODY;
  const bodyText = renderTemplateBody(template, vars);
  return {
    bodyText,
    bodyParams: vars.map((text) => ({ type: "text" as const, text })),
  };
}
