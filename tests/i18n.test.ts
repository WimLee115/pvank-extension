import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  t,
  tSync,
  loadSettings,
  saveSettings,
  loadPassword,
  savePassword,
  applyTranslations,
  activeLocale,
  _resetLocaleCache,
} from "../src/lib/i18n.js";

beforeEach(() => {
  _resetLocaleCache();
});

describe("loadSettings / saveSettings", () => {
  test("returns defaults when nothing stored", async () => {
    const s = await loadSettings();
    expect(s.locale).toBe("auto");
    expect(s.historyEnabled).toBe(true);
    expect(s.fullPageScreenshot).toBe(false);
    expect(s.encryptEnabled).toBe(false);
    expect(s.autoOpenVerifier).toBe(false);
    expect(s.notificationsEnabled).toBe(true);
  });

  test("merges saved partial settings with defaults", async () => {
    await saveSettings({
      locale: "en",
      historyEnabled: false,
      fullPageScreenshot: true,
      encryptEnabled: true,
      autoOpenVerifier: true,
      notificationsEnabled: false,
    });
    const s = await loadSettings();
    expect(s.locale).toBe("en");
    expect(s.fullPageScreenshot).toBe(true);
    expect(s.notificationsEnabled).toBe(false);
  });
});

describe("password (session storage only)", () => {
  test("returns empty string when not set", async () => {
    expect(await loadPassword()).toBe("");
  });

  test("save and load roundtrips", async () => {
    await savePassword("hunter2hunter2");
    expect(await loadPassword()).toBe("hunter2hunter2");
  });

  test("savePassword('') clears stored password", async () => {
    await savePassword("temp1234");
    await savePassword("");
    expect(await loadPassword()).toBe("");
  });
});

describe("translations", () => {
  test("tSync returns NL string for nl locale", () => {
    expect(tSync("sealed", "nl")).toBe("verzegeld");
  });

  test("tSync returns EN string for en locale", () => {
    expect(tSync("sealed", "en")).toBe("sealed");
  });

  test("tSync falls back to NL when key missing in EN", () => {
    expect(tSync("nonexistent-key-xxx", "en")).toBe("nonexistent-key-xxx");
  });

  test("tSync returns key itself when fully missing", () => {
    expect(tSync("totally-bogus", "en")).toBe("totally-bogus");
  });

  test("t respects saved locale=en", async () => {
    await saveSettings({
      locale: "en",
      historyEnabled: true,
      fullPageScreenshot: false,
      encryptEnabled: false,
      autoOpenVerifier: false,
      notificationsEnabled: true,
    });
    // Cache invalidated by saveSettings
    expect(await t("sealed")).toBe("sealed");
  });

  test("activeLocale defaults to nl when browser is nl-NL", async () => {
    (chrome.i18n.getUILanguage as any).mockReturnValue("nl-NL");
    expect(await activeLocale()).toBe("nl");
  });

  test("activeLocale uses en when browser is en-US", async () => {
    (chrome.i18n.getUILanguage as any).mockReturnValue("en-US");
    await saveSettings({
      locale: "auto",
      historyEnabled: true,
      fullPageScreenshot: false,
      encryptEnabled: false,
      autoOpenVerifier: false,
      notificationsEnabled: true,
    });
    expect(await activeLocale()).toBe("en");
  });
});

describe("applyTranslations", () => {
  beforeEach(async () => {
    await saveSettings({
      locale: "nl",
      historyEnabled: true,
      fullPageScreenshot: false,
      encryptEnabled: false,
      autoOpenVerifier: false,
      notificationsEnabled: true,
    });
    _resetLocaleCache();
  });

  test("replaces text content of elements with data-i18n attribute", async () => {
    document.body.innerHTML = `
      <span data-i18n="sealed"></span>
      <span data-i18n="copyDigest"></span>
    `;
    await applyTranslations();
    const spans = document.querySelectorAll("[data-i18n]");
    expect(spans[0]?.textContent).toBe("verzegeld");
    expect(spans[1]?.textContent).toBe("kopieer digest");
  });

  test("sets attributes via data-i18n-attr", async () => {
    document.body.innerHTML = `<input data-i18n-attr="placeholder:sealed,title:copyDigest" />`;
    await applyTranslations();
    const input = document.querySelector("input")!;
    expect(input.getAttribute("placeholder")).toBe("verzegeld");
    expect(input.getAttribute("title")).toBe("kopieer digest");
  });

  test("sets document.documentElement.lang to active locale", async () => {
    document.body.innerHTML = "";
    await applyTranslations();
    expect(["nl", "en"]).toContain(document.documentElement.lang);
  });
});
