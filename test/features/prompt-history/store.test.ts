import { mkdtempSync, readFileSync, rmSync, writeFileSync, statSync, truncateSync } from "node:fs";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PromptHistoryStore } from "../../../src/features/prompt-history/store.js";
import { resolvePromptHistoryPath, PromptHistoryService } from "../../../src/features/prompt-history/index.js";
import { type PromptHistorySubmission } from "../../../src/contracts/owned-ui/index.js";

const roots: string[] = [];
const stores: PromptHistoryStore[] = [];
afterEach(() => { for (const store of stores.splice(0)) store.close(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function root() { const value = mkdtempSync(join(tmpdir(), "history-test-")); roots.push(value); return value; }
function open(path = join(root(), "history.sqlite3"), limit = 100) { const value = new PromptHistoryStore(path, "test-profile", limit); stores.push(value); return value; }
const prompt = (id: string, text = id): PromptHistorySubmission => ({ id, text, timestamp: 1, kind: "prompt" });

describe("profile history store", () => {
  it("keeps exact unique text in committed recency order across writers and reopen", () => {
    const path = join(root(), "history.sqlite3");
    const first = open(path); const second = open(path);
    first.record(prompt("a1", "A")); second.record(prompt("b1", "B")); first.record(prompt("a2", "A"));
    expect(second.snapshot().entries.map(item => item.text)).toEqual(["A", "B"]);
    second.record(prompt("a3", "a")); first.record(prompt("a4", "A  B")); second.record(prompt("a5", "A B"));
    expect(open(path).snapshot().entries.map(item => item.text)).toEqual(["A B", "A  B", "a", "A", "B"]);
  });

  it("applies the newly initialized limit without stale writers restoring it", () => {
    const path = join(root(), "history.sqlite3"); const first = open(path);
    for (let i = 0; i < 30; i++) first.record(prompt(`id-${i}`));
    const second = open(path, 10);
    first.record(prompt("latest"));
    expect(second.snapshot().entries).toHaveLength(10);
    expect(first.snapshot().limit).toBe(10);
    expect(open(path, 100).snapshot().entries).toHaveLength(10);
  });

  it("prunes by bytes and refuses oversized values instead of truncating", () => {
    const store = open();
    for (let i = 0; i < 10; i++) store.record(prompt(`id-${i}`, String(i) + "x".repeat(1024 * 1024 - 1)));
    expect(store.snapshot().entries).toHaveLength(8);
    expect(() => store.record(prompt("oversized", "x".repeat(1024 * 1024 + 1)))).toThrow("oversized");
    expect(store.snapshot().entries).toHaveLength(8);
  });

  it("bounds physical storage and rejects oversized files without erasing them", () => {
    const store = open();
    for (let index = 0; index < 25; index++) store.record(prompt(`bounded-${index}`, String(index).padStart(2, "0") + "x".repeat(1024 * 1024 - 2)));
    const size = ["", "-wal", "-shm"].reduce((total, suffix) => {
      try { return total + statSync(store.path + suffix).size; } catch { return total; }
    }, 0);
    expect(size).toBeLessThan(64 * 1024 * 1024);
    const excessive = join(root(), "excessive.sqlite3");
    writeFileSync(excessive, "preserve"); truncateSync(excessive, 64 * 1024 * 1024 + 1);
    expect(() => open(excessive)).toThrow("capacity");
    expect(statSync(excessive).size).toBe(64 * 1024 * 1024 + 1);
  });

  it("preserves damaged and wrong-profile stores", () => {
    const path = join(root(), "damaged.sqlite3"); writeFileSync(path, "not a database");
    expect(() => open(path)).toThrow(); expect(readFileSync(path, "utf8")).toBe("not a database");
    const good = join(root(), "good.sqlite3"); open(good).record(prompt("retained"));
    expect(() => new PromptHistoryStore(good, "other-profile", 10)).toThrow("schema");
    expect(open(good).snapshot().entries[0]?.text).toBe("retained");
  });

  it("isolates profiles and normalizes ordinary Windows path variants", () => {
    const a = resolvePromptHistoryPath("C:/data", "C:/Users/Test/.a1/agent/", "win32");
    const b = resolvePromptHistoryPath("C:/data", "c:\\users\\test\\.a1\\agent", "win32");
    expect(a).toEqual(b);
    expect(resolvePromptHistoryPath("C:/data", "C:/other/agent", "win32").path).not.toBe(a.path);
    expect(a.path).toMatch(/^C:\\data\\history\\a1-[a-f0-9]{64}\.sqlite3$/);
    expect(() => resolvePromptHistoryPath("relative", "/profile", "linux")).toThrow();
  });

  it("bounds queue saturation and leaves the event loop responsive under a held write lock", async () => {
    const dataDir = root(); const options = { dataDir, profileRoot: join(dataDir, "profile"), limit: 100 };
    const location = resolvePromptHistoryPath(dataDir, options.profileRoot);
    const seed = new PromptHistoryStore(location.path, location.profileId, 100); seed.close();
    const lock = new DatabaseSync(location.path); lock.exec("BEGIN IMMEDIATE");
    const service = new PromptHistoryService(options); const failures: string[] = [];
    service.onFailure(code => failures.push(code));
    try {
      const writes = Array.from({ length: 33 }, (_, i) => service.record(prompt(`queued-${i}`)));
      expect(await writes[32]).toBe("skipped");
      await new Promise(resolve => setImmediate(resolve));
      expect(failures).toEqual(["capacity"]);
      lock.exec("ROLLBACK");
      expect((await Promise.all(writes)).filter(value => value === "committed")).toHaveLength(32);
      expect(failures).toEqual(["capacity"]);
    } finally { lock.close(); await service.close(); }
  });

  it("preserves newer schema bytes and reports a content-free persistence failure", async () => {
    const dataDir = root(); const options = { dataDir, profileRoot: join(dataDir, "profile"), limit: 100 };
    const location = resolvePromptHistoryPath(dataDir, options.profileRoot);
    const seed = new PromptHistoryStore(location.path, location.profileId, 100); seed.close();
    const newer = new DatabaseSync(location.path); newer.exec("PRAGMA user_version=99"); newer.close();
    const before = readFileSync(location.path);
    const service = new PromptHistoryService(options); const failures: string[] = [];
    service.onFailure(code => failures.push(code));
    try { expect(await service.record(prompt("id", "sensitive sentinel"))).toBe("skipped"); }
    finally { await service.close(); }
    expect(failures).toEqual(["schema"]);
    expect(readFileSync(location.path)).toEqual(before);
  });

  it("commits off-thread, flushes on close and loads in a fresh service", async () => {
    const dataDir = root(); const options = { dataDir, profileRoot: join(dataDir, "profile"), limit: 100 };
    const first = new PromptHistoryService(options);
    try { expect(await first.record(prompt("worker", "multiline\n👩‍💻"))).toBe("committed"); } finally { await first.close(); }
    const second = new PromptHistoryService(options);
    try {
      const snapshot = new Promise<readonly string[]>((resolve, reject) => {
        second.onSnapshot(value => resolve(value.entries.map(item => item.text)));
        second.onFailure(code => reject(new Error(code)));
      });
      second.start(); expect(await snapshot).toEqual(["multiline\n👩‍💻"]);
    } finally { await second.close(); }
  });
});
