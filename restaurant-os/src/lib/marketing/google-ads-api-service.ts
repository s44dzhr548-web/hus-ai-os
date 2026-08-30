import { Prisma } from "@prisma/client";
import {
  getGoogleAdsManagerCustomerId,
} from "@/lib/marketing/google-ads-oauth-service";
import {
  getGoogleAdsDeveloperTokenAsync,
  isGoogleAdsDeveloperTokenConfiguredAsync,
  logGoogleAdsDeveloperTokenConfigured,
} from "@/lib/marketing/google-ads-developer-token";

const GOOGLE_ADS_API_VERSION = "v18";
const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export type GoogleAdsSyncResult = {
  campaigns: number;
  spend: number;
  customerId: string;
  accountName: string;
  currency: string | null;
};

export class GoogleAdsApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "GoogleAdsApiError";
  }
}

function normalizeCustomerId(raw: string): string {
  return raw.replace(/^customers\//i, "").replace(/-/g, "").trim();
}

/** Strip secrets/tokens from API error text before showing owners. */
export function sanitizeGoogleAdsErrorMessage(raw: string): string {
  let msg = raw
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[token]")
    .replace(/developer[_\s-]?token[^\s]*/gi, "developer token");
  if (msg.length > 500) msg = `${msg.slice(0, 497)}…`;
  return msg.trim();
}

function mapGoogleAdsFailure(status: string, message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("developer token") &&
    (m.includes("not approved") || m.includes("provisional") || m.includes("test account access"))
  ) {
    return `Developer Token: ${message} — تأكد من مستوى Basic/Standard وTest Account Access في Google Ads API Center`;
  }
  if (
    m.includes("developer token") &&
    (m.includes("basic access") ||
      m.includes("pending") ||
      m.includes("application") ||
      status === "PERMISSION_DENIED")
  ) {
    return "تم ربط حساب Google بنجاح، لكن الوصول إلى بيانات Google Ads الفعلية بانتظار موافقة Google على Basic Access.";
  }
  if (status === "UNAUTHENTICATED" || m.includes("invalid_grant")) {
    return "انتهت جلسة Google — أعد ربط Google Ads";
  }
  if (status === "PERMISSION_DENIED" || m.includes("user permission")) {
    return `Google Ads: ${sanitizeGoogleAdsErrorMessage(message)}`;
  }
  if (m.includes("test account") && m.includes("developer")) {
    return `Test Account Access: ${sanitizeGoogleAdsErrorMessage(message)}`;
  }
  return sanitizeGoogleAdsErrorMessage(message || status || "Google Ads API error");
}

async function parseGoogleAdsResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

function extractApiError(body: unknown, httpStatus: number): GoogleAdsApiError {
  const b = body as {
    error?: {
      message?: string;
      status?: string;
      code?: number;
      details?: Array<{ errors?: Array<{ message?: string; errorCode?: Record<string, string> }> }>;
    };
  };
  let message = b.error?.message || "Google Ads API request failed";
  const status = b.error?.status || "";
  const detailErr = b.error?.details?.[0]?.errors?.[0];
  if (detailErr?.message) message = detailErr.message;
  const codeKey = detailErr?.errorCode
    ? Object.keys(detailErr.errorCode)[0]
    : undefined;
  return new GoogleAdsApiError(
    mapGoogleAdsFailure(status, message),
    codeKey || status || String(httpStatus),
    httpStatus
  );
}

async function adsHeaders(
  accessToken: string,
  loginCustomerId?: string | null
): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": await getGoogleAdsDeveloperTokenAsync(),
    "Content-Type": "application/json",
  };
  if (loginCustomerId) {
    h["login-customer-id"] = normalizeCustomerId(loginCustomerId);
  }
  return h;
}

export async function listAccessibleGoogleAdsCustomerIds(
  accessToken: string
): Promise<string[]> {
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`, {
    headers: await adsHeaders(accessToken),
  });
  const body = await parseGoogleAdsResponse(res);
  if (!res.ok) throw extractApiError(body, res.status);

  const names = (body as { resourceNames?: string[] }).resourceNames || [];
  return names.map(normalizeCustomerId).filter(Boolean);
}

async function googleAdsSearch<T>(
  accessToken: string,
  customerId: string,
  query: string,
  loginCustomerId?: string | null
): Promise<T[]> {
  const cid = normalizeCustomerId(customerId);
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${cid}/googleAds:search`, {
    method: "POST",
    headers: await adsHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ query }),
  });
  const body = await parseGoogleAdsResponse(res);
  if (!res.ok) throw extractApiError(body, res.status);
  return ((body as { results?: T[] }).results || []) as T[];
}

export function isPlaceholderGoogleAccountId(accountId: string | null | undefined): boolean {
  if (!accountId?.trim()) return true;
  const id = accountId.trim().toLowerCase();
  if (id === "connected" || id === "google-oauth") return true;
  if (id.includes("account")) return true;
  return !/^\d{3,16}$/.test(accountId.replace(/-/g, ""));
}

