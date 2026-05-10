import { applyTranslations, loadSettings, saveSettings, t, savePassword, loadPassword, type Locale } from "../lib/i18n.js";
import { clearHistory } from "../lib/history.js";

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

const versionEl = $<HTMLSpanElement>("#version");
const historyEnabled = $<HTMLInputElement>("#history-enabled");
const encryptEnabled = $<HTMLInputElement>("#encrypt-enabled");
const passwordInput = $<HTMLInputElement>("#password");
const pwRow = $<HTMLElement>("#pw-row");
const autoVerify = $<HTMLInputElement>("#auto-verify");
const notifEnabled = $<HTMLInputElement>("#notif-enabled");
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
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="ssMode"]')) {
    radio.checked = radio.value === (settings.fullPageScreenshot ? "full" : "viewport");
  }
  historyEnabled.checked = settings.historyEnabled;
  encryptEnabled.checked = settings.encryptEnabled;
  autoVerify.checked = settings.autoOpenVerifier;
  notifEnabled.checked = settings.notificationsEnabled;
  pwRow.hidden = !settings.encryptEnabled;
  passwordInput.value = await loadPassword();
  await applyTranslations();
})();

encryptEnabled.addEventListener("change", () => {
  pwRow.hidden = !encryptEnabled.checked;
});

async function scheduleLanguagePreview(): Promise<void> {
  const selected = document.querySelector<HTMLInputElement>('input[name="locale"]:checked')?.value as Locale | "auto" | undefined;
  if (!selected) return;
  await saveSettings({
    ...(await loadSettings()),
    locale: selected,
  });
  await applyTranslations();
}

saveBtn.addEventListener("click", async () => {
  const locale = (document.querySelector<HTMLInputElement>('input[name="locale"]:checked')?.value as Locale | "auto" | undefined) ?? "auto";
  const ssMode = document.querySelector<HTMLInputElement>('input[name="ssMode"]:checked')?.value;
  const enc = encryptEnabled.checked;
  const pw = passwordInput.value;

  if (enc && pw.length > 0 && pw.length < 8) {
    flash.textContent = await t("errPwTooShort");
    flash.style.color = "var(--err)";
    flash.classList.add("show");
    setTimeout(() => { flash.classList.remove("show"); flash.style.color = ""; }, 2000);
    return;
  }

  await saveSettings({
    locale,
    historyEnabled: historyEnabled.checked,
    fullPageScreenshot: ssMode === "full",
    encryptEnabled: enc,
    autoOpenVerifier: autoVerify.checked,
    notificationsEnabled: notifEnabled.checked,
  });
  await savePassword(enc ? pw : "");

  flash.textContent = await t("optSaved");
  flash.style.color = "";
  flash.classList.add("show");
  setTimeout(() => flash.classList.remove("show"), 1400);
});

clearBtn.addEventListener("click", async () => {
  await clearHistory();
  flash.textContent = "✓";
  flash.classList.add("show");
  setTimeout(() => flash.classList.remove("show"), 1000);
});
