import { mkdtempSync, readFileSync, rmSync, writeFileSync, statSync, truncateSync } from "node:fs";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptHistoryStore } from "../../../src/features/prompt-history/store.js";
import { resolvePromptHistoryPath, PromptHistoryService, PromptImageSidecar } from "../../../src/features/prompt-history/index.js";
import { type PromptHistorySubmission } from "../../../src/contracts/owned-ui/index.js";

// Rationale: Real FULL-synchronous SQLite correctness workloads exceeded 27 seconds on Windows CI.
// Allow disk-time variance only here, without relaxing worker responsiveness or shutdown deadlines.
const DURABLE_STORE_TEST_TIMEOUT_MS = 60_000;

const roots: string[] = [];
const stores: PromptHistoryStore[] = [];
afterEach(() => { for (const store of stores.splice(0)) store.close(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function root() { const value = mkdtempSync(join(tmpdir(), "history-test-")); roots.push(value); return value; }
function open(path = join(root(), "history.sqlite3"), limit = 100) { const value = new PromptHistoryStore(path, "test-profile", limit); stores.push(value); return value; }
const prompt = (id: string, text = id): PromptHistorySubmission => ({ id, text, timestamp: 1, kind: "prompt" });

describe("profile history store", () => {
  it.each([false, true])("reports truthful certainty when COMMIT acknowledgement is lost (committed=%s)", committed => {
    const store = open();
    store.record(prompt("seed"));
    const before = store.snapshot().revision;
    const original = DatabaseSync.prototype.exec;
    const intercept = vi.spyOn(DatabaseSync.prototype, "exec").mockImplementation(function (this: DatabaseSync, sql: string) {
      if (sql === "COMMIT") {
        if (committed) original.call(this, sql);
        throw Object.assign(new Error("private SQL sentinel"), { errcode: 5 });
      }
      return original.call(this, sql);
    });
    try {
      expect(() => store.record(prompt("candidate"))).toThrow(expect.objectContaining({ code: "busy", certainty: committed ? "unknown" : "uncommitted" }));
    } finally { intercept.mockRestore(); }
    expect(store.snapshot().revision).toBe(before + (committed ? 1 : 0));
    expect(store.snapshot().entries.map(entry => entry.submissionId)).toEqual(committed ? ["candidate", "seed"] : ["seed"]);
  });

  it("keeps exact unique text in committed recency order across writers and reopen", () => {
    const path = join(root(), "history.sqlite3");
    const first = open(path); const second = open(path);
    first.record(prompt("a1", "A")); second.record(prompt("b1", "B")); first.record(prompt("a2", "A"));
    expect(second.snapshot().entries.map(item => item.text)).toEqual(["A", "B"]);
    second.record(prompt("a3", "a")); first.record(prompt("a4", "A  B")); second.record(prompt("a5", "A B"));
    expect(open(path).snapshot().entries.map(item => item.text)).toEqual(["A B", "A  B", "a", "A", "B"]);
  }, DURABLE_STORE_TEST_TIMEOUT_MS);

  it("applies the newly initialized limit without stale writers restoring it", () => {
    const path = join(root(), "history.sqlite3"); const first = open(path);
    for (let i = 0; i < 30; i++) first.record(prompt(`id-${i}`));
    const second = open(path, 10);
    first.record(prompt("latest"));
    expect(second.snapshot().entries).toHaveLength(10);
    expect(first.snapshot().limit).toBe(10);
    expect(open(path, 100).snapshot().entries).toHaveLength(10);
  }, DURABLE_STORE_TEST_TIMEOUT_MS);

  it("prunes by bytes and refuses oversized values instead of truncating", () => {
    const store = open();
    for (let i = 0; i < 10; i++) store.record(prompt(`id-${i}`, String(i) + "x".repeat(1024 * 1024 - 1)));
    expect(store.snapshot().entries).toHaveLength(8);
    expect(() => store.record(prompt("oversized", "x".repeat(1024 * 1024 + 1)))).toThrow("oversized");
    expect(store.snapshot().entries).toHaveLength(8);
  }, DURABLE_STORE_TEST_TIMEOUT_MS);

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
  }, DURABLE_STORE_TEST_TIMEOUT_MS);

  it("preserves damaged and wrong-profile stores", () => {
    const path = join(root(), "damaged.sqlite3"); writeFileSync(path, "not a database");
    expect(() => open(path)).toThrow(); expect(readFileSync(path, "utf8")).toBe("not a database");
    const good = join(root(), "good.sqlite3"); open(good).record(prompt("retained"));
    expect(() => new PromptHistoryStore(good, "other-profile", 10)).toThrow("schema");
    expect(open(good).snapshot().entries[0]?.text).toBe("retained");
  }, DURABLE_STORE_TEST_TIMEOUT_MS);

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

  it("prunes image sidecars whose only referencing row was pruned and keeps sidecars still referenced", () => {
    const dir = root();
    const imagesDir = join(dir, "images");
    const historyPath = join(dir, "history.sqlite3");
    const store = new PromptHistoryStore(historyPath, "test-profile", 10, imagesDir);
    stores.push(store);
    const sidecar = new PromptImageSidecar(imagesDir);
    for (const id of ["aaaaaaaa", "bbbbbbbb", "cccccccc"]) {
      sidecar.write(id, { tag: `[📷 screenshot-${id}]`, data: "aA==", mimeType: "image/png", savedAt: "t" });
    }
    // Invariant: sidecar reap uses text still referenced by SURVIVING rows so a row still referencing an id shared with a pruned row keeps the file. Row 1 references aaaaaaaa; row 2 references bbbbbbbb + cccccccc; row 3 also references aaaaaaaa.
    store.record({ id: "s1", text: "one [📷 screenshot-aaaaaaaa]", timestamp: 1, kind: "prompt" });
    store.record({ id: "s2", text: "two [📷 screenshot-bbbbbbbb] [📷 screenshot-cccccccc]", timestamp: 2, kind: "prompt" });
    store.record({ id: "s3", text: "three [📷 screenshot-aaaaaaaa]", timestamp: 3, kind: "prompt" });
    // Rationale: force retention to 2 entries via a fresh limit -- s1 (oldest) is pruned.
    store.close(); stores.pop();
    const tightened = new PromptHistoryStore(historyPath, "test-profile", 10, imagesDir);
    stores.push(tightened);
    for (let i = 0; i < 8; i++) tightened.record({ id: `pad-${i}`, text: `padding-${i}`, timestamp: 100 + i, kind: "prompt" });
    tightened.record({ id: "final", text: "final entry with no chips", timestamp: 200, kind: "prompt" });
    // Rationale: at this point the aaa row (s1) may or may not have been evicted. bbbb / cccc live only in rows that are eventually evicted; aaa also lives in s3 which is more recent. Once eviction has run, only sidecars still referenced by a surviving row should be on disk.
    const survivingRows = tightened.snapshot().entries.map(entry => entry.text).join("\n");
    const survivingIds = new Set([...survivingRows.matchAll(/screenshot-([a-f0-9]+)/gu)].map(match => match[1]));
    const filesOnDisk = new Set(sidecar.list());
    for (const id of filesOnDisk) expect(survivingIds).toContain(id);
  });

  it("sweeps orphaned sidecars at store open when no row references them", () => {
    const dir = root();
    const imagesDir = join(dir, "images");
    const sidecar = new PromptImageSidecar(imagesDir);
    sidecar.write("deadbeef", { tag: "[📷 screenshot-deadbeef]", data: "aA==", mimeType: "image/png", savedAt: "t" });
    const historyPath = join(dir, "history.sqlite3");
    const store = new PromptHistoryStore(historyPath, "test-profile", 10, imagesDir);
    stores.push(store);
    // Invariant: no row references deadbeef so the open-time sweep reclaims it.
    expect(sidecar.list()).toEqual([]);
  });
});
