import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  captureVisibleScreenshot,
  captureFullPageScreenshot,
  buildHeadersJson,
} from "../src/lib/capture.js";

describe("captureVisibleScreenshot", () => {
  test("decodes base64 PNG from data URL", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const b64 = btoa(String.fromCharCode(...png));
    (chrome.tabs.captureVisibleTab as any).mockResolvedValue(`data:image/png;base64,${b64}`);

    const bytes = await captureVisibleScreenshot(1);
    expect(Array.from(bytes)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  test("throws on missing data", async () => {
    (chrome.tabs.captureVisibleTab as any).mockResolvedValue("data:image/png;base64,");
    await expect(captureVisibleScreenshot(1)).rejects.toThrow(/no data/);
  });
});

describe("buildHeadersJson", () => {
  test("includes URL, title, capturedAt, viewport", () => {
    const bytes = buildHeadersJson(
      "https://example.com/",
      "https://example.com/final",
      "Title",
      "2026-05-10T10:00:00Z",
      { viewport: { width: 100, height: 200 } },
    );
    const json = JSON.parse(new TextDecoder().decode(bytes));
    expect(json.url).toBe("https://example.com/");
    expect(json.finalUrl).toBe("https://example.com/final");
    expect(json.title).toBe("Title");
    expect(json.capturedAt).toBe("2026-05-10T10:00:00Z");
    expect(json.viewport.width).toBe(100);
    expect(json.note).toBeTruthy();
  });

  test("output ends with newline", () => {
    const bytes = buildHeadersJson("u", "u", "t", "ts");
    expect(new TextDecoder().decode(bytes).endsWith("\n")).toBe(true);
  });
});

describe("captureFullPageScreenshot", () => {
  beforeEach(() => {
    // Mock OffscreenCanvas
    (globalThis as any).OffscreenCanvas = class {
      width: number;
      height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() {
        return {
          drawImage: vi.fn(),
        };
      }
      async convertToBlob() {
        return new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xde, 0xad])], { type: "image/png" });
      }
    };
    (globalThis as any).createImageBitmap = vi.fn(async () => ({
      width: 100,
      height: 100,
      close: vi.fn(),
    }));
  });

  test("queries page dimensions then captures multiple positions", async () => {
    const dims = { totalHeight: 2000, viewportHeight: 800, viewportWidth: 1280, devicePixelRatio: 1 };

    (chrome.tabs.sendMessage as any).mockImplementation((_id: number, msg: any, cb: (r: any) => void) => {
      if (msg.type === "page-dimensions") cb({ type: "page-dimensions:result", payload: dims });
      else if (msg.type === "scroll-to") cb({ type: "scroll-to:result", actualY: msg.y });
      else if (msg.type === "set-fixed-display") cb({ type: "set-fixed-display:result" });
      else cb({});
    });

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const dataUrl = `data:image/png;base64,${btoa(String.fromCharCode(...png))}`;
    (chrome.tabs.captureVisibleTab as any).mockResolvedValue(dataUrl);

    const progress = vi.fn();
    const result = await captureFullPageScreenshot(1, 2, progress);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // 3 captures expected: 0, 800, 1200 (final = 2000-800)
    expect((chrome.tabs.captureVisibleTab as any).mock.calls.length).toBe(3);
    expect(progress).toHaveBeenCalledTimes(3);
    expect(progress).toHaveBeenLastCalledWith({ current: 3, total: 3 });
  }, 15_000);

  test("captures one frame when page fits in viewport", async () => {
    const dims = { totalHeight: 600, viewportHeight: 800, viewportWidth: 1280, devicePixelRatio: 1 };

    (chrome.tabs.sendMessage as any).mockImplementation((_id: number, msg: any, cb: (r: any) => void) => {
      if (msg.type === "page-dimensions") cb({ type: "page-dimensions:result", payload: dims });
      else if (msg.type === "scroll-to") cb({ type: "scroll-to:result", actualY: msg.y });
      else if (msg.type === "set-fixed-display") cb({ type: "set-fixed-display:result" });
      else cb({});
    });

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const dataUrl = `data:image/png;base64,${btoa(String.fromCharCode(...png))}`;
    (chrome.tabs.captureVisibleTab as any).mockResolvedValue(dataUrl);

    const result = await captureFullPageScreenshot(1, 2);
    expect(result).toBeInstanceOf(Uint8Array);
    expect((chrome.tabs.captureVisibleTab as any).mock.calls.length).toBe(1);
  });

  test("rejects when sendMessage errors", async () => {
    (chrome.tabs.sendMessage as any).mockImplementation((_id: number, _msg: any, cb: (r: any) => void) => {
      (chrome.runtime as any).lastError = { message: "boom" };
      cb(undefined);
    });
    await expect(captureFullPageScreenshot(1, 2)).rejects.toThrow(/boom/);
  });
});
