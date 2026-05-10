export async function captureVisibleScreenshot(windowId: number): Promise<Uint8Array> {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  return dataUrlToBytes(dataUrl);
}

export interface FullPageProgress {
  current: number;
  total: number;
}

export async function captureFullPageScreenshot(
  tabId: number,
  windowId: number,
  onProgress?: (p: FullPageProgress) => void,
): Promise<Uint8Array> {
  const dims = await sendToTab<{
    totalHeight: number;
    viewportHeight: number;
    viewportWidth: number;
    devicePixelRatio: number;
  }>(tabId, { type: "page-dimensions" });

  const positions: number[] = [];
  let y = 0;
  while (y + dims.viewportHeight < dims.totalHeight) {
    positions.push(y);
    y += dims.viewportHeight;
  }
  if (positions.length === 0 || positions[positions.length - 1]! + dims.viewportHeight < dims.totalHeight) {
    positions.push(Math.max(0, dims.totalHeight - dims.viewportHeight));
  }

  const captures: Uint8Array[] = [];
  await sendToTab(tabId, { type: "set-fixed-display", visible: false }).catch(() => {});

  try {
    for (let i = 0; i < positions.length; i++) {
      await sendToTab(tabId, { type: "scroll-to", y: positions[i] });
      await delay(200);
      if (i > 0) await delay(550);
      captures.push(await captureVisibleScreenshot(windowId));
      onProgress?.({ current: i + 1, total: positions.length });
    }
  } finally {
    await sendToTab(tabId, { type: "set-fixed-display", visible: true }).catch(() => {});
    await sendToTab(tabId, { type: "scroll-to", y: 0 }).catch(() => {});
  }

  return stitch(captures, positions, dims);
}

async function stitch(
  imgBytes: Uint8Array[],
  positions: number[],
  dims: { viewportWidth: number; viewportHeight: number; totalHeight: number; devicePixelRatio: number },
): Promise<Uint8Array> {
  const dpr = dims.devicePixelRatio || 1;
  const canvasWidth = Math.round(dims.viewportWidth * dpr);
  const canvasHeight = Math.round(dims.totalHeight * dpr);
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  for (let i = 0; i < imgBytes.length; i++) {
    const blob = new Blob([imgBytes[i] as unknown as BlobPart], { type: "image/png" });
    const bitmap = await createImageBitmap(blob);
    const yPx = Math.round((positions[i] ?? 0) * dpr);
    ctx.drawImage(bitmap, 0, yPx);
    bitmap.close();
  }

  const out = await canvas.convertToBlob({ type: "image/png" });
  return new Uint8Array(await out.arrayBuffer());
}

function sendToTab<T>(tabId: number, msg: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (resp: any) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!resp) return reject(new Error("no response"));
      if (resp.type === "page-dimensions:result") return resolve(resp.payload as T);
      if (resp.type === "scroll-to:result" || resp.type === "set-fixed-display:result") return resolve(resp as T);
      if (resp.type === "error") return reject(new Error(resp.message));
      resolve(resp as T);
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",", 2)[1];
  if (!base64) throw new Error("captureVisibleTab returned no data");
  const bin = atob(base64);
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
