export async function sha256(data: ArrayBuffer | Uint8Array | string): Promise<{ hex: string; bytes: Uint8Array }> {
  const buf: BufferSource =
    typeof data === "string"
      ? (new TextEncoder().encode(data) as unknown as Uint8Array<ArrayBuffer>)
      : data instanceof Uint8Array
        ? (data as unknown as Uint8Array<ArrayBuffer>)
        : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return { hex, bytes };
}

export function bytesOf(s: string): number {
  return new TextEncoder().encode(s).byteLength;
}
