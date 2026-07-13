/** AI & marketing provider catalog — connection capabilities per official docs */

export type ProviderCategory = "BRAIN" | "IMAGE" | "VIDEO" | "AUDIO" | "COPY" | "ADS";

export type ConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTED"
  | "NEEDS_RECONNECT"
  | "INVALID_KEY"
  | "EXPIRED"
  | "HEALTHY";

export interface ProviderDefinition {
  key: string;
  nameAr: string;
  nameEn: string;
  category: ProviderCategory;
  /** Official OAuth supported for this integration use case */
  oauthSupported: boolean;
  apiKeySupported: boolean;
  requiresOrgId?: boolean;
  requiresProjectId?: boolean;
  requiresEndpoint?: boolean;
  models?: { id: string; labelAr: string }[];
  developerSetupRequired: boolean;
  developerSetupEnv?: string[];
  costEstimate?: string;
  usageEstimate?: string;
  /** Extra metadata for UI */
  meta?: Record<string, unknown>;
}

export const STATUS_LABELS: Record<ConnectionStatus, string> = {
  DISCONNECTED: "غير متصل",
  CONNECTED: "متصل",
  NEEDS_RECONNECT: "يحتاج إعادة ربط",
  INVALID_KEY: "المفتاح غير صالح",
  EXPIRED: "انتهت الصلاحية",
  HEALTHY: "يعمل بشكل طبيعي",
};

export const BRAIN_ROLES = [
  { id: "MARKETING_MANAGER", labelAr: "مدير التسويق" },
  { id: "DATA_ANALYST", labelAr: "محلل البيانات" },
  { id: "BUDGET_ALLOCATOR", labelAr: "موزع الميزانية" },
  { id: "AD_COPYWRITER", labelAr: "كاتب الإعلانات" },
  { id: "CAMPAIGN_ANALYST", labelAr: "محلل الحملات" },
  { id: "CUSTOMER_ANALYST", labelAr: "محلل العملاء" },
  { id: "OPPORTUNITY_FINDER", labelAr: "مكتشف الفرص" },
  { id: "REPORT_BUILDER", labelAr: "منشئ التقارير" },
] as const;

export const IMAGE_TASKS = [
  { id: "DISH_PHOTOS", labelAr: "صور أطباق" },
  { id: "RESTAURANT_OFFERS", labelAr: "عروض المطعم" },
  { id: "INSTAGRAM_POSTS", labelAr: "منشورات إنستجرام" },
  { id: "STORIES", labelAr: "ستوري" },
  { id: "BANNERS", labelAr: "بانرات" },
  { id: "SEASONAL_ADS", labelAr: "إعلانات موسمية" },
  { id: "REALISTIC", labelAr: "صور واقعية" },
  { id: "ARABIC_TEXT", labelAr: "تصاميم تحتوي نصوص عربية" },
] as const;

export const VIDEO_TASKS = [
  { id: "TIKTOK", labelAr: "TikTok video" },
  { id: "INSTAGRAM_REEL", labelAr: "Instagram Reel" },
  { id: "SNAPCHAT_STORY", labelAr: "Snapchat Story" },
  { id: "YOUTUBE_SHORT", labelAr: "YouTube Short" },
  { id: "INTRO", labelAr: "Restaurant introduction" },
  { id: "PRODUCT", labelAr: "Product video" },
  { id: "OFFER", labelAr: "Offer video" },
  { id: "EVENT", labelAr: "Event announcement" },
] as const;

export const BRAIN_PROVIDERS: ProviderDefinition[] = [
  { key: "OPENAI", nameAr: "OpenAI", nameEn: "OpenAI", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["OPENAI_API_KEY"], models: [{ id: "gpt-4o", labelAr: "GPT-4o" }, { id: "gpt-4o-mini", labelAr: "GPT-4o Mini" }], costEstimate: "~0.01–0.05 ر.س/طلب" },
  { key: "GEMINI", nameAr: "Google Gemini", nameEn: "Gemini", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["GOOGLE_AI_API_KEY"], models: [{ id: "gemini-1.5-pro", labelAr: "Gemini 1.5 Pro" }, { id: "gemini-1.5-flash", labelAr: "Gemini 1.5 Flash" }] },
  { key: "CLAUDE", nameAr: "Anthropic Claude", nameEn: "Claude", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["ANTHROPIC_API_KEY"], models: [{ id: "claude-3-5-sonnet", labelAr: "Claude 3.5 Sonnet" }] },
  { key: "DEEPSEEK", nameAr: "DeepSeek", nameEn: "DeepSeek", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["DEEPSEEK_API_KEY"], models: [{ id: "deepseek-chat", labelAr: "DeepSeek Chat" }] },
  { key: "MISTRAL", nameAr: "Mistral AI", nameEn: "Mistral", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["MISTRAL_API_KEY"] },
  { key: "GROK", nameAr: "xAI Grok", nameEn: "Grok", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["XAI_API_KEY"] },
  { key: "PERPLEXITY", nameAr: "Perplexity", nameEn: "Perplexity", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["PERPLEXITY_API_KEY"] },
  { key: "AZURE_OPENAI", nameAr: "Microsoft Azure OpenAI", nameEn: "Azure OpenAI", category: "BRAIN", oauthSupported: false, apiKeySupported: true, requiresEndpoint: true, requiresProjectId: true, developerSetupRequired: true, developerSetupEnv: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"] },
  { key: "BEDROCK", nameAr: "Amazon Bedrock", nameEn: "Bedrock", category: "BRAIN", oauthSupported: false, apiKeySupported: true, requiresOrgId: true, developerSetupRequired: true, developerSetupEnv: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] },
  { key: "OPENROUTER", nameAr: "OpenRouter", nameEn: "OpenRouter", category: "BRAIN", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["OPENROUTER_API_KEY"] },
  { key: "CUSTOM_OPENAI", nameAr: "مزود متوافق مع OpenAI", nameEn: "Custom OpenAI-compatible", category: "BRAIN", oauthSupported: false, apiKeySupported: true, requiresEndpoint: true, developerSetupRequired: false },
];

