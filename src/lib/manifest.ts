import type { CapturePayload, ProofManifest } from "./types.js";
import { sha256 } from "./hash.js";

declare const __TARGET__: "chrome" | "firefox";

export interface ManifestFiles {
  "snapshot.html": Uint8Array;
  "snapshot.png"?: Uint8Array;
  "headers.json"?: Uint8Array;
  "tegenpartij.json"?: Uint8Array;
}

export async function buildManifest(
  capture: CapturePayload,
  files: ManifestFiles,
  extensionVersion: string,
): Promise<{ manifest: ProofManifest; manifestBytes: Uint8Array; manifestDigest: Uint8Array }> {
  const fileHashes: ProofManifest["files"] = {};

  for (const [name, bytes] of Object.entries(files)) {
    if (!bytes) continue;
    const { hex } = await sha256(bytes);
    fileHashes[name] = { sha256: hex, bytes: bytes.byteLength };
  }

  const partial: Omit<ProofManifest, "digest"> = {
    pvank: {
      version: "0.1",
      extension: extensionVersion,
      target: __TARGET__,
    },
    capturedAt: capture.capturedAt,
    url: capture.url,
    finalUrl: capture.finalUrl,
    title: capture.title,
    files: fileHashes,
  };

  const partialJson = stableStringify(partial);
  const { hex, bytes: digestBytes } = await sha256(partialJson);

  const manifest: ProofManifest = { ...partial, digest: hex };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n");

  return { manifest, manifestBytes, manifestDigest: digestBytes };
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify((obj as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}
