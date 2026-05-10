import { applyTranslations, loadSettings, saveSettings, t, type Locale } from "../lib/i18n.js";
import { clearHistory } from "../lib/history.js";

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

const versionEl = $<HTMLSpanElement>("#version");
const historyEnabled = $<HTMLInputElement>("#history-enabled");
const clearBtn = $<HTMLButtonElement>("#clear-history");
const saveBtn = $<HTMLButtonElement>("#save");
const flash = $<HTMLSpanElement>("#saved-flash");

versionEl.textContent = chrome.runtime.getManifest().version;

(async () => {
  const settings = await loadSettings();
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="locale"]')) {
    radio.checked = radio.value === settings.locale;
    radio.addEventListener("change", scheduleLanguagePreview);
  }
  historyEnabled.checked = settings.historyEnabled;
  await applyTranslations();
})();

async function scheduleLanguagePreview(): Promise<void> {
  const selected = document.querySelector<HTMLInputElement>('input[name="locale"]:checked')?.value as Locale | "auto" | undefined;
  if (!selected) return;
  await saveSettings({
    locale: selected,
    historyEnabled: historyEnabled.checked,
  });
  await applyTranslations();
}

saveBtn.addEventListener("click", async () => {
  const selected = document.querySelector<HTMLInputElement>('input[name="locale"]:checked')?.value as Locale | "auto" | undefined;
  await saveSettings({
    locale: selected ?? "auto",
    historyEnabled: historyEnabled.checked,
  });
  flash.textContent = await t("optSaved");
  flash.classList.add("show");
  setTimeout(() => flash.classList.remove("show"), 1400);
});

clearBtn.addEventListener("click", async () => {
  await clearHistory();
  flash.textContent = "✓";
  flash.classList.add("show");
  setTimeout(() => flash.classList.remove("show"), 1000);
});
