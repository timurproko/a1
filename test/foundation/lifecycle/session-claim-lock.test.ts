import { mkdir, mkdtemp, open, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { claimMutationPending, withSessionClaimLock } from "../../../src/foundation/lifecycle/session-claim-lock.js";

const gates = vi.hoisted(() => ({ held: new Set<string>(), acquire: vi.fn() }));
vi.mock("../../../src/foundation/lifecycle/claim-gate.js", () => ({ tryAcquireClaimGate: (path: string) => {
  gates.acquire(path);
  if (gates.held.has(path)) return null;
  gates.held.add(path);
  return { release: () => { gates.held.delete(path); } };
} }));
const roots: string[] = [];
afterEach(async () => {
  gates.held.clear(); gates.acquire.mockReset();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-claim-gate-")); roots.push(root);
  return root;
}

describe("crash-recoverable claim coordination", () => {
  it.each([Buffer.alloc(0), Buffer.from('{"generation":'), Buffer.alloc(155), Buffer.alloc(20_000), Buffer.from('{"generation":"old"}')])("recovers abandoned owner bytes without parsing them (%#)", async bytes => {
    const root = await fixture();
    const barrier = join(root, "mutation.lock");
    await mkdir(barrier);
    await writeFile(join(barrier, "owner.json"), bytes);
    expect(await claimMutationPending(root)).toBe(true);
    await withSessionClaimLock(root, {}, async () => {
      expect(await claimMutationPending(root)).toBe(true);
      expect(JSON.parse(await readFile(join(barrier, "owner.json"), "utf8"))).toHaveProperty("generation");
    });
    expect(await claimMutationPending(root)).toBe(false);
    expect(await readdir(barrier)).toEqual(["recovery.json"]);
    expect(JSON.parse(await readFile(join(barrier, "recovery.json"), "utf8"))).toEqual({ reason: "abandoned-mutation-metadata", recoveredAt: expect.any(String) });
    await expect(open(barrier, "wx")).rejects.toMatchObject({ code: "EEXIST" });
  });

  it("recovers interrupted publication and bounds recovery history", async () => {
    const root = await fixture(), barrier = join(root, "mutation.lock");
    await mkdir(barrier);
    for (let iteration = 0; iteration < 3; iteration++) {
      await writeFile(join(barrier, "owner.next"), "partial");
      await writeFile(join(barrier, "recovery.next"), "partial");
      await withSessionClaimLock(root, {}, async () => {});
      expect(await readdir(barrier)).toEqual(["recovery.json"]);
    }
  });

  it("serializes racing recoverers and never lets old release remove a successor", async () => {
    const root = await fixture();
    let active = 0, maximum = 0;
    const mutate = () => withSessionClaimLock(root, {}, async () => {
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(await claimMutationPending(root)).toBe(true);
      active--;
    });
    await Promise.all([mutate(), mutate(), mutate()]);
    expect(maximum).toBe(1);
    expect(await claimMutationPending(root)).toBe(false);
  });

  it("bounds live contention, aborts waits, and does not touch held metadata", async () => {
    const root = await fixture();
    await withSessionClaimLock(root, {}, async () => {
      const before = await readFile(join(root, "mutation.lock", "owner.json"));
      await expect(withSessionClaimLock(root, { lockTimeoutMs: 5 }, async () => {})).rejects.toMatchObject({ code: "worktree-claim-busy" });
      const controller = new AbortController();
      const pending = withSessionClaimLock(root, { signal: controller.signal }, async () => {});
      controller.abort();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(await readFile(join(root, "mutation.lock", "owner.json"))).toEqual(before);
    });
  });

  it("retains malformed legacy files, unknown entries and nested directories", async () => {
    const root = await fixture(), barrier = join(root, "mutation.lock");
    await writeFile(barrier, Buffer.alloc(155));
    await expect(withSessionClaimLock(root, {}, async () => {})).rejects.toMatchObject({ code: "worktree-legacy-recovery-required" });
    expect(await readFile(barrier)).toEqual(Buffer.alloc(155));
    await rm(barrier); await mkdir(barrier); await mkdir(join(barrier, "owner.json"));
    await expect(withSessionClaimLock(root, {}, async () => {})).rejects.toMatchObject({ code: "worktree-coordination-boundary" });
    await rm(join(barrier, "owner.json"), { recursive: true }); await writeFile(join(barrier, "foreign"), "retain");
    await expect(withSessionClaimLock(root, {}, async () => {})).rejects.toMatchObject({ code: "worktree-coordination-boundary" });
    expect(await readFile(join(barrier, "foreign"), "utf8")).toBe("retain");
  });

  it("does not follow a linked mutation barrier", async () => {
    const root = await fixture(), target = join(root, "external");
    await mkdir(target);
    await writeFile(join(target, "owner.json"), "retain");
    await symlink(target, join(root, "mutation.lock"), process.platform === "win32" ? "junction" : "dir");
    await expect(withSessionClaimLock(root, {}, async () => {})).rejects.toMatchObject({ code: "worktree-coordination-boundary" });
    expect(await readFile(join(target, "owner.json"), "utf8")).toBe("retain");
  });

  it("preserves application errors and releases authority on failure", async () => {
    const root = await fixture(), failure = Object.assign(new Error("runtime unavailable"), { code: "session-runtime-unavailable" });
    await expect(withSessionClaimLock(root, {}, async () => { throw failure; })).rejects.toBe(failure);
    expect(gates.held.size).toBe(0);
    expect(await claimMutationPending(root)).toBe(false);
    await withSessionClaimLock(root, {}, async () => {});
  });

  it("classifies an inaccessible claim-store path without calling the gate", async () => {
    const root = await fixture(), file = join(root, "not-a-directory");
    await writeFile(file, "retain");
    await expect(withSessionClaimLock(file, {}, async () => {})).rejects.toMatchObject({ code: "worktree-coordination-io" });
    expect(gates.acquire).not.toHaveBeenCalled();
    expect(await readFile(file, "utf8")).toBe("retain");
  });

  it("does not turn gate failure into busy or enter the mutation", async () => {
    const root = await fixture(), mutate = vi.fn();
    gates.acquire.mockImplementationOnce(() => { throw Object.assign(new Error("io"), { code: "worktree-coordination-io" }); });
    await expect(withSessionClaimLock(root, {}, mutate)).rejects.toMatchObject({ code: "worktree-coordination-io" });
    expect(mutate).not.toHaveBeenCalled();
  });
});
