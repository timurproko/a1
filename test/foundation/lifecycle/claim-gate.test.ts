import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import lockfile from "proper-lockfile";
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

it("does not let a legacy lease writer reclaim the new gate even with an old timestamp", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-gate-legacy-")); roots.push(root);
  const authority = join(root, "mutation.authority"), held = tryAcquireClaimGate(authority)!;
  try {
    const old = new Date(Date.now() - 60_000); await utimes(`${authority}.gate`, old, old);
    expect(() => lockfile.lockSync(authority, { realpath: false, lockfilePath: `${authority}.gate`, stale: 10_000 })).toThrow();
    expect(tryAcquireClaimGate(authority)).toBeNull();
  } finally { held.release(); }
  const next = tryAcquireClaimGate(authority); expect(next).not.toBeNull(); next!.release();
});

it("retains authority rather than following linked child metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-gate-link-")); roots.push(root);
  const authority = join(root, "mutation.authority"), external = join(root, "external"), held = tryAcquireClaimGate(authority)!;
  await mkdir(external); await writeFile(join(external, "sentinel"), "retain");
  await symlink(external, `${authority}.gate.children`, process.platform === "win32" ? "junction" : "dir");
  expect(() => held.release()).toThrow(expect.objectContaining({ code: "worktree-coordination-boundary" }));
  expect(tryAcquireClaimGate(authority)).toBeNull(); expect(await readFile(join(external, "sentinel"), "utf8")).toBe("retain");
});

describe("process liveness", () => {
  it("observes this process and rejects pids that cannot exist", async () => {
    await expect(inspectLiveProcess(process.pid)).resolves.toEqual({ pid: process.pid, startIdentity: PID_LIVENESS_IDENTITY });
    await expect(inspectLiveProcess(0)).resolves.toBeNull();
    await expect(inspectLiveProcess(-1)).resolves.toBeNull();
    await expect(inspectLiveProcess(2 ** 31 - 2)).resolves.toBeNull();
  });
});
