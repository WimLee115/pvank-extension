export type Locale = "nl" | "en";

const dict: Record<string, Record<Locale, string>> = {
  // Header
  tagline: { nl: "verankerd in tijd", en: "anchored in time" },
  signedBy: { nl: "met de groeten van WimLee115", en: "regards from WimLee115" },

  // Page card
  thisPage: { nl: "deze pagina", en: "this page" },
  noActiveTab: { nl: "geen actieve pagina gevonden.", en: "no active page found." },
  onlyHttps: { nl: "alleen http(s)-pagina's kunnen verzegeld worden.", en: "only http(s) pages can be sealed." },
  secure: { nl: "TLS", en: "TLS" },
  insecure: { nl: "geen TLS", en: "no TLS" },

  // Action
  sealAction: { nl: "▒▒ ANKER NEERLATEN ▒▒", en: "▒▒ DROP ANCHOR ▒▒" },
  shortcutHint: { nl: "Ctrl+Shift+P", en: "Ctrl+Shift+P" },

  // Steps
  "step.dom-grab": { nl: "HTML grijpen…", en: "grabbing HTML…" },
  "step.screenshot": { nl: "screenshot maken…", en: "taking screenshot…" },
  "step.fullpage": { nl: "volledige pagina vastleggen…", en: "capturing full page…" },
  "step.manifest": { nl: "hashes berekenen…", en: "computing hashes…" },
  "step.encrypt": { nl: "versleutelen met AES-256…", en: "encrypting with AES-256…" },
  "step.ots": { nl: "verankeren in Bitcoin (OpenTimestamps)…", en: "anchoring to Bitcoin (OpenTimestamps)…" },
  "step.bundle": { nl: "bewijs inpakken…", en: "packaging proof…" },
  "step.done": { nl: "klaar", en: "done" },

  // Result
  sealed: { nl: "verzegeld", en: "sealed" },
  manifestDigest: { nl: "manifest-digest", en: "manifest digest" },
  copyDigest: { nl: "kopieer digest", en: "copy digest" },
  copied: { nl: "gekopieerd", en: "copied" },
  openVerifier: { nl: "open verifier", en: "open verifier" },
  showInFolder: { nl: "toon in map", en: "show in folder" },

  // Notifications
  notifTitle: { nl: "PVANK · verzegeld", en: "PVANK · sealed" },
  notifBody: { nl: "{host} is verankerd in tijd.", en: "{host} has been anchored in time." },

  // History
  recentSeals: { nl: "recente bewijzen", en: "recent proofs" },
  noHistory: { nl: "nog geen bewijzen.", en: "no proofs yet." },
  clearHistory: { nl: "wis geschiedenis", en: "clear history" },

  // Errors
  errFailed: { nl: "verzegelen mislukt", en: "sealing failed" },
  errNoTab: { nl: "geen actieve pagina.", en: "no active page." },
  errNoPassword: { nl: "encryptie aan, maar geen wachtwoord ingesteld.", en: "encryption is on but no password is set." },
  errPwTooShort: { nl: "wachtwoord moet minstens 8 tekens zijn.", en: "password must be at least 8 characters." },

  // Footer
  history: { nl: "geschiedenis", en: "history" },
  settings: { nl: "instellingen", en: "settings" },
  about: { nl: "over", en: "about" },
  shortcut: { nl: "sneltoets", en: "shortcut" },

  // Options page
  optTitle: { nl: "instellingen", en: "settings" },
  optLanguage: { nl: "taal", en: "language" },
  optLanguageNL: { nl: "Nederlands", en: "Dutch" },
  optLanguageEN: { nl: "Engels", en: "English" },
  optLanguageAuto: { nl: "automatisch (browser)", en: "automatic (browser)" },
  optScreenshot: { nl: "screenshot", en: "screenshot" },
  optScreenshotMode: { nl: "modus", en: "mode" },
  optScreenshotViewport: { nl: "alleen zichtbare deel", en: "visible viewport only" },
  optScreenshotFull: { nl: "volledige pagina (scroll & stitch)", en: "full page (scroll & stitch)" },
  optScreenshotHint: {
    nl: "full-page is langzamer en kan op pagina's met sticky-headers of lazy-loading artefacten geven.",
    en: "full-page is slower and may produce artefacts on pages with sticky headers or lazy-loading.",
  },
  optEncrypt: { nl: "encryptie", en: "encryption" },
  optEncryptEnabled: { nl: "versleutel het bewijs met wachtwoord (AES-256-GCM)", en: "encrypt the proof with a password (AES-256-GCM)" },
  optEncryptHint: {
    nl: "outputbestand wordt .pvenc i.p.v. .zip — open met decrypt.html (in elke browser).",
    en: "output file becomes .pvenc instead of .zip — open with decrypt.html (in any browser).",
  },
  optEncryptPassword: { nl: "wachtwoord", en: "password" },
  optEncryptPasswordHint: {
    nl: "≥8 tekens. Wordt nooit opgeslagen — vergeten = bewijs verloren.",
    en: "≥8 chars. Never stored — forgotten = evidence lost.",
  },
  optAutoVerify: { nl: "automatisch verifier openen", en: "automatically open verifier" },
  optAutoVerifyHint: {
    nl: "open verify.html in een nieuwe tab direct na verzegelen, met bestanden alvast geladen.",
    en: "open verify.html in a new tab right after sealing, with files preloaded.",
  },
  optNotifications: { nl: "notificaties", en: "notifications" },
  optNotificationsEnabled: { nl: "browser-notificatie tonen na verzegelen", en: "show browser notification after sealing" },
  optHistory: { nl: "geschiedenis", en: "history" },
  optHistoryEnabled: { nl: "bewaar laatste 20 bewijzen lokaal", en: "store last 20 proofs locally" },
  optHistoryHint: {
    nl: "alleen metadata: URL, tijdstempel, manifest-digest. Bestanden zelf niet.",
    en: "metadata only: URL, timestamp, manifest digest. Not the files themselves.",
  },
  optAbout: { nl: "over", en: "about" },
  optShortcut: { nl: "sneltoets", en: "shortcut" },
  optShortcutHint: {
    nl: "Aanpasbaar via chrome://extensions/shortcuts (Chromium) of about:addons (Firefox).",
    en: "Customisable via chrome://extensions/shortcuts (Chromium) or about:addons (Firefox).",
  },
  optSave: { nl: "opslaan", en: "save" },
  optSaved: { nl: "opgeslagen ✓", en: "saved ✓" },
};

