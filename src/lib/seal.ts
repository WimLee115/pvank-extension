import type { CapturePayload, Msg } from "./types.js";
import { stamp } from "./ots.js";
import { buildManifest } from "./manifest.js";
import { buildZip, downloadBlob } from "./bundle.js";
import { captureVisibleScreenshot, captureFullPageScreenshot, buildHeadersJson } from "./capture.js";
import { recordSeal } from "./history.js";
import { loadSettings, loadPassword } from "./i18n.js";
import { encryptBlob } from "./encrypt.js";

declare const __TARGET__: "chrome" | "firefox";

export type ProgressCb = (step: string, pct: number, sub?: string) => void;

export interface SealResult {
  filename: string;
  digest: string;
  bytes: number;
  hasOts: boolean;
  encrypted: boolean;
  host: string;
}

export async function sealActiveTab(progress: ProgressCb): Promise<SealResult> {
  const settings = await loadSettings();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.windowId === undefined) throw new Error("no active tab");
  if (!tab.url || !/^https?:/.test(tab.url)) throw new Error("only http(s) pages");

  let password = "";
  if (settings.encryptEnabled) {
    password = await loadPassword();
    if (!password) throw new Error("encryption is on but no password is set");
    if (password.length < 8) throw new Error("password must be at least 8 chars");
  }

  progress("dom-grab", 8);
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

  let screenshot: Uint8Array | undefined;
  try {
    if (settings.fullPageScreenshot) {
      progress("fullpage", 22);
      screenshot = await captureFullPageScreenshot(tab.id, tab.windowId, (p) => {
        const pct = 22 + Math.round((p.current / p.total) * 28);
        progress("fullpage", pct, `${p.current}/${p.total}`);
      });
    } else {
      progress("screenshot", 30);
      screenshot = await captureVisibleScreenshot(tab.windowId);
    }
  } catch (err) {
    console.warn("[pvank] screenshot failed:", err);
  }

  progress("manifest", 55);
  const htmlBytes = new TextEncoder().encode(dom.html);
  const headersBytes = buildHeadersJson(dom.url, dom.finalUrl, dom.title, dom.capturedAt, {
    userAgent: dom.userAgent,
    viewport: dom.viewport,
    language: dom.language,
    referrer: dom.referrer,
    screenshotMode: settings.fullPageScreenshot ? "full-page" : "viewport",
    signedBy: "WimLee115",
  });

  const files = {
    "snapshot.html": htmlBytes,
    ...(screenshot ? { "snapshot.png": screenshot } : {}),
    "headers.json": headersBytes,
  };

  const extensionVersion = chrome.runtime.getManifest().version;
  const { manifest, manifestBytes, manifestDigest } = await buildManifest(dom, files, extensionVersion);

  progress("ots", 72);
  let otsBytes: Uint8Array | undefined;
  try {
    otsBytes = await stamp(manifestDigest);
  } catch (err) {
    console.warn("[pvank] OTS stamping failed:", err);
  }

  progress("bundle", 85);
  const verifyHtml = await fetchVerifyHtml();

  let blob = await buildZip([
    { path: "snapshot.html", data: htmlBytes },
    ...(screenshot ? [{ path: "snapshot.png", data: screenshot }] : []),
    { path: "headers.json", data: headersBytes },
    { path: "manifest.json", data: manifestBytes },
    ...(otsBytes ? [{ path: "manifest.json.ots", data: otsBytes }] : []),
    { path: "verify.html", data: verifyHtml },
  ]);

  let encrypted = false;
  if (settings.encryptEnabled && password) {
    progress("encrypt", 92);
    blob = await encryptBlob(blob, password);
    encrypted = true;
  }

  const stamp_ = new Date(dom.capturedAt).toISOString().replace(/[:.]/g, "-");
  const host = safeHost(dom.url);
  const ext = encrypted ? "pvenc" : "zip";
  const filename = `pvank-bewijs_${host}_${stamp_}.${ext}`;

  downloadBlob(blob, filename);

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

  if (settings.notificationsEnabled) {
    void chrome.runtime.sendMessage({
      type: "pvank-notify",
      host,
      filename,
    }).catch(() => {});
  }

  progress("done", 100);
  return {
    filename,
    digest: manifest.digest,
    bytes: blob.size,
    hasOts: Boolean(otsBytes),
    encrypted,
    host,
  };
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
