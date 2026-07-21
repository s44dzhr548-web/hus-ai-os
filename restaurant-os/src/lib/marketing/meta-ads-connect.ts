import { isMetaOAuthReady } from "@/lib/marketing/meta-oauth-service";

export const META_CONNECT_URL = "/api/integrations/meta/connect";

export type MetaAdsConnectionState =
  | "NOT_CONFIGURED"
  | "READY_TO_CONNECT"
  | "CONNECTING"
  | "CONNECTED"
  | "TOKEN_EXPIRED"
  | "ERROR";

export const META_CONNECTION_STATE_LABELS: Record<MetaAdsConnectionState, string> = {
  NOT_CONFIGURED: "غير مهيأ",
  READY_TO_CONNECT: "جاهز للربط",
  CONNECTING: "جاري الربط",
  CONNECTED: "Connected ✅",
  TOKEN_EXPIRED: "انتهت الصلاحية",
  ERROR: "خطأ في الربط",
};

export async function isMetaAdsConfigured(): Promise<boolean> {
  return isMetaOAuthReady();
}

type ConnectionRow = {
  isActive: boolean;
  accessTokenEnc: string | null;
  syncStatus: string;
  tokenExpiresAt: Date | null;
} | null;

export function resolveMetaAdsConnectionState(
  conn: ConnectionRow,
  configured: boolean
): MetaAdsConnectionState {
  if (!configured) return "NOT_CONFIGURED";

  if (conn?.syncStatus === "PENDING_ACCOUNT") return "CONNECTING";

  if (conn?.isActive && conn.accessTokenEnc) {
    if (conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() < Date.now()) {
      return "TOKEN_EXPIRED";
    }
    if (conn.syncStatus === "CONNECTED") return "CONNECTED";
    return "CONNECTED";
  }

  if (conn?.syncStatus === "ERROR" || conn?.syncStatus === "DISCONNECTED") {
    return "ERROR";
  }

  if (
    conn?.accessTokenEnc &&
    conn.tokenExpiresAt &&
    conn.tokenExpiresAt.getTime() < Date.now()
  ) {
    return "TOKEN_EXPIRED";
  }

  return "READY_TO_CONNECT";
}

export function metaAdsShowsConnectButton(state: MetaAdsConnectionState): boolean {
  return state === "READY_TO_CONNECT" || state === "TOKEN_EXPIRED" || state === "ERROR";
}