const SETTINGS_KEY = "pvank.settings";

export interface Settings {
  locale: Locale | "auto";
  historyEnabled: boolean;
  fullPageScreenshot: boolean;
  encryptEnabled: boolean;
  autoOpenVerifier: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  locale: "auto",
  historyEnabled: true,
  fullPageScreenshot: false,
  encryptEnabled: false,
  autoOpenVerifier: false,
  notificationsEnabled: true,
};

const PASSWORD_KEY = "pvank.password";

export async function loadPassword(): Promise<string> {
  const stored = await chrome.storage.session.get(PASSWORD_KEY);
  return (stored[PASSWORD_KEY] as string) ?? "";
}

export async function savePassword(pw: string): Promise<void> {
  if (pw) await chrome.storage.session.set({ [PASSWORD_KEY]: pw });
  else await chrome.storage.session.remove(PASSWORD_KEY);
}

let cachedLocale: Locale | null = null;

export function _resetLocaleCache(): void {
  cachedLocale = null;
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...((stored[SETTINGS_KEY] as Partial<Settings>) ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: s });
  cachedLocale = null;
}

export async function activeLocale(): Promise<Locale> {
  if (cachedLocale) return cachedLocale;
  const s = await loadSettings();
  cachedLocale = s.locale === "auto" ? detectBrowserLocale() : s.locale;
  return cachedLocale;
}

function detectBrowserLocale(): Locale {
  const ui = (chrome.i18n?.getUILanguage?.() ?? navigator.language ?? "nl").toLowerCase();
  return ui.startsWith("nl") ? "nl" : "en";
}

export async function t(key: string): Promise<string> {
  const lang = await activeLocale();
  return dict[key]?.[lang] ?? dict[key]?.["nl"] ?? key;
}

export function tSync(key: string, locale: Locale): string {
  return dict[key]?.[locale] ?? dict[key]?.["nl"] ?? key;
}

export async function applyTranslations(root: ParentNode = document): Promise<void> {
  const lang = await activeLocale();
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset["i18n"];
    if (!key) continue;
    el.textContent = tSync(key, lang);
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-attr]")) {
    const spec = el.dataset["i18nAttr"];
    if (!spec) continue;
    for (const pair of spec.split(",")) {
      const [attr, key] = pair.split(":").map((x) => x.trim());
      if (!attr || !key) continue;
      el.setAttribute(attr, tSync(key, lang));
    }
  }
  document.documentElement.lang = lang;
}
