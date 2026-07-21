export const PLATFORM_BRAIN_PROVIDER_KEYS = [
  "OPENAI",
  "GEMINI",
  "CLAUDE",
  "DEEPSEEK",
  "GROK",
  "MISTRAL",
] as const;

export type PlatformBrainProviderKey = (typeof PLATFORM_BRAIN_PROVIDER_KEYS)[number];

export const PLATFORM_BRAIN_PROVIDERS: Record<
  PlatformBrainProviderKey,
  {
    nameAr: string;
    defaultModel: string;
    models: { id: string; labelAr: string }[];
    keyCreateUrl: string;
  }
> = {
  OPENAI: {
    nameAr: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", labelAr: "GPT-4o Mini" },
      { id: "gpt-4o", labelAr: "GPT-4o" },
    ],
    keyCreateUrl: "https://platform.openai.com/api-keys",
  },
  GEMINI: {
    nameAr: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    models: [
      { id: "gemini-1.5-flash", labelAr: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", labelAr: "Gemini 1.5 Pro" },
    ],
    keyCreateUrl: "https://aistudio.google.com/apikey",
  },
  CLAUDE: {
    nameAr: "Anthropic Claude",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      { id: "claude-3-5-sonnet-20241022", labelAr: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", labelAr: "Claude 3.5 Haiku" },
    ],
    keyCreateUrl: "https://console.anthropic.com/settings/keys",
  },
  DEEPSEEK: {
    nameAr: "DeepSeek",
    defaultModel: "deepseek-chat",
    models: [{ id: "deepseek-chat", labelAr: "DeepSeek Chat" }],
    keyCreateUrl: "https://platform.deepseek.com/api_keys",
  },
  GROK: {
    nameAr: "xAI Grok",
    defaultModel: "grok-2-latest",
    models: [
      { id: "grok-2-latest", labelAr: "Grok 2" },
      { id: "grok-beta", labelAr: "Grok Beta" },
    ],
    keyCreateUrl: "https://console.x.ai/",
  },
  MISTRAL: {
    nameAr: "Mistral AI",
    defaultModel: "mistral-small-latest",
    models: [
      { id: "mistral-small-latest", labelAr: "Mistral Small" },
      { id: "mistral-large-latest", labelAr: "Mistral Large" },
    ],
    keyCreateUrl: "https://console.mistral.ai/api-keys/",
  },
};

export const PLATFORM_BRAIN_ROLES = [
  { id: "MARKETING_MANAGER", labelAr: "مدير التسويق" },
  { id: "DATA_ANALYST", labelAr: "محلل البيانات" },
  { id: "AD_COPYWRITER", labelAr: "كاتب الإعلانات" },
  { id: "MENU_OS_ASSISTANT", labelAr: "مساعد Menu OS" },
  { id: "PLATFORM_ENGINEER", labelAr: "مهندس المنصة الذكي" },
] as const;

export type PlatformBrainRoleId = (typeof PLATFORM_BRAIN_ROLES)[number]["id"];