export const IMAGE_PROVIDERS: ProviderDefinition[] = [
  { key: "OPENAI_IMAGES", nameAr: "OpenAI Images", nameEn: "DALL·E", category: "IMAGE", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["OPENAI_API_KEY"], meta: { sizes: ["1024x1024", "1792x1024"], formats: ["png", "webp"], arabicText: "moderate", commercialUse: "راجع شروط OpenAI" } },
  { key: "GOOGLE_IMAGEN", nameAr: "Google Imagen", nameEn: "Imagen", category: "IMAGE", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["GOOGLE_AI_API_KEY"], meta: { arabicText: "good" } },
  { key: "ADOBE_FIREFLY", nameAr: "Adobe Firefly", nameEn: "Firefly", category: "IMAGE", oauthSupported: true, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["ADOBE_FIREFLY_CLIENT_ID"] },
  { key: "IDEOGRAM", nameAr: "Ideogram", nameEn: "Ideogram", category: "IMAGE", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["IDEOGRAM_API_KEY"], meta: { arabicText: "excellent" } },
  { key: "LEONARDO", nameAr: "Leonardo AI", nameEn: "Leonardo", category: "IMAGE", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["LEONARDO_API_KEY"] },
  { key: "MIDJOURNEY", nameAr: "Midjourney", nameEn: "Midjourney", category: "IMAGE", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["MIDJOURNEY_API_KEY"] },
  { key: "RECRAFT", nameAr: "Recraft", nameEn: "Recraft", category: "IMAGE", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["RECRAFT_API_KEY"] },
  { key: "FLUX", nameAr: "Flux", nameEn: "Flux", category: "IMAGE", oauthSupported: false, apiKeySupported: true, requiresEndpoint: true, developerSetupRequired: true, developerSetupEnv: ["REPLICATE_API_TOKEN"] },
  { key: "REPLICATE_IMAGE", nameAr: "Replicate", nameEn: "Replicate", category: "IMAGE", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["REPLICATE_API_TOKEN"] },
  { key: "CUSTOM_IMAGE", nameAr: "API مخصص لتوليد الصور", nameEn: "Custom Image API", category: "IMAGE", oauthSupported: false, apiKeySupported: true, requiresEndpoint: true, developerSetupRequired: false },
];

