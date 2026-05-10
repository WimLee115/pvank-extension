export type Locale = "nl" | "en";

const dict: Record<string, Record<Locale, string>> = {
  // Header
  tagline: { nl: "verankerd in tijd", en: "anchored in time" },
  subtitle: { nl: "cryptografisch bewijs · SHA-256 · OpenTimestamps · Bitcoin", en: "cryptographic proof · SHA-256 · OpenTimestamps · Bitcoin" },

  // Page card
  thisPage: { nl: "deze pagina", en: "this page" },
  noActiveTab: { nl: "geen actieve pagina gevonden.", en: "no active page found." },
  onlyHttps: { nl: "alleen http(s)-pagina's kunnen verzegeld worden.", en: "only http(s) pages can be sealed." },
  secure: { nl: "TLS", en: "TLS" },
  insecure: { nl: "geen TLS", en: "no TLS" },

  // Action
  sealAction: { nl: "▒▒ ANKER NEERLATEN ▒▒", en: "▒▒ DROP ANCHOR ▒▒" },

  // Steps
  "step.dom-grab": { nl: "HTML grijpen…", en: "grabbing HTML…" },
  "step.screenshot": { nl: "screenshot maken…", en: "taking screenshot…" },
  "step.manifest": { nl: "hashes berekenen…", en: "computing hashes…" },
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

  // History
  recentSeals: { nl: "recente bewijzen", en: "recent proofs" },
  noHistory: { nl: "nog geen bewijzen.", en: "no proofs yet." },
  clearHistory: { nl: "wis geschiedenis", en: "clear history" },

  // Errors
  errFailed: { nl: "verzegelen mislukt", en: "sealing failed" },
  errNoTab: { nl: "geen actieve pagina.", en: "no active page." },

  // Footer
  history: { nl: "geschiedenis", en: "history" },
  settings: { nl: "instellingen", en: "settings" },
  about: { nl: "over", en: "about" },

  // Options page
  optTitle: { nl: "PVANK · instellingen", en: "PVANK · settings" },
  optLanguage: { nl: "taal", en: "language" },
  optLanguageNL: { nl: "Nederlands", en: "Dutch" },
  optLanguageEN: { nl: "Engels", en: "English" },
  optLanguageAuto: { nl: "automatisch (browser)", en: "automatic (browser)" },
  optCalendars: { nl: "OpenTimestamps-calendars", en: "OpenTimestamps calendars" },
  optCalendarsHint: {
    nl: "fallback-volgorde — eerste die antwoordt wint.",
    en: "fallback order — first to respond wins.",
  },
  optHistory: { nl: "geschiedenis", en: "history" },
  optHistoryEnabled: { nl: "bewaar laatste 20 bewijzen lokaal", en: "store last 20 proofs locally" },
  optHistoryHint: {
    nl: "alleen metadata: URL, tijdstempel, manifest-digest. Bestanden zelf niet.",
    en: "metadata only: URL, timestamp, manifest digest. Not the files themselves.",
  },
  optAbout: { nl: "over", en: "about" },
  optSave: { nl: "opslaan", en: "save" },
  optSaved: { nl: "opgeslagen ✓", en: "saved ✓" },
};

const SETTINGS_KEY = "pvank.settings";

export interface Settings {
  locale: Locale | "auto";
  historyEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  locale: "auto",
  historyEnabled: true,
};

let cachedLocale: Locale | null = null;

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
  cachedLocale =
    s.locale === "auto"
      ? detectBrowserLocale()
      : s.locale;
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
