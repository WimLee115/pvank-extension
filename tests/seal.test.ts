import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { sealActiveTab } from "../src/lib/seal.js";
import { saveSettings, savePassword } from "../src/lib/i18n.js";
import { loadHistory } from "../src/lib/history.js";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DATA_URL = `data:image/png;base64,${btoa(String.fromCharCode(...PNG_BYTES))}`;
const VERIFY_HTML = "<html>verifier</html>";

const SAMPLE_DOM = {
  url: "https://example.com/",
  finalUrl: "https://example.com/",
  title: "Example",
  html: "<html></html>",
  capturedAt: "2026-05-10T19:00:00.000Z",
  userAgent: "TestUA",
  viewport: { width: 1024, height: 768, devicePixelRatio: 1 },
  language: "nl",
  referrer: "",
};

let originalFetch: typeof fetch;
let originalCreateUrl: typeof URL.createObjectURL;
let originalRevokeUrl: typeof URL.revokeObjectURL;
let originalCreateElement: typeof document.createElement;
let createdAnchors: HTMLAnchorElement[];

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalCreateUrl = URL.createObjectURL;
  originalRevokeUrl = URL.revokeObjectURL;
  originalCreateElement = document.createElement;

  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url);
    if (u.includes("verify.html")) return new Response(VERIFY_HTML);
    if (u.includes("opentimestamps.org")) return new Response(new Uint8Array([0xab, 0xcd]).buffer.slice(0));
    return new Response("");
  }) as any;

  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();

  createdAnchors = [];
  document.createElement = ((tag: string) => {
    const el = originalCreateElement.call(document, tag) as any;
    if (tag === "a") {
      el.click = vi.fn();
      createdAnchors.push(el);
    }
    return el;
  }) as any;

  (chrome.tabs.query as any).mockResolvedValue([{ id: 7, windowId: 1, url: "https://example.com/" }]);
  (chrome.scripting.executeScript as any).mockResolvedValue([{}]);
  (chrome.tabs.sendMessage as any).mockImplementation((_id: number, msg: any, cb: (r: any) => void) => {
    if (msg.type === "capture-dom") cb({ type: "capture-dom:result", payload: SAMPLE_DOM });
    else if (msg.type === "page-dimensions") cb({ type: "page-dimensions:result", payload: { totalHeight: 800, viewportHeight: 800, viewportWidth: 1024, devicePixelRatio: 1 } });
    else if (msg.type === "scroll-to") cb({ type: "scroll-to:result", actualY: msg.y });
    else if (msg.type === "set-fixed-display") cb({ type: "set-fixed-display:result" });
    else cb({});
  });
  (chrome.tabs.captureVisibleTab as any).mockResolvedValue(PNG_DATA_URL);

  // OffscreenCanvas mock for full-page path
  (globalThis as any).OffscreenCanvas = class {
    constructor(public width: number, public height: number) {}
    getContext() { return { drawImage: vi.fn() }; }
    async convertToBlob() { return new Blob([PNG_BYTES as unknown as BlobPart], { type: "image/png" }); }
  };
  (globalThis as any).createImageBitmap = vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() }));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  URL.createObjectURL = originalCreateUrl;
  URL.revokeObjectURL = originalRevokeUrl;
  document.createElement = originalCreateElement;
});

describe("sealActiveTab — happy path", () => {
  test("seals a page and returns digest+filename+host", async () => {
    const progress = vi.fn();
    const result = await sealActiveTab(progress);

    expect(result.host).toBe("example.com");
    expect(result.filename).toMatch(/^pvank-bewijs_example\.com_.*\.zip$/);
    expect(result.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(result.encrypted).toBe(false);
    expect(result.hasOts).toBe(true);
    expect(progress).toHaveBeenCalled();
    expect(progress).toHaveBeenLastCalledWith("done", 100);
  });

  test("triggers download via anchor click", async () => {
    await sealActiveTab(() => {});
    expect(createdAnchors.length).toBeGreaterThan(0);
    const anchor = createdAnchors[0]!;
    expect(anchor.download).toMatch(/^pvank-bewijs_/);
    expect((anchor.click as any).mock.calls.length).toBe(1);
  });

  test("records history when historyEnabled (default)", async () => {
    await sealActiveTab(() => {});
    const history = await loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.host).toBe("example.com");
  });

  test("does NOT record history when disabled", async () => {
    await saveSettings({
      locale: "auto",
      historyEnabled: false,
      fullPageScreenshot: false,
      encryptEnabled: false,
      autoOpenVerifier: false,
      notificationsEnabled: false,
    });
    await sealActiveTab(() => {});
    expect(await loadHistory()).toEqual([]);
  });

  test("OTS failure does not prevent seal (graceful degrade)", async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes("opentimestamps.org")) throw new Error("net down");
      return new Response(VERIFY_HTML);
    }) as any;
    const result = await sealActiveTab(() => {});
    expect(result.hasOts).toBe(false);
  });
});

describe("sealActiveTab — encryption", () => {
  test("output filename ends with .pvenc when encrypted", async () => {
    await saveSettings({
      locale: "auto",
      historyEnabled: true,
      fullPageScreenshot: false,
      encryptEnabled: true,
      autoOpenVerifier: false,
      notificationsEnabled: false,
    });
    await savePassword("test-password-strong");

    const result = await sealActiveTab(() => {});
    expect(result.encrypted).toBe(true);
    expect(result.filename).toMatch(/\.pvenc$/);
  });

  test("throws when encryption is on but no password", async () => {
    await saveSettings({
      locale: "auto",
      historyEnabled: true,
      fullPageScreenshot: false,
      encryptEnabled: true,
      autoOpenVerifier: false,
      notificationsEnabled: false,
    });
    await savePassword("");
    await expect(sealActiveTab(() => {})).rejects.toThrow(/no password/);
  });

  test("throws when password too short", async () => {
    await saveSettings({
      locale: "auto",
      historyEnabled: true,
      fullPageScreenshot: false,
      encryptEnabled: true,
      autoOpenVerifier: false,
      notificationsEnabled: false,
    });
    await savePassword("short");
    await expect(sealActiveTab(() => {})).rejects.toThrow(/at least 8/);
  });
});

describe("sealActiveTab — guards", () => {
  test("rejects when no active tab", async () => {
    (chrome.tabs.query as any).mockResolvedValue([]);
    await expect(sealActiveTab(() => {})).rejects.toThrow(/no active tab/);
  });

  test("rejects non-http(s) URLs", async () => {
    (chrome.tabs.query as any).mockResolvedValue([{ id: 7, windowId: 1, url: "chrome://settings" }]);
    await expect(sealActiveTab(() => {})).rejects.toThrow(/http\(s\)/);
  });

  test("rejects when DOM grab returns error", async () => {
    (chrome.tabs.sendMessage as any).mockImplementation((_id: number, msg: any, cb: (r: any) => void) => {
      if (msg.type === "capture-dom") cb({ type: "error", message: "blocked by CSP" });
      else cb({});
    });
    await expect(sealActiveTab(() => {})).rejects.toThrow(/blocked by CSP/);
  });
});

describe("sealActiveTab — full-page screenshot", () => {
  test("uses fullpage step when settings.fullPageScreenshot=true", async () => {
    await saveSettings({
      locale: "auto",
      historyEnabled: true,
      fullPageScreenshot: true,
      encryptEnabled: false,
      autoOpenVerifier: false,
      notificationsEnabled: false,
    });

    const progress = vi.fn();
    await sealActiveTab(progress);

    const steps = progress.mock.calls.map((c) => c[0]);
    expect(steps).toContain("fullpage");
  });
});
