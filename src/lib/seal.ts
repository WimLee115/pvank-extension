import type { CapturePayload, Msg } from "./types.js";
import { stamp } from "./ots.js";
import { buildManifest } from "./manifest.js";
import { buildZip, downloadBlob } from "./bundle.js";
import { captureVisibleScreenshot, buildHeadersJson } from "./capture.js";
import { recordSeal } from "./history.js";
import { loadSettings } from "./i18n.js";

declare const __TARGET__: "chrome" | "firefox";

export type ProgressCb = (step: string, pct: number) => void;

export interface SealResult {
  filename: string;
  digest: string;
  bytes: number;
  hasOts: boolean;
}

export async function sealActiveTab(progress: ProgressCb): Promise<SealResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.windowId === undefined) throw new Error("no active tab");
  if (!tab.url || !/^https?:/.test(tab.url)) throw new Error("only http(s) pages");

  progress("dom-grab", 10);
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });

  const dom = await new Promise<CapturePayload>((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id!, { type: "capture-dom" } satisfies Msg, (resp: Msg) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (resp?.type === "capture-dom:result") resolve(resp.payload);
      else reject(new Error(resp?.type === "error" ? resp.message : "unexpected response"));
    });
  });

  progress("screenshot", 30);
  let screenshot: Uint8Array | undefined;
  try {
    screenshot = await captureVisibleScreenshot(tab.windowId);
  } catch (err) {
    console.warn("[pvank] screenshot failed:", err);
  }

  progress("manifest", 50);
  const htmlBytes = new TextEncoder().encode(dom.html);
  const headersBytes = buildHeadersJson(dom.url, dom.finalUrl, dom.title, dom.capturedAt, {
    userAgent: dom.userAgent,
    viewport: dom.viewport,
    language: dom.language,
    referrer: dom.referrer,
  });

  const files = {
    "snapshot.html": htmlBytes,
    ...(screenshot ? { "snapshot.png": screenshot } : {}),
    "headers.json": headersBytes,
  };

  const extensionVersion = chrome.runtime.getManifest().version;
  const { manifest, manifestBytes, manifestDigest } = await buildManifest(dom, files, extensionVersion);

  progress("ots", 70);
  let otsBytes: Uint8Array | undefined;
  try {
    otsBytes = await stamp(manifestDigest);
  } catch (err) {
    console.warn("[pvank] OTS stamping failed:", err);
  }

  progress("bundle", 90);
  const verifyHtml = await fetchVerifyHtml();

  const blob = await buildZip([
    { path: "snapshot.html", data: htmlBytes },
    ...(screenshot ? [{ path: "snapshot.png", data: screenshot }] : []),
    { path: "headers.json", data: headersBytes },
    { path: "manifest.json", data: manifestBytes },
    ...(otsBytes ? [{ path: "manifest.json.ots", data: otsBytes }] : []),
    { path: "verify.html", data: verifyHtml },
  ]);

  const stamp_ = new Date(dom.capturedAt).toISOString().replace(/[:.]/g, "-");
  const host = safeHost(dom.url);
  const filename = `pvank-bewijs_${host}_${stamp_}.zip`;

  downloadBlob(blob, filename);

  const settings = await loadSettings();
  if (settings.historyEnabled) {
    await recordSeal({
      filename,
      capturedAt: dom.capturedAt,
      url: dom.url,
      host,
      digest: manifest.digest,
      hasOts: Boolean(otsBytes),
      bytes: blob.size,
    });
  }

  progress("done", 100);
  return { filename, digest: manifest.digest, bytes: blob.size, hasOts: Boolean(otsBytes) };
}

async function fetchVerifyHtml(): Promise<string> {
  const url = chrome.runtime.getURL("verify.html");
  const res = await fetch(url);
  return res.text();
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, "_");
  } catch {
    return "page";
  }
}

void __TARGET__;
