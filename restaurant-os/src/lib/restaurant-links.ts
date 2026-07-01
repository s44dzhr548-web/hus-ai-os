import { tableCodeFor, menuUrlForTable } from "./table-code";

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3005"
  ).replace(/\/$/, "");
}

interface LinkInput {
  slug: string;
  tableId?: string | null;
  tableCode?: string | null;
  qrCode?: string | null;
  branchId?: string | null;
}

export function buildRestaurantLinks(input: LinkInput) {
  const base = appBaseUrl();
  const dashboardUrl = `${base}/dashboard`;
  const branchUrl = input.branchId
    ? `${base}/dashboard/branches`
    : `${base}/dashboard/branches`;

  const tableCode =
    input.tableCode ||
    (input.slug ? tableCodeFor(input.slug, 1) : null);

  const menuUrl =
    input.tableId && input.slug && tableCode
      ? menuUrlForTable(input.tableId, input.slug, tableCode)
      : input.slug
        ? `${base}/r/${input.slug}`
        : `${base}/dashboard`;

  const qrUrl =
    input.qrCode ||
    (input.tableId && input.slug && tableCode
      ? menuUrlForTable(input.tableId, input.slug, tableCode)
      : input.slug && tableCode
        ? `${base}/r/${input.slug}/table/${tableCode}`
        : menuUrl);

  return { dashboardUrl, menuUrl, qrUrl, branchUrl };
}

export function welcomeMessage(params: {
  restaurantName: string;
  email: string;
  password: string;
  dashboardUrl: string;
  menuUrl: string;
  qrUrl: string;
}) {
  const { restaurantName, email, password, dashboardUrl, menuUrl, qrUrl } =
    params;
  return `Restaurant: ${restaurantName}

Owner Email: ${email}
Temporary Password: ${password}

Dashboard:
${dashboardUrl}

Menu:
${menuUrl}

QR:
${qrUrl}`;
}

export function credentialsBlock(params: {
  email: string;
  password: string;
  dashboardUrl: string;
  menuUrl: string;
  qrUrl: string;
}) {
  return `Email: ${params.email}
Password: ${params.password}
Dashboard: ${params.dashboardUrl}
Menu: ${params.menuUrl}
QR: ${params.qrUrl}`;
}

export const MENU_FONTS = [
  { id: "cairo", label: "Cairo (عربي)", css: '"Cairo", sans-serif' },
  { id: "tajawal", label: "Tajawal (عربي)", css: '"Tajawal", sans-serif' },
  { id: "inter", label: "Inter (English)", css: '"Inter", sans-serif' },
  { id: "system", label: "System", css: "system-ui, sans-serif" },
] as const;

export function fontCss(fontFamily?: string | null): string {
  const found = MENU_FONTS.find((f) => f.id === fontFamily);
  return found?.css ?? MENU_FONTS[0].css;
}
