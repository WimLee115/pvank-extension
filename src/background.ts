chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pvank-seal",
    title: "Verzegel deze pagina (PVANK)",
    contexts: ["page", "frame"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "pvank-seal") return;
  void chrome.action.openPopup().catch((err) => {
    console.warn("[pvank] openPopup not supported here:", err);
  });
});
