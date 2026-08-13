import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UpdateTransactionStore } from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("durable update transaction journal", () => {
  it("resumes the same target and advances monotonically through every durable phase", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-update-journal-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    const begun = await store.begin({ channel: "next", targetVersion: "1.2.0-dev.1", packageRoot: "/npm/addone", priorActiveReleaseId: "old" });
    expect((await store.begin({ channel: "next", targetVersion: "1.2.0-dev.1", packageRoot: "/npm/addone", priorActiveReleaseId: "old" })).transactionId).toBe(begun.transactionId);

    for (const phase of ["ownership-released", "package-installed", "materialized", "certified", "active-reference-committed", "supervisor-verified"] as const) {
      expect((await store.advance(phase)).phase).toBe(phase);
    }
    await store.finish("completed");
    await store.clearCompleted();
    expect(await store.read()).toBeNull();
  });

  it("rejects a mixed target while an update remains active and retains rollback evidence", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-update-journal-conflict-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    await store.begin({ channel: "stable", targetVersion: "1.2.0", packageRoot: "/npm/addone", priorActiveReleaseId: "old" });
    await expect(store.begin({ channel: "next", targetVersion: "1.3.0-dev.0", packageRoot: "/npm/addone", priorActiveReleaseId: "old" })).rejects.toThrow(/unfinished AddOne update/);
    const rolledBack = await store.finish("rolled-back", "candidate supervisor failed");
    expect(rolledBack).toMatchObject({ status: "rolled-back", priorActiveReleaseId: "old", error: "candidate supervisor failed" });
  });
});
