import { describe, expect, test } from "vitest";
import { sha256, bytesOf } from "../src/lib/hash.js";

describe("sha256", () => {
  test("hashes empty string", async () => {
    const { hex, bytes } = await sha256("");
    expect(hex).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
  });

  test("hashes ASCII string", async () => {
    const { hex } = await sha256("hello");
    expect(hex).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  test("hashes Uint8Array same as string", async () => {
    const fromString = await sha256("abc");
    const fromBytes = await sha256(new TextEncoder().encode("abc"));
    expect(fromBytes.hex).toBe(fromString.hex);
  });

  test("hashes ArrayBuffer", async () => {
    const ab = new TextEncoder().encode("abc").buffer.slice(0);
    const { hex } = await sha256(ab as ArrayBuffer);
    expect(hex).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  test("hex output is lowercase 64 chars", async () => {
    const { hex } = await sha256("test");
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("bytesOf", () => {
  test("returns 0 for empty", () => {
    expect(bytesOf("")).toBe(0);
  });

  test("counts ASCII bytes", () => {
    expect(bytesOf("hello")).toBe(5);
  });

  test("counts UTF-8 bytes for multi-byte chars", () => {
    expect(bytesOf("é")).toBe(2);
    expect(bytesOf("欧")).toBe(3);
    expect(bytesOf("🦄")).toBe(4);
  });
});
