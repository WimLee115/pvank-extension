import { tSync, loadSettings, type Locale } from "./lib/i18n.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pvank-seal",
    title: "Verzegel deze pagina (PVANK)",
    contexts: ["page", "frame"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "pvank-seal") return;
  void chrome.action.openPopup().catch((err) => {
    console.warn("[pvank] openPopup not supported here:", err);
  });
});

chrome.commands?.onCommand.addListener((command) => {
  if (command !== "seal-page") return;
  void chrome.action.openPopup().catch((err) => {
    console.warn("[pvank] keyboard shortcut: openPopup failed:", err);
  });
});

chrome.runtime.onMessage.addListener((msg: any) => {
  if (msg?.type === "pvank-notify") {
    void notifySealed(msg.host, msg.filename);
  }
  return false;
});

async function notifySealed(host: string, filename: string): Promise<void> {
  try {
    const settings = await loadSettings();
    const locale: Locale = settings.locale === "auto"
      ? (chrome.i18n.getUILanguage().toLowerCase().startsWith("nl") ? "nl" : "en")
      : settings.locale;
    const title = tSync("notifTitle", locale);
    const body = tSync("notifBody", locale).replace("{host}", host);
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title,
      message: `${body}\n${filename}`,
      priority: 0,
    });
  } catch (err) {
    console.warn("[pvank] notification failed:", err);
  }
}
