import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";

async function readDeveloperTokenConfigured(): Promise<boolean> {
  await connection();
  noStore();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  return Boolean(developerToken) && developerToken !== "placeholder";
}

/** Sync check — use from Route Handlers after await connection() when possible. */
export function isGoogleAdsDeveloperTokenConfigured(): boolean {
  noStore();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const developerTokenConfigured =
    Boolean(developerToken) && developerToken !== "placeholder";
  return developerTokenConfigured;
}

export async function isGoogleAdsDeveloperTokenConfiguredAsync(): Promise<boolean> {
  return readDeveloperTokenConfigured();
}

export function getGoogleAdsDeveloperToken(): string {
  noStore();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!developerToken || developerToken === "placeholder") {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not configured");
  }
  return developerToken;
}

export async function getGoogleAdsDeveloperTokenAsync(): Promise<string> {
  const ok = await readDeveloperTokenConfigured();
  if (!ok) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not configured");
  return getGoogleAdsDeveloperToken();
}

export function isStaleGoogleAdsDeveloperTokenError(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  const m = message.toLowerCase();
  return (
    m.includes("developer token") &&
    (m.includes("غير مضاف") ||
      m.includes("not configured") ||
      m.includes("missing") ||
      m.includes("google_ads_developer_token"))
  );
}

export function isGoogleAdsDeveloperTokenSetupHint(hint: string | null | undefined): boolean {
  if (!hint?.trim()) return false;
  const h = hint.toLowerCase();
  return (
    h.includes("developer token") &&
    (h.includes("غير مضاف") || h.includes("pending_dev_token") || h.includes("إضافة google ads developer"))
  );
}

export function logGoogleAdsDeveloperTokenConfigured(
  context: string,
  developerTokenConfigured?: boolean
): void {
  const configured = developerTokenConfigured ?? isGoogleAdsDeveloperTokenConfigured();
  console.info(
    JSON.stringify({
      event: "google_ads_env_check",
      context,
      developerTokenConfigured: configured,
    })
  );
}

export function resolveGoogleAdsSetupHintForCard(input: {
  setupHint: string | null;
  lastSyncError: string | null;
  syncStatus: string | null | undefined;
  developerTokenConfigured: boolean;
}): string | null {
  const { developerTokenConfigured } = input;
  if (developerTokenConfigured) {
    if (input.lastSyncError && isStaleGoogleAdsDeveloperTokenError(input.lastSyncError)) {
      return null;
    }
    if (input.syncStatus === "CONNECTED_PENDING_DEV_TOKEN") {
      return null;
    }
    if (isGoogleAdsDeveloperTokenSetupHint(input.setupHint)) {
      return null;
    }
  }
  let setupHint = input.setupHint;
  if (
    input.lastSyncError &&
    !(developerTokenConfigured && isStaleGoogleAdsDeveloperTokenError(input.lastSyncError))
  ) {
    setupHint = input.lastSyncError;
  } else if (input.syncStatus === "CONNECTED_PENDING_DEV_TOKEN" && !developerTokenConfigured) {
    setupHint = "OAuth متصل — أضف Developer Token وTest Account Access ثم Sync Now";
  }
  return setupHint;
}
