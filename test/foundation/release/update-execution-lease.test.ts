import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  UPDATE_EXECUTION_LEASE_FILENAME,
  acquireUpdateExecutionLease,
  readUpdateExecutionOwner,
  reclaimDeadLease,
} from "../../../src/foundation/release/update-execution-lease.js";
import { UpdateTransactionStore } from "../../../src/foundation/release/update-transaction.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function root(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), "a1-update-lease-"));
  roots.push(value);
  return value;
}

const input = (dataDir: string) => ({
  dataDir,
  packageRoot: resolve(dataDir, "npm", "@timurproko", "a1"),
  channel: "stable" as const,
  targetVersion: "1.2.3",
  mode: "manual" as const,
});

describe("update execution lease", () => {
  it("allows one owner, reports its target to contenders, and releases by identity", async () => {
    const dataDir = await root();
    const first = await acquireUpdateExecutionLease(input(dataDir));
    expect(first.status).toBe("acquired");
    if (first.status !== "acquired") return;

    const second = await acquireUpdateExecutionLease({ ...input(dataDir), targetVersion: "1.2.4", mode: "automatic" });
    expect(second).toMatchObject({ status: "busy", owner: { ownerId: first.owner.ownerId, targetVersion: "1.2.3" } });
    await first.release();
    expect(await readUpdateExecutionOwner(dataDir)).toBeNull();

    const third = await acquireUpdateExecutionLease({ ...input(dataDir), targetVersion: "1.2.4" });
    expect(third.status).toBe("acquired");
    if (third.status === "acquired") await third.release();
  });

  it("elects only one owner when automatic workers contend concurrently", async () => {
    const dataDir = await root();
    const contenders = await Promise.all([
      acquireUpdateExecutionLease({ ...input(dataDir), mode: "automatic" }),
      acquireUpdateExecutionLease({ ...input(dataDir), mode: "automatic" }),
    ]);
    expect(contenders.filter(result => result.status === "acquired")).toHaveLength(1);
    expect(contenders.filter(result => result.status === "busy")).toHaveLength(1);
    const acquired = contenders.find(result => result.status === "acquired");
    if (acquired?.status === "acquired") await acquired.release();
  });

  it("recovers a dead stale owner before acquiring", async () => {
    const dataDir = await root();
    await writeFile(join(dataDir, UPDATE_EXECUTION_LEASE_FILENAME), JSON.stringify({
      schema: 1,
      ownerId: "dead-owner",
      pid: 2_000_000_000,
      pidStartIdentity: "dead-start",
      packageRoot: resolve(dataDir, "old-package"),
      channel: "stable",
      targetVersion: "1.2.2",
      mode: "automatic",
      acquiredAt: new Date(0).toISOString(),
    }));

    const acquired = await acquireUpdateExecutionLease(input(dataDir));
    expect(acquired.status).toBe("acquired");
    if (acquired.status !== "acquired") return;
    expect(acquired.owner.ownerId).not.toBe("dead-owner");
    expect(JSON.parse(await readFile(join(dataDir, UPDATE_EXECUTION_LEASE_FILENAME), "utf8"))).toMatchObject({ ownerId: acquired.owner.ownerId });
    await acquired.release();
  });

  it("hands a dead owner's foreign transaction to a manual caller and keeps automatic callers out", async () => {
    const dataDir = await root();
    const ownerInput = input(dataDir);
    const transaction = new UpdateTransactionStore(dataDir);
    await transaction.begin({
      channel: ownerInput.channel,
      targetVersion: ownerInput.targetVersion,
      packageRoot: ownerInput.packageRoot,
      priorActiveReleaseId: null,
    });
    const path = join(dataDir, UPDATE_EXECUTION_LEASE_FILENAME);
    const recorded = {
      schema: 1,
      ownerId: "dead-owner",
      pid: 2_000_000_000,
      pidStartIdentity: "dead-start",
      packageRoot: ownerInput.packageRoot,
      channel: ownerInput.channel,
      targetVersion: ownerInput.targetVersion,
      mode: "automatic",
      acquiredAt: new Date(0).toISOString(),
    };
    await writeFile(path, JSON.stringify(recorded));

    // Invariant: automatic work never settles another target's transaction.
    await expect(acquireUpdateExecutionLease({ ...ownerInput, targetVersion: "1.2.4", mode: "automatic" })).resolves.toMatchObject({
      status: "busy",
      owner: { ownerId: "dead-owner", targetVersion: "1.2.3" },
    });
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(recorded);

    // Rationale: a manual caller learns which transaction was interrupted so it can roll it back,
    // and nothing is rewritten until it does.
    const interrupted = await acquireUpdateExecutionLease({ ...ownerInput, targetVersion: "1.2.4" });
    expect(interrupted).toMatchObject({
      status: "interrupted",
      owner: { ownerId: "dead-owner", targetVersion: "1.2.3" },
      transaction: { targetVersion: "1.2.3", status: "active" },
    });
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(recorded);

    await transaction.finish("rolled-back", "settled by test");
    await transaction.clearCompleted();
    await reclaimDeadLease(dataDir, recorded as Parameters<typeof reclaimDeadLease>[1]);
    await expect(readUpdateExecutionOwner(dataDir)).resolves.toBeNull();
    const acquired = await acquireUpdateExecutionLease({ ...ownerInput, targetVersion: "1.2.4" });
    expect(acquired.status).toBe("acquired");
    if (acquired.status === "acquired") await acquired.release();
  });

  it("fails closed without replacing malformed ownership state", async () => {
    const dataDir = await root();
    const path = join(dataDir, UPDATE_EXECUTION_LEASE_FILENAME);
    await writeFile(path, "{not-json");
    await expect(acquireUpdateExecutionLease(input(dataDir))).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("{not-json");
  });

  it("conservatively retains a live pid even when its recorded start identity differs", async () => {
    const dataDir = await root();
    await writeFile(join(dataDir, UPDATE_EXECUTION_LEASE_FILENAME), JSON.stringify({
      schema: 1,
      ownerId: "live-owner",
      pid: process.pid,
      pidStartIdentity: "different-generation",
      packageRoot: resolve(dataDir, "old-package"),
      channel: "next",
      targetVersion: "1.2.3-dev.4",
      mode: "manual",
      acquiredAt: new Date(0).toISOString(),
    }));

    await expect(acquireUpdateExecutionLease(input(dataDir))).resolves.toMatchObject({
      status: "busy",
      owner: { ownerId: "live-owner", pid: process.pid },
    });
  });
});
