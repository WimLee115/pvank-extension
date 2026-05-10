import JSZip from "jszip";

export interface BundleEntry {
  path: string;
  data: Uint8Array | string;
}

export async function buildZip(entries: BundleEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const { path, data } of entries) zip.file(path, data);
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
