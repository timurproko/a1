import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { tryAcquireClaimGate } from "../../../src/foundation/lifecycle/claim-gate.js";
import { PID_LIVENESS_IDENTITY, inspectLiveProcess } from "../../../src/foundation/lifecycle/process-liveness.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("worktree claim gate", () => {
  it("admits one holder at a time and reports contention as null", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-claim-gate-")); roots.push(root);
    const authority = join(root, "mutation.authority");
    const first = tryAcquireClaimGate(authority);
    expect(first).not.toBeNull();
    expect(tryAcquireClaimGate(authority)).toBeNull();
    first!.release();
    first!.release();
    const second = tryAcquireClaimGate(authority);
    expect(second).not.toBeNull();
    second!.release();
  });
});

describe("process liveness", () => {
  it("observes this process and rejects pids that cannot exist", async () => {
    await expect(inspectLiveProcess(process.pid)).resolves.toEqual({ pid: process.pid, startIdentity: PID_LIVENESS_IDENTITY });
    await expect(inspectLiveProcess(0)).resolves.toBeNull();
    await expect(inspectLiveProcess(-1)).resolves.toBeNull();
    await expect(inspectLiveProcess(2 ** 31 - 2)).resolves.toBeNull();
  });
});
