import type { MarketingPlatform } from "@prisma/client";

const OAUTH_CONFIG: Partial<
  Record<
    MarketingPlatform,
    { authUrl: string; tokenUrl: string; scopes: string[]; clientIdEnv: string; clientSecretEnv: string }
  >
> = {
  META: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["ads_management", "ads_read", "business_management"],
    clientIdEnv: "META_ADS_CLIENT_ID",
    clientSecretEnv: "META_ADS_CLIENT_SECRET",
  },
  INSTAGRAM: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_manage_insights", "ads_management"],
    clientIdEnv: "META_ADS_CLIENT_ID",
    clientSecretEnv: "META_ADS_CLIENT_SECRET",
  },
  FACEBOOK: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["ads_management", "pages_read_engagement"],
    clientIdEnv: "META_ADS_CLIENT_ID",
    clientSecretEnv: "META_ADS_CLIENT_SECRET",
  },
  TIKTOK: {
    authUrl: "https://business-api.tiktok.com/portal/auth",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    scopes: ["ad_management", "reporting"],
    clientIdEnv: "TIKTOK_ADS_CLIENT_ID",
    clientSecretEnv: "TIKTOK_ADS_CLIENT_SECRET",
  },
  GOOGLE: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    clientIdEnv: "GOOGLE_ADS_CLIENT_ID",
    clientSecretEnv: "GOOGLE_ADS_CLIENT_SECRET",
  },
  SNAPCHAT: {
    authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    scopes: ["snapchat-marketing-api"],
    clientIdEnv: "SNAPCHAT_ADS_CLIENT_ID",
    clientSecretEnv: "SNAPCHAT_ADS_CLIENT_SECRET",
  },
  X: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "users.read", "offline.access"],
    clientIdEnv: "X_ADS_CLIENT_ID",
    clientSecretEnv: "X_ADS_CLIENT_SECRET",
  },
};

export function getOAuthStartUrl(
  platform: MarketingPlatform,
  restaurantId: string,
  redirectBase: string
): string | null {
  const cfg = OAUTH_CONFIG[platform];
  if (!cfg) return null;
  const clientId = process.env[cfg.clientIdEnv];
  if (!clientId) return null;

  const redirectUri = `${redirectBase}/api/marketing/connections/${platform.toLowerCase()}/callback`;
  const state = Buffer.from(JSON.stringify({ restaurantId, platform })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: cfg.scopes.join(" "),
    state,
    response_type: "code",
  });

  return `${cfg.authUrl}?${params.toString()}`;
}

export function isOAuthConfigured(platform: MarketingPlatform): boolean {
  const cfg = OAUTH_CONFIG[platform];
  if (!cfg) return false;
  return Boolean(process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
}

export function parseOAuthState(state: string): { restaurantId: string; platform: MarketingPlatform } | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export { OAUTH_CONFIG };
