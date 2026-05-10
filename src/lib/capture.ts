export async function captureVisibleScreenshot(windowId: number): Promise<Uint8Array> {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  const base64 = dataUrl.split(",", 2)[1];
  if (!base64) throw new Error("captureVisibleTab returned no data");
  return base64ToBytes(base64);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function buildHeadersJson(
  url: string,
  finalUrl: string,
  title: string,
  capturedAt: string,
  extra: Record<string, unknown> = {},
): Uint8Array {
  const data = {
    url,
    finalUrl,
    title,
    capturedAt,
    ...extra,
    note: "Extensie kan response-headers in MV3 niet betrouwbaar lezen. Voor volledige headers: gebruik PVANK URL-modus (server-side fetch).",
  };
  return new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n");
}
