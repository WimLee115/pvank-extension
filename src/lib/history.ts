const HISTORY_KEY = "pvank.history";
const MAX_ENTRIES = 20;

export interface HistoryEntry {
  filename: string;
  capturedAt: string;
  url: string;
  host: string;
  digest: string;
  hasOts: boolean;
  bytes: number;
}

export async function recordSeal(entry: HistoryEntry): Promise<void> {
  const history = await loadHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, MAX_ENTRIES);
  await chrome.storage.local.set({ [HISTORY_KEY]: trimmed });
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  return (stored[HISTORY_KEY] as HistoryEntry[] | undefined) ?? [];
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_KEY);
}
