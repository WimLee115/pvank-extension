import { describe, expect, test } from "vitest";
import { encryptBlob, decryptBytes } from "../src/lib/encrypt.js";

const PVENC_MAGIC = new Uint8Array([0x50, 0x56, 0x45, 0x4e, 0x43, 0x01]);

describe("encryptBlob / decryptBytes round-trip", () => {
  test("round-trips small data", async () => {
    const original = new TextEncoder().encode("hello world");
    const blob = new Blob([original as unknown as BlobPart]);
    const encrypted = await encryptBlob(blob, "test-password");
    const cipher = new Uint8Array(await encrypted.arrayBuffer());

    const decrypted = await decryptBytes(cipher, "test-password");
    expect(new TextDecoder().decode(decrypted)).toBe("hello world");
  });

  test("round-trips binary data", async () => {
    const original = new Uint8Array(1024);
    for (let i = 0; i < original.length; i++) original[i] = i % 256;
    const blob = new Blob([original as unknown as BlobPart]);

    const encrypted = await encryptBlob(blob, "longer-password-here");
    const cipher = new Uint8Array(await encrypted.arrayBuffer());
    const decrypted = await decryptBytes(cipher, "longer-password-here");

    expect(decrypted.length).toBe(1024);
    for (let i = 0; i < decrypted.length; i++) {
      expect(decrypted[i]).toBe(i % 256);
    }
  });

  test("output starts with PVENC magic", async () => {
    const blob = new Blob(["x"]);
    const encrypted = await encryptBlob(blob, "password1");
    const cipher = new Uint8Array(await encrypted.arrayBuffer());
    for (let i = 0; i < PVENC_MAGIC.length; i++) {
      expect(cipher[i]).toBe(PVENC_MAGIC[i]);
    }
  });

  test("output is application/octet-stream", async () => {
    const blob = new Blob(["x"]);
    const encrypted = await encryptBlob(blob, "password1");
    expect(encrypted.type).toBe("application/octet-stream");
  });

  test("rejects password shorter than 8 chars", async () => {
    const blob = new Blob(["x"]);
    await expect(encryptBlob(blob, "short")).rejects.toThrow(/at least 8/);
  });

  test("decrypt fails with wrong password", async () => {
    const blob = new Blob(["secret"]);
    const encrypted = await encryptBlob(blob, "correct1");
    const cipher = new Uint8Array(await encrypted.arrayBuffer());
    await expect(decryptBytes(cipher, "wrong123")).rejects.toThrow();
  });

  test("decrypt fails on non-PVENC bytes", async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(decryptBytes(garbage, "password1")).rejects.toThrow(/magic/);
  });

  test("each encrypt produces different ciphertext (random salt+iv)", async () => {
    const blob = new Blob(["same data"]);
    const e1 = new Uint8Array(await (await encryptBlob(blob, "password1")).arrayBuffer());
    const e2 = new Uint8Array(await (await encryptBlob(blob, "password1")).arrayBuffer());
    expect(e1).not.toEqual(e2);
  });
});
