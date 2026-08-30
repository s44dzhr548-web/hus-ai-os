import { googleBusinessErrorMessage } from "@/lib/google-business/constants";

export type GbpApiErrorCode =
  | "API_ACCESS_NOT_APPROVED"
  | "TOKEN_EXPIRED"
  | "INSUFFICIENT_OAUTH_SCOPE"
  | "GOOGLE_API_REQUEST_FAILED"
  | "GOOGLE_API_QUOTA";

export class GbpApiError extends Error {
  constructor(
    public readonly code: GbpApiErrorCode,
    message?: string
  ) {
    super(message || googleBusinessErrorMessage(code));
    this.name = "GbpApiError";
  }
}

function mapHttpError(status: number, bodyText: string): GbpApiError {
  const t = bodyText.toLowerCase();
  if (status === 401) return new GbpApiError("TOKEN_EXPIRED");
  if (status === 403) {
    if (t.includes("quota")) return new GbpApiError("GOOGLE_API_QUOTA");
    if (t.includes("scope")) return new GbpApiError("INSUFFICIENT_OAUTH_SCOPE");
    return new GbpApiError("API_ACCESS_NOT_APPROVED");
  }
  if (status === 404 && t.includes("not found")) {
    return new GbpApiError("API_ACCESS_NOT_APPROVED");
  }
  return new GbpApiError("GOOGLE_API_REQUEST_FAILED");
}

export async function gbpFetchJson<T>(
  accessToken: string,
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw mapHttpError(res.status, text);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export type GbpAccount = { name: string; accountName?: string; type?: string };
export type GbpLocation = {
  name: string;
  title?: string;
  storefrontAddress?: { addressLines?: string[] };
};

export async function fetchGbpAccounts(accessToken: string): Promise<GbpAccount[]> {
  const data = await gbpFetchJson<{ accounts?: GbpAccount[] }>(
    accessToken,
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
  );
  return data.accounts || [];
}

export async function fetchGbpLocations(
  accessToken: string,
  accountName: string
): Promise<GbpLocation[]> {
  const q = new URLSearchParams({ readMask: "name,title,storefrontAddress" });
  const data = await gbpFetchJson<{ locations?: GbpLocation[] }>(
    accessToken,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?${q}`
  );
  return data.locations || [];
}
