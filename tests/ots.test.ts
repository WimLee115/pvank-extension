import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { stamp } from "../src/lib/ots.js";

const OTS_MAGIC_LEN = 31;

describe("stamp", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("rejects digests not 32 bytes", async () => {
    await expect(stamp(new Uint8Array(31))).rejects.toThrow(/32-byte/);
    await expect(stamp(new Uint8Array(33))).rejects.toThrow(/32-byte/);
  });

  test("wraps calendar response with PVANK OTS file format", async () => {
    const calendarProof = new Uint8Array([0x01, 0x02, 0x03]);
    globalThis.fetch = vi.fn(async () => new Response(calendarProof.buffer.slice(0))) as any;

    const digest = new Uint8Array(32);
    for (let i = 0; i < 32; i++) digest[i] = i;
    const result = await stamp(digest);

    // Magic
    expect(result.slice(0, OTS_MAGIC_LEN)).toEqual(new Uint8Array([
      0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73,
      0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
    ]));
    // Version
    expect(result[OTS_MAGIC_LEN]).toBe(0x01);
    // SHA-256 op
    expect(result[OTS_MAGIC_LEN + 1]).toBe(0x08);
    // Digest
    expect(result.slice(OTS_MAGIC_LEN + 2, OTS_MAGIC_LEN + 2 + 32)).toEqual(digest);
    // Calendar proof
    expect(result.slice(OTS_MAGIC_LEN + 2 + 32)).toEqual(calendarProof);
  });

  test("falls back to next calendar on failure", async () => {
    let attempts = 0;
    globalThis.fetch = vi.fn(async () => {
      attempts++;
      if (attempts < 2) return new Response("fail", { status: 500 });
      return new Response(new Uint8Array([0xaa]).buffer.slice(0));
    }) as any;

    const digest = new Uint8Array(32);
    const result = await stamp(digest);
    expect(attempts).toBe(2);
    expect(result[result.length - 1]).toBe(0xaa);
  });

  test("throws when all calendars fail", async () => {
    globalThis.fetch = vi.fn(async () => new Response("fail", { status: 500 })) as any;
    await expect(stamp(new Uint8Array(32))).rejects.toThrow(/All OTS calendars failed/);
  });

  test("posts digest as request body", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([0]).buffer.slice(0))) as any;
    globalThis.fetch = fetchMock;

    const digest = new Uint8Array(32);
    digest[0] = 0xff;
    await stamp(digest);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/digest$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/octet-stream");
    const body = new Uint8Array(init.body);
    expect(body[0]).toBe(0xff);
  });
});
