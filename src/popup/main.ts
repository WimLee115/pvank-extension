import { sealActiveTab } from "../lib/seal.js";
import { applyTranslations, t, activeLocale } from "../lib/i18n.js";
import { loadHistory, type HistoryEntry } from "../lib/history.js";

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

const els = {
  favicon: $<HTMLDivElement>("#favicon"),
  host: $<HTMLParagraphElement>("#host"),
  path: $<HTMLParagraphElement>("#path"),
  meta: $<HTMLParagraphElement>("#page-meta"),
  seal: $<HTMLButtonElement>("#seal"),
  action: $<HTMLElement>("#action"),
  status: $<HTMLElement>("#status"),
  step: $<HTMLParagraphElement>("#step"),
  fill: $<HTMLSpanElement>("#termbar-fill"),
  empty: $<HTMLSpanElement>("#termbar-empty"),
  pct: $<HTMLParagraphElement>("#pct"),
  result: $<HTMLElement>("#result"),
  filename: $<HTMLParagraphElement>("#filename"),
  digest: $<HTMLElement>("#digest"),
  copyBtn: $<HTMLButtonElement>("#copy-digest"),
  verifyBtn: $<HTMLButtonElement>("#open-verifier"),
  error: $<HTMLElement>("#error"),
  errMsg: $<HTMLParagraphElement>("#error-msg"),
  history: $<HTMLDetailsElement>("#history-panel"),
  histList: $<HTMLUListElement>("#history-list"),
  histCount: $<HTMLElement>("#history-count"),
  settings: $<HTMLAnchorElement>("#settings-link"),
};

const TERMBAR_WIDTH = 26;
let lastDigest = "";

(async () => {
  await applyTranslations();
  await renderTab();
  await renderHistory();
})();

async function renderTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      await showError(await t("noActiveTab"));
      els.seal.disabled = true;
      return;
    }
    if (!/^https?:/.test(tab.url)) {
      await showError(await t("onlyHttps"));
      els.seal.disabled = true;
      els.host.textContent = tab.url;
      return;
    }

    const u = new URL(tab.url);
    els.host.textContent = u.hostname;
    els.path.textContent = u.pathname + u.search + u.hash || "/";
    els.path.title = els.path.textContent;

    const tlsOk = u.protocol === "https:";
    const lang = await activeLocale();
    const tlsKey = tlsOk ? "secure" : "insecure";
    const tlsClass = tlsOk ? "tls-ok" : "tls-no";
    const tlsLabel = await t(tlsKey);
    els.meta.innerHTML = `<span class="${tlsClass}">${tlsOk ? "🔒" : "⚠"} ${escapeHtml(tlsLabel)}</span> · ${lang.toUpperCase()}`;

    if (tab.favIconUrl && /^https?:/.test(tab.favIconUrl)) {
      const img = document.createElement("img");
      img.src = tab.favIconUrl;
      img.alt = "";
      img.onerror = () => { els.favicon.textContent = "▓"; };
      els.favicon.replaceChildren(img);
    } else {
      els.favicon.textContent = "▓";
    }
  } catch (err) {
    await showError(String(err));
    els.seal.disabled = true;
  }
}

els.seal.addEventListener("click", async () => {
  hideAll();
  showStatus();
  els.seal.disabled = true;

  try {
    const result = await sealActiveTab(updateProgress);
    await showResult(result);
    await renderHistory();
  } catch (err) {
    await showError(err instanceof Error ? err.message : String(err));
  } finally {
    els.seal.disabled = false;
  }
});

els.copyBtn.addEventListener("click", async () => {
  if (!lastDigest) return;
  await navigator.clipboard.writeText(lastDigest);
  els.copyBtn.classList.add("copied");
  const span = els.copyBtn.querySelector("span")!;
  const original = span.textContent;
  span.textContent = await t("copied");
  setTimeout(() => {
    els.copyBtn.classList.remove("copied");
    span.textContent = original;
  }, 1200);
});

els.verifyBtn.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("verify.html") });
});

els.settings.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});

async function updateProgress(step: string, pct: number): Promise<void> {
  els.step.textContent = await t(`step.${step}`);
  const filled = Math.round((pct / 100) * TERMBAR_WIDTH);
  els.fill.textContent = "█".repeat(filled);
  els.empty.textContent = "░".repeat(TERMBAR_WIDTH - filled);
  els.pct.textContent = `${pct}%`;
}

function showStatus(): void {
  els.status.hidden = false;
  els.action.hidden = true;
}

async function showResult(r: {
  filename: string;
  digest: string;
}): Promise<void> {
  hideAll();
  els.result.hidden = false;
  els.action.hidden = false;
  els.filename.textContent = r.filename;
  els.digest.textContent = r.digest;
  lastDigest = r.digest;
}

async function showError(message: string): Promise<void> {
  hideAll();
  els.error.hidden = false;
  els.action.hidden = false;
  els.errMsg.textContent = message;
}

function hideAll(): void {
  els.status.hidden = true;
  els.result.hidden = true;
  els.error.hidden = true;
}

async function renderHistory(): Promise<void> {
  const items = await loadHistory();
  els.histCount.textContent = items.length ? `${items.length}` : "";
  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "hist-empty";
    empty.textContent = await t("noHistory");
    els.histList.replaceChildren(empty);
    return;
  }
  const lang = await activeLocale();
  const fmt = new Intl.DateTimeFormat(lang === "nl" ? "nl-NL" : "en-GB", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const frag = document.createDocumentFragment();
  for (const e of items) frag.appendChild(historyItem(e, fmt));
  els.histList.replaceChildren(frag);
}

function historyItem(e: HistoryEntry, fmt: Intl.DateTimeFormat): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "hist-item";
  const time = fmt.format(new Date(e.capturedAt));

  const host = document.createElement("div");
  host.className = "hist-host";
  host.textContent = e.host;
  host.title = e.url;

  const t_ = document.createElement("div");
  t_.className = "hist-time";
  t_.textContent = time;

  const dig = document.createElement("div");
  dig.className = "hist-digest";
  dig.textContent = e.digest.slice(0, 16) + "…" + e.digest.slice(-8);
  dig.title = e.digest;

  li.append(host, t_, dig);
  return li;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
