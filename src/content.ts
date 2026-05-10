import type { CapturePayload, Msg } from "./lib/types.js";

chrome.runtime.onMessage.addListener((msg: any, _sender, sendResponse) => {
  try {
    if (msg?.type === "capture-dom") {
      sendResponse({ type: "capture-dom:result", payload: grabDom() } satisfies Msg);
      return true;
    }
    if (msg?.type === "page-dimensions") {
      sendResponse({
        type: "page-dimensions:result",
        payload: getDimensions(),
      });
      return true;
    }
    if (msg?.type === "scroll-to") {
      const y = Number(msg.y) || 0;
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(() => {
        sendResponse({ type: "scroll-to:result", actualY: window.scrollY });
      });
      return true;
    }
    if (msg?.type === "set-fixed-display") {
      const visible = Boolean(msg.visible);
      toggleFixed(visible);
      sendResponse({ type: "set-fixed-display:result" });
      return true;
    }
  } catch (err) {
    sendResponse({ type: "error", message: String(err) } satisfies Msg);
    return true;
  }
  return false;
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

function getDimensions(): {
  totalHeight: number;
  viewportHeight: number;
  viewportWidth: number;
  devicePixelRatio: number;
} {
  const body = document.body;
  const html = document.documentElement;
  const total = Math.max(
    body.scrollHeight, body.offsetHeight,
    html.clientHeight, html.scrollHeight, html.offsetHeight,
  );
  return {
    totalHeight: total,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio,
  };
}

const HIDDEN_MARK = "__pvank_hidden__";

function toggleFixed(visible: boolean): void {
  if (visible) {
    for (const el of document.querySelectorAll<HTMLElement>(`[${HIDDEN_MARK}="1"]`)) {
      el.style.visibility = el.dataset["pvankPrevVis"] ?? "";
      el.removeAttribute(HIDDEN_MARK);
      delete el.dataset["pvankPrevVis"];
    }
    return;
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.position === "sticky") {
      el.dataset["pvankPrevVis"] = el.style.visibility;
      el.style.visibility = "hidden";
      el.setAttribute(HIDDEN_MARK, "1");
    }
  }
}
