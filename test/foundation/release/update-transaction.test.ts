import { mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
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

    for (const phase of ["ownership-released", "package-installed", "materialized", "certified", "active-reference-committed"] as const) {
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
    await expect(store.read()).rejects.toThrow(/invalid a1 update transaction journal/);
  });

  it.each(["EPERM", "EACCES", "EBUSY"])("retries transient Windows %s without removing committed journal bytes", async code => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-journal-retry-"));
    roots.push(root);
    const initial = new UpdateTransactionStore(root);
    await initial.begin({ channel: "stable", targetVersion: "1.2.0", packageRoot: "/npm/a1", priorActiveReleaseId: "old" });
    const committed = await readFile(initial.path, "utf8");
    let attempts = 0;
    const store = new UpdateTransactionStore(root, { platform: "win32", rename: async (from, to) => {
      if (++attempts < 3) {
        expect(await readFile(to, "utf8")).toBe(committed);
        throw Object.assign(new Error("sharing violation"), { code });
      }
      await rename(from, to);
    } });
    await expect(store.advance("ownership-released")).resolves.toMatchObject({ phase: "ownership-released" });
    expect(attempts).toBe(3);
    expect(await readdir(root)).toEqual(["update-transaction.json"]);
  });

  it("retains the committed journal and cleans its own temporary after permanent rename failure", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-journal-permanent-"));
    roots.push(root);
    const initial = new UpdateTransactionStore(root);
    await initial.begin({ channel: "stable", targetVersion: "1.2.0", packageRoot: "/npm/a1", priorActiveReleaseId: "old" });
    const committed = await readFile(initial.path, "utf8");
    const store = new UpdateTransactionStore(root, { platform: "win32", rename: async () => { throw Object.assign(new Error("locked"), { code: "EPERM" }); } });
    await expect(store.advance("ownership-released")).rejects.toThrow("locked");
    expect(await readFile(initial.path, "utf8")).toBe(committed);
    expect(await readdir(root)).toEqual(["update-transaction.json"]);
  });

  it("persists additive launcher-recovery state and rejects malformed dispositions", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-recovery-journal-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    await store.begin({ channel: "next", targetVersion: "1.2.0-dev.1", packageRoot: "/npm/a1", priorActiveReleaseId: "old" });
    await expect(store.setRecovery({
      capsulePath: "/data/update-recovery/transaction/capsule.json",
      status: "running",
      guardianPid: 42,
      guardianStartIdentity: "42:start",
      cancellationRequested: true,
      launcherDisposition: "pending",
    })).resolves.toMatchObject({ recovery: { status: "running", guardianPid: 42, cancellationRequested: true } });

    await writeFile(store.path, JSON.stringify({ ...(await store.read()), recovery: { status: "unknown" } }));
    await expect(store.read()).rejects.toThrow(/invalid a1 update transaction journal/);
  });

  it("rejects a mixed target while an update remains active and retains rollback evidence", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-journal-conflict-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    await store.begin({ channel: "stable", targetVersion: "1.2.0", packageRoot: "/npm/a1", priorActiveReleaseId: "old" });
    expect((await store.recordActiveError("npm failed\nwith detail")).error).toBe("npm failed with detail");
    await expect(store.begin({ channel: "next", targetVersion: "1.3.0-dev.0", packageRoot: "/npm/a1", priorActiveReleaseId: "old" })).rejects.toThrow(/a1 has unfinished update/);
    const rolledBack = await store.finish("rolled-back", "candidate warmup failed");
    expect(rolledBack).toMatchObject({ status: "rolled-back", priorActiveReleaseId: "old", error: "candidate warmup failed" });
  });

  it("reads a journal whose last phase predates the removal of supervision as committed activation", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-update-legacy-phase-"));
    roots.push(root);
    const store = new UpdateTransactionStore(root);
    const begun = await store.begin({ channel: "stable", targetVersion: "1.2.0", packageRoot: "/npm/a1", priorActiveReleaseId: "old" });
    await writeFile(store.path, JSON.stringify({ ...begun, phase: "supervisor-verified" }));
    await expect(store.read()).resolves.toMatchObject({ phase: "active-reference-committed", status: "active" });
  });
});
