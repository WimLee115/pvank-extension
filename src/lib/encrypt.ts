const PVENC_MAGIC = new Uint8Array([0x50, 0x56, 0x45, 0x4e, 0x43, 0x01]); // "PVENC\x01"
const SALT_LEN = 16;
const IV_LEN = 12;
const PBKDF2_ITERATIONS = 600_000;

export async function encryptBlob(blob: Blob, password: string): Promise<Blob> {
  if (password.length < 8) throw new Error("password must be at least 8 chars");

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);

  const plaintext = await blob.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer> } as AesGcmParams,
    key,
    plaintext,
  );

  const out = new Uint8Array(PVENC_MAGIC.length + SALT_LEN + IV_LEN + ciphertext.byteLength);
  let offset = 0;
  out.set(PVENC_MAGIC, offset); offset += PVENC_MAGIC.length;
  out.set(salt, offset); offset += SALT_LEN;
  out.set(iv, offset); offset += IV_LEN;
  out.set(new Uint8Array(ciphertext), offset);

  return new Blob([out as unknown as BlobPart], { type: "application/octet-stream" });
}

export async function decryptBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  for (let i = 0; i < PVENC_MAGIC.length; i++) {
    if (bytes[i] !== PVENC_MAGIC[i]) throw new Error("not a PVENC file (magic mismatch)");
  }
  let offset = PVENC_MAGIC.length;
  const salt = bytes.slice(offset, offset + SALT_LEN); offset += SALT_LEN;
  const iv = bytes.slice(offset, offset + IV_LEN); offset += IV_LEN;
  const ciphertext = bytes.slice(offset);

  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer> } as AesGcmParams,
    key,
    ciphertext as unknown as Uint8Array<ArrayBuffer>,
  );
  return new Uint8Array(plaintext);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password) as unknown as Uint8Array<ArrayBuffer>,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as Uint8Array<ArrayBuffer>,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    } as Pbkdf2Params,
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