export async function syncGoogleAdsEntities(input: {
  restaurantId: string;
  accessToken: string;
  storedAccountId?: string | null;
  loginCustomerId?: string | null;
}): Promise<GoogleAdsSyncResult> {
  const developerTokenConfigured = await isGoogleAdsDeveloperTokenConfiguredAsync();
  logGoogleAdsDeveloperTokenConfigured("syncGoogleAdsEntities", developerTokenConfigured);
  if (!developerTokenConfigured) {
    throw new GoogleAdsApiError(
      "Developer Token غير مضاف — OAuth متصل لكن قراءة الحملات تتطلب GOOGLE_ADS_DEVELOPER_TOKEN",
      "DEVELOPER_TOKEN_MISSING"
    );
  }

  const managerId = input.loginCustomerId || getGoogleAdsManagerCustomerId();
  const accessible = await listAccessibleGoogleAdsCustomerIds(input.accessToken);

  if (!accessible.length) {
    throw new GoogleAdsApiError(
      "لا يوجد حساب Google Ads يمكن الوصول إليه لهذا المستخدم",
      "NO_ACCESSIBLE_CUSTOMERS"
    );
  }

  let customerId: string | null = null;
  const stored = input.storedAccountId?.trim();
  if (stored && !isPlaceholderGoogleAccountId(stored)) {
    const norm = normalizeCustomerId(stored);
    if (accessible.includes(norm)) customerId = norm;
  }
  if (!customerId && managerId) {
    const norm = normalizeCustomerId(managerId);
    if (accessible.includes(norm)) customerId = norm;
  }
  if (!customerId) customerId = accessible[0];

  const loginForQuery =
    managerId && normalizeCustomerId(managerId) !== customerId
      ? normalizeCustomerId(managerId)
      : undefined;

  type CustomerRow = {
    customer?: {
      id?: string;
      descriptiveName?: string;
      currencyCode?: string;
    };
  };

  const customerRows = await googleAdsSearch<CustomerRow>(
    input.accessToken,
    customerId,
    "SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer LIMIT 1",
    loginForQuery
  );
  const customer = customerRows[0]?.customer;
  if (!customer?.id) {
    throw new GoogleAdsApiError(
      "تعذّر قراءة بيانات حساب Google Ads (customer)",
      "CUSTOMER_QUERY_EMPTY"
    );
  }

  const resolvedId = normalizeCustomerId(String(customer.id));
  const accountName = customer.descriptiveName?.trim() || `Google Ads ${resolvedId}`;
  const currency = customer.currencyCode?.trim() || null;

  type CampaignRow = {
    campaign?: { id?: string; name?: string; status?: string };
    metrics?: { costMicros?: string };
  };

  let campaignRows: CampaignRow[] = [];
  try {
    campaignRows = await googleAdsSearch<CampaignRow>(
      input.accessToken,
      resolvedId,
      `SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros
       FROM campaign
       WHERE campaign.status != 'REMOVED'
       AND segments.date DURING LAST_30_DAYS`,
      loginForQuery
    );
  } catch {
    campaignRows = await googleAdsSearch<CampaignRow>(
      input.accessToken,
      resolvedId,
      `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED'`,
      loginForQuery
    );
  }

  const prisma = (await import("@/lib/prisma")).default;
  let campaigns = 0;
  let totalSpend = 0;

  for (const row of campaignRows) {
    const c = row.campaign;
    if (!c?.id) continue;
    campaigns++;
    const spendMicros = parseInt(row.metrics?.costMicros || "0", 10);
    const spend = Number.isFinite(spendMicros) ? spendMicros / 1_000_000 : 0;
    totalSpend += spend;

    await prisma.marketingAdEntity.upsert({
      where: {
        restaurantId_platform_entityType_externalId: {
          restaurantId: input.restaurantId,
          platform: "GOOGLE",
          entityType: "CAMPAIGN",
          externalId: String(c.id),
        },
      },
      create: {
        restaurantId: input.restaurantId,
        platform: "GOOGLE",
        entityType: "CAMPAIGN",
        externalId: String(c.id),
        name: c.name || `Campaign ${c.id}`,
        status: c.status || "UNKNOWN",
        spend,
        syncedAt: new Date(),
        rawJson: { id: c.id, name: c.name, status: c.status },
      },
      update: {
        name: c.name || `Campaign ${c.id}`,
        status: c.status || "UNKNOWN",
        spend,
        syncedAt: new Date(),
        rawJson: { id: c.id, name: c.name, status: c.status },
      },
    });
  }

  return {
    campaigns,
    spend: totalSpend,
    customerId: resolvedId,
    accountName,
    currency,
  };
}

export function logGoogleAdsSyncFailure(info: {
  restaurantId: string;
  code?: string;
  message: string;
  httpStatus?: number;
}) {
  console.warn(
    JSON.stringify({
      event: "google_ads_sync_failed",
      restaurantId: info.restaurantId,
      code: info.code ?? null,
      httpStatus: info.httpStatus ?? null,
      message: sanitizeGoogleAdsErrorMessage(info.message),
      ts: new Date().toISOString(),
    })
  );
}
