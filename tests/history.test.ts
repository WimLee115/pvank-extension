import { describe, expect, test } from "vitest";
import { recordSeal, loadHistory, clearHistory, type HistoryEntry } from "../src/lib/history.js";

function entry(host: string, capturedAt: string): HistoryEntry {
  return {
    filename: `pvank-bewijs_${host}.zip`,
    capturedAt,
    url: `https://${host}/`,
    host,
    digest: "deadbeef".repeat(8),
    hasOts: true,
    bytes: 12345,
  };
}

describe("history", () => {
  test("loadHistory returns empty on fresh start", async () => {
    expect(await loadHistory()).toEqual([]);
  });

  test("recordSeal stores entry", async () => {
    await recordSeal(entry("a.test", "2026-05-10T10:00:00Z"));
    const items = await loadHistory();
    expect(items).toHaveLength(1);
    expect(items[0]?.host).toBe("a.test");
  });

  test("most recent first (LIFO)", async () => {
    await recordSeal(entry("first.test", "2026-05-10T10:00:00Z"));
    await recordSeal(entry("second.test", "2026-05-10T11:00:00Z"));
    const items = await loadHistory();
    expect(items.map((x) => x.host)).toEqual(["second.test", "first.test"]);
  });

  test("trims to 20 entries", async () => {
    for (let i = 0; i < 25; i++) {
      await recordSeal(entry(`host-${i}.test`, `2026-05-10T${String(i % 24).padStart(2, "0")}:00:00Z`));
    }
    const items = await loadHistory();
    expect(items).toHaveLength(20);
    expect(items[0]?.host).toBe("host-24.test");
  });

  test("clearHistory empties the list", async () => {
    await recordSeal(entry("x.test", "2026-05-10T10:00:00Z"));
    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });
});
