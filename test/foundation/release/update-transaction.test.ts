import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UPDATE_JOURNAL_SCHEMA, UpdateTransactionStore } from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("durable update transaction journal", () => {
  it("resumes the same target and advances monotonically through every durable phase", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-journal-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    const begun = await store.begin({ channel: "next", targetVersion: "1.2.0-dev.1", packageRoot: "/npm/a1", priorActiveReleaseId: "old" });
    expect((await store.begin({ channel: "next", targetVersion: "1.2.0-dev.1", packageRoot: "/npm/a1", priorActiveReleaseId: "old" })).transactionId).toBe(begun.transactionId);

    for (const phase of ["ownership-released", "package-installed", "materialized", "certified", "active-reference-committed", "supervisor-verified"] as const) {
      expect((await store.advance(phase)).phase).toBe(phase);
    }
    await store.finish("completed");
    await store.clearCompleted();
    expect(await store.read()).toBeNull();
  });

  it("rejects a legacy update journal schema without migration", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-legacy-schema-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    await writeFile(store.path, JSON.stringify({
      schema: "addone-update-journal-v1",
      transactionId: "legacy",
      channel: "stable",
      targetVersion: "1.2.0",
      packageRoot: "/npm/a1",
      priorActiveReleaseId: null,
      phase: "shutdown-intent",
      status: "active",
      error: null,
      startedAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    }));

    expect(UPDATE_JOURNAL_SCHEMA).toBe("a1-update-journal-v1");
    await expect(store.read()).rejects.toThrow(/invalid A1 update transaction journal/);
  });

  it("rejects a mixed target while an update remains active and retains rollback evidence", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-journal-conflict-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    await store.begin({ channel: "stable", targetVersion: "1.2.0", packageRoot: "/npm/a1", priorActiveReleaseId: "old" });
    await expect(store.begin({ channel: "next", targetVersion: "1.3.0-dev.0", packageRoot: "/npm/a1", priorActiveReleaseId: "old" })).rejects.toThrow(/A1 has unfinished update/);
    const rolledBack = await store.finish("rolled-back", "candidate supervisor failed");
    expect(rolledBack).toMatchObject({ status: "rolled-back", priorActiveReleaseId: "old", error: "candidate supervisor failed" });
  });
});