export const VIDEO_PROVIDERS: ProviderDefinition[] = [
  { key: "RUNWAY", nameAr: "Runway", nameEn: "Runway", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["RUNWAY_API_KEY"], meta: { duration: "5–10s", resolution: "720p–1080p", arabicSubtitles: true } },
  { key: "KLING", nameAr: "Kling AI", nameEn: "Kling", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["KLING_API_KEY"] },
  { key: "GOOGLE_VEO", nameAr: "Google Veo", nameEn: "Veo", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["GOOGLE_AI_API_KEY"] },
  { key: "LUMA", nameAr: "Luma Dream Machine", nameEn: "Luma", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["LUMA_API_KEY"] },
  { key: "PIKA", nameAr: "Pika", nameEn: "Pika", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["PIKA_API_KEY"] },
  { key: "HAILUO", nameAr: "Hailuo", nameEn: "Hailuo", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["HAILUO_API_KEY"] },
  { key: "HEYGEN", nameAr: "HeyGen", nameEn: "HeyGen", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["HEYGEN_API_KEY"], meta: { avatar: true } },
  { key: "SYNTHESIA", nameAr: "Synthesia", nameEn: "Synthesia", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["SYNTHESIA_API_KEY"], meta: { avatar: true } },
  { key: "OPENAI_VIDEO", nameAr: "OpenAI Video", nameEn: "OpenAI Video", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["OPENAI_API_KEY"], meta: { note: "عند توفره رسميًا" } },
  { key: "REPLICATE_VIDEO", nameAr: "Replicate Video", nameEn: "Replicate", category: "VIDEO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["REPLICATE_API_TOKEN"] },
  { key: "CUSTOM_VIDEO", nameAr: "API مخصص للفيديو", nameEn: "Custom Video API", category: "VIDEO", oauthSupported: false, apiKeySupported: true, requiresEndpoint: true, developerSetupRequired: false },
];

export const AUDIO_PROVIDERS: ProviderDefinition[] = [
  { key: "ELEVENLABS", nameAr: "ElevenLabs", nameEn: "ElevenLabs", category: "AUDIO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["ELEVENLABS_API_KEY"], meta: { arabicVoice: true, englishVoice: true } },
  { key: "OPENAI_AUDIO", nameAr: "OpenAI Audio", nameEn: "OpenAI TTS", category: "AUDIO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["OPENAI_API_KEY"] },
  { key: "GOOGLE_TTS", nameAr: "Google Cloud TTS", nameEn: "Google TTS", category: "AUDIO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["GOOGLE_AI_API_KEY"], meta: { arabicVoice: true } },
  { key: "AZURE_SPEECH", nameAr: "Azure Speech", nameEn: "Azure Speech", category: "AUDIO", oauthSupported: false, apiKeySupported: true, requiresEndpoint: true, developerSetupRequired: true, developerSetupEnv: ["AZURE_SPEECH_KEY"] },
  { key: "AMAZON_POLLY", nameAr: "Amazon Polly", nameEn: "Polly", category: "AUDIO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["AWS_ACCESS_KEY_ID"] },
  { key: "PLAYHT", nameAr: "PlayHT", nameEn: "PlayHT", category: "AUDIO", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["PLAYHT_API_KEY"] },
  { key: "CUSTOM_AUDIO", nameAr: "مزود صوت مخصص", nameEn: "Custom Audio", category: "AUDIO", oauthSupported: false, apiKeySupported: true, requiresEndpoint: true, developerSetupRequired: false },
];

export const COPY_PROVIDERS: ProviderDefinition[] = [
  { key: "OPENAI_COPY", nameAr: "OpenAI", nameEn: "OpenAI", category: "COPY", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["OPENAI_API_KEY"] },
  { key: "CLAUDE_COPY", nameAr: "Claude", nameEn: "Claude", category: "COPY", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["ANTHROPIC_API_KEY"] },
  { key: "GEMINI_COPY", nameAr: "Gemini", nameEn: "Gemini", category: "COPY", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["GOOGLE_AI_API_KEY"] },
  { key: "DEEPSEEK_COPY", nameAr: "DeepSeek", nameEn: "DeepSeek", category: "COPY", oauthSupported: false, apiKeySupported: true, developerSetupRequired: true, developerSetupEnv: ["DEEPSEEK_API_KEY"] },
];

export const ADS_PLATFORMS = [
  { key: "META", labelAr: "Meta Ads", oauthSupported: true },
  { key: "GOOGLE", labelAr: "Google Ads", oauthSupported: true },
  { key: "TIKTOK", labelAr: "TikTok Ads", oauthSupported: true },
  { key: "SNAPCHAT", labelAr: "Snap Ads", oauthSupported: true },
  { key: "X", labelAr: "X Ads", oauthSupported: true },
  { key: "LINKEDIN", labelAr: "LinkedIn Ads", oauthSupported: true },
  { key: "PINTEREST", labelAr: "Pinterest Ads", oauthSupported: true },
  { key: "YOUTUBE", labelAr: "YouTube Ads", oauthSupported: true },
] as const;

export function getProvidersByCategory(category: ProviderCategory): ProviderDefinition[] {
  switch (category) {
    case "BRAIN": return BRAIN_PROVIDERS;
    case "IMAGE": return IMAGE_PROVIDERS;
    case "VIDEO": return VIDEO_PROVIDERS;
    case "AUDIO": return AUDIO_PROVIDERS;
    case "COPY": return COPY_PROVIDERS;
    default: return [];
  }
}

export function getProviderDef(category: ProviderCategory, key: string): ProviderDefinition | undefined {
  return getProvidersByCategory(category).find((p) => p.key === key);
}

export function isDeveloperEnvConfigured(def: ProviderDefinition): boolean {
  if (!def.developerSetupRequired) return true;
  if (!def.developerSetupEnv?.length) return false;
  return def.developerSetupEnv.some((e) => Boolean(process.env[e]?.trim()));
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••••••";
  return `••••${value.slice(-4)}`;
}

export function maskAccountId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.length <= 6) return "••••";
  return `${id.slice(0, 2)}••••${id.slice(-4)}`;
}
