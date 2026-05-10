import type { CapturePayload, Msg } from "./lib/types.js";

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  if (msg.type !== "capture-dom") return false;

  try {
    const payload = grabDom();
    sendResponse({ type: "capture-dom:result", payload } satisfies Msg);
  } catch (err) {
    sendResponse({ type: "error", message: String(err) } satisfies Msg);
  }
  return true;
});

function grabDom(): CapturePayload {
  const doctype = document.doctype
    ? `<!DOCTYPE ${document.doctype.name}${document.doctype.publicId ? ` PUBLIC "${document.doctype.publicId}"` : ""}${document.doctype.systemId ? ` "${document.doctype.systemId}"` : ""}>\n`
    : "";

  return {
    url: location.href,
    finalUrl: location.href,
    title: document.title,
    html: doctype + document.documentElement.outerHTML,
    capturedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    language: navigator.language,
    referrer: document.referrer,
  };
}
