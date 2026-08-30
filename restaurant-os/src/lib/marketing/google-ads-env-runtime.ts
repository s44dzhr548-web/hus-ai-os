import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";

/** Read in Route Handlers / RSC at request time (Vercel sensitive env + Next build). */
export async function readGoogleAdsDeveloperTokenConfiguredAtRuntime(): Promise<boolean> {
  await connection();
  noStore();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  return Boolean(developerToken) && developerToken !== "placeholder";
}

export async function googleAdsEnvPayload(): Promise<{ developerTokenConfigured: boolean }> {
  return { developerTokenConfigured: await readGoogleAdsDeveloperTokenConfiguredAtRuntime() };
}
