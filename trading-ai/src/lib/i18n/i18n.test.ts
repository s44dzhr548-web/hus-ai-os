import { describe, expect, it } from "vitest";
import { translations, getDir, DEFAULT_LOCALE } from "@/lib/i18n/translations";

describe("i18n bilingual support", () => {
  it("defaults to Arabic", () => {
    expect(DEFAULT_LOCALE).toBe("ar");
  });

  it("has matching en/ar keys for new modules", () => {
    expect(translations.en.autoBot.title).toBeTruthy();
    expect(translations.ar.autoBot.title).toBeTruthy();
    expect(translations.en.riskGuardian.title).toBeTruthy();
    expect(translations.ar.aiDebate.title).toBeTruthy();
  });

  it("sets RTL for Arabic and LTR for English", () => {
    expect(getDir("ar")).toBe("rtl");
    expect(getDir("en")).toBe("ltr");
  });
});
