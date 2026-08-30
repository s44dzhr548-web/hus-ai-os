import type { NextConfig } from "next";

/** Local .env placeholders like https://[SENSITIVE] break next-auth/metadata at build time. */
function stripPlaceholderEnv(key: string, fallback: string) {
  const raw = process.env[key]?.trim();
  if (!raw || raw.includes("[SENSITIVE]") || raw.includes("placeholder")) {
    process.env[key] = fallback;
    return;
  }
  try {
    new URL(raw);
  } catch {
    process.env[key] = fallback;
  }
}
stripPlaceholderEnv("NEXTAUTH_URL", "https://www.menuhus.com");
stripPlaceholderEnv("NEXT_PUBLIC_APP_URL", "https://www.menuhus.com");

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/dashboard/marketing/automations/after-visit",
        destination: "/dashboard/marketing/whatsapp?tab=automation",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
