import { describe, expect, test, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import { buildZip, downloadBlob } from "../src/lib/bundle.js";

describe("buildZip", () => {
  test("creates a valid ZIP from text and bytes", async () => {
    const blob = await buildZip([
      { path: "a.txt", data: "hello" },
      { path: "b.bin", data: new Uint8Array([1, 2, 3]) },
    ]);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(["a.txt", "b.bin"]);
    expect(await zip.file("a.txt")!.async("string")).toBe("hello");
    const bin = await zip.file("b.bin")!.async("uint8array");
    expect(Array.from(bin)).toEqual([1, 2, 3]);
  });

  test("empty entries produces an empty ZIP", async () => {
    const blob = await buildZip([]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files)).toEqual([]);
  });
});

describe("downloadBlob", () => {
  let createdAnchor: HTMLAnchorElement | null = null;
  let revokedUrls: string[];
  let createdUrl: string;

  beforeEach(() => {
    revokedUrls = [];
    createdUrl = "blob:mock-url-123";
    URL.createObjectURL = vi.fn(() => createdUrl);
    URL.revokeObjectURL = vi.fn((u: string) => { revokedUrls.push(u); });

    createdAnchor = null;
    const realCreate = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      const el = realCreate(tag) as any;
      if (tag === "a") {
        createdAnchor = el;
        el.click = vi.fn();
      }
      return el;
    }) as any;
  });

  test("creates an anchor with download attribute and clicks it", () => {
    const blob = new Blob(["x"]);
    downloadBlob(blob, "out.zip");
    expect(createdAnchor).not.toBeNull();
    expect(createdAnchor!.href).toContain("mock-url-123");
    expect(createdAnchor!.download).toBe("out.zip");
    expect((createdAnchor!.click as any).mock.calls.length).toBe(1);
  });

  test("revokes the object URL after timeout", async () => {
    vi.useFakeTimers();
    try {
      const blob = new Blob(["x"]);
      downloadBlob(blob, "out.zip");
      expect(revokedUrls).toEqual([]);
      vi.advanceTimersByTime(60_001);
      expect(revokedUrls).toContain(createdUrl);
    } finally {
      vi.useRealTimers();
    }
  });
});
