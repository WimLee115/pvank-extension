import { vi, beforeEach } from "vitest";

interface StorageArea {
  get: (key?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (key: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
}

const storage = {
  sync: new Map<string, unknown>(),
  local: new Map<string, unknown>(),
  session: new Map<string, unknown>(),
};

function mkStorage(area: keyof typeof storage): StorageArea {
  const map = storage[area];
  return {
    get: async (key?: string | string[] | null) => {
      if (key == null) return Object.fromEntries(map.entries());
      if (typeof key === "string") return map.has(key) ? { [key]: map.get(key) } : {};
      const result: Record<string, unknown> = {};
      for (const k of key) if (map.has(k)) result[k] = map.get(k);
      return result;
    },
    set: async (items: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(items)) map.set(k, v);
    },
    remove: async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      for (const k of keys) map.delete(k);
    },
    clear: async () => map.clear(),
  };
}

(globalThis as any).chrome = {
  storage: {
    sync: mkStorage("sync"),
    local: mkStorage("local"),
    session: mkStorage("session"),
  },
  i18n: {
    getUILanguage: vi.fn(() => "nl-NL"),
  },
  runtime: {
    id: "test-extension-id",
    getManifest: vi.fn(() => ({ version: "0.3.0" })),
    getURL: vi.fn((p: string) => `chrome-extension://test/${p}`),
    sendMessage: vi.fn(async () => undefined),
    lastError: undefined,
  },
  tabs: {
    query: vi.fn(),
    captureVisibleTab: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
  action: {
    openPopup: vi.fn(),
  },
  downloads: {
    download: vi.fn(),
  },
};

beforeEach(() => {
  storage.sync.clear();
  storage.local.clear();
  storage.session.clear();
  vi.clearAllMocks();
  (globalThis as any).chrome.runtime.lastError = undefined;
});

export const __storage__ = storage;
