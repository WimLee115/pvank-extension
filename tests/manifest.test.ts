import { describe, expect, test } from "vitest";
import { buildManifest, type ManifestFiles } from "../src/lib/manifest.js";
import type { CapturePayload } from "../src/lib/types.js";
import { sha256 } from "../src/lib/hash.js";

const sampleCapture: CapturePayload = {
  url: "https://example.com/page",
  finalUrl: "https://example.com/page",
  title: "Example",
  html: "<html><body>hi</body></html>",
  capturedAt: "2026-05-10T19:00:00.000Z",
  userAgent: "TestUA",
  viewport: { width: 1024, height: 768, devicePixelRatio: 2 },
  language: "nl",
  referrer: "",
};

function makeFiles(): ManifestFiles {
  return {
    "snapshot.html": new TextEncoder().encode(sampleCapture.html),
    "snapshot.png": new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    "headers.json": new TextEncoder().encode("{}"),
  };
}

describe("buildManifest", () => {
  test("includes pvank metadata", async () => {
    const { manifest } = await buildManifest(sampleCapture, makeFiles(), "0.3.0");
    expect(manifest.pvank.version).toBe("0.1");
    expect(manifest.pvank.extension).toBe("0.3.0");
    expect(manifest.pvank.target).toBe("chrome");
  });

  test("includes capture metadata", async () => {
    const { manifest } = await buildManifest(sampleCapture, makeFiles(), "0.3.0");
    expect(manifest.url).toBe("https://example.com/page");
    expect(manifest.finalUrl).toBe("https://example.com/page");
    expect(manifest.title).toBe("Example");
    expect(manifest.capturedAt).toBe("2026-05-10T19:00:00.000Z");
  });

  test("hashes each file with SHA-256", async () => {
    const files = makeFiles();
    const { manifest } = await buildManifest(sampleCapture, files, "0.3.0");

    for (const [name, bytes] of Object.entries(files)) {
      const expected = await sha256(bytes);
      expect(manifest.files[name]?.sha256).toBe(expected.hex);
      expect(manifest.files[name]?.bytes).toBe(bytes.byteLength);
    }
  });

  test("manifest digest is 64-hex SHA-256", async () => {
    const { manifest, manifestDigest } = await buildManifest(sampleCapture, makeFiles(), "0.3.0");
    expect(manifest.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(manifestDigest.length).toBe(32);
  });

  test("manifest digest is deterministic for same input", async () => {
    const a = await buildManifest(sampleCapture, makeFiles(), "0.3.0");
    const b = await buildManifest(sampleCapture, makeFiles(), "0.3.0");
    expect(a.manifest.digest).toBe(b.manifest.digest);
  });

  test("manifest digest changes when content changes", async () => {
    const a = await buildManifest(sampleCapture, makeFiles(), "0.3.0");
    const altered = makeFiles();
    altered["snapshot.html"] = new TextEncoder().encode("different");
    const b = await buildManifest(sampleCapture, altered, "0.3.0");
    expect(a.manifest.digest).not.toBe(b.manifest.digest);
  });

  test("manifestBytes is JSON ending with newline", async () => {
    const { manifestBytes, manifest } = await buildManifest(sampleCapture, makeFiles(), "0.3.0");
    const text = new TextDecoder().decode(manifestBytes);
    expect(text.endsWith("\n")).toBe(true);
    expect(JSON.parse(text)).toEqual(manifest);
  });

  test("skips undefined files", async () => {
    const files: ManifestFiles = {
      "snapshot.html": new TextEncoder().encode("a"),
    };
    const { manifest } = await buildManifest(sampleCapture, files, "0.3.0");
    expect(manifest.files["snapshot.html"]).toBeDefined();
    expect(manifest.files["snapshot.png"]).toBeUndefined();
  });

  test("digest stable regardless of object key order", async () => {
    const filesA: ManifestFiles = {
      "snapshot.html": new TextEncoder().encode("a"),
      "headers.json": new TextEncoder().encode("b"),
    };
    const filesB: ManifestFiles = {
      "headers.json": new TextEncoder().encode("b"),
      "snapshot.html": new TextEncoder().encode("a"),
    };
    const a = await buildManifest(sampleCapture, filesA, "0.3.0");
    const b = await buildManifest(sampleCapture, filesB, "0.3.0");
    expect(a.manifest.digest).toBe(b.manifest.digest);
  });
});
