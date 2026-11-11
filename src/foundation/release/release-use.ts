import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { resolveProductPaths } from "../lifecycle/index.js";
import { ReleaseStateStore, isReleaseStateNewerError, releaseUseIsLive, type ReleaseUseClaim } from "./release-state.js";

/** Mutable installed entries are not GC-managed; immutable helper processes need their own claim. */
async function claimReleaseEntry(entry: string, environment: NodeJS.ProcessEnv) {
  const dataDir = resolveProductPaths(environment).dataDir;
  const root = await realpath(dirname(dirname(resolve(entry))));
  const storeRoot = await realpath(resolve(dataDir, "releases")).catch(() => undefined);
  if (dirname(root) !== storeRoot) return undefined;
  try {
    return await acquireReleaseUse(dataDir, basename(root));
  } catch (error) {
    // Compatibility: a newer release owns state this code may not write. It retains releases it
    // cannot prove unused, so the launch proceeds without a claim rather than failing.
    if (isReleaseStateNewerError(error)) return undefined;
    throw error;
  }
}

export async function spawnReleaseEntry(entry: string, args: readonly string[], options: SpawnOptions): Promise<ChildProcess & { releaseSettled: Promise<void> }> {
  const use = await claimReleaseEntry(entry, options.env ?? process.env);
  try {
    const child = spawn(process.execPath, [entry, ...args], options);
    const releaseSettled = use?.track(child) ?? Promise.resolve();
    // Concurrency: detached callers need no waiter; awaited callers still observe release failures.
    void releaseSettled.catch(() => undefined);
    return Object.assign(child, { releaseSettled });
  } catch (error) { await use?.release(); throw error; }
}

/** A durable launch reservation closes selection/collection and spawn/handoff races. */
export async function acquireReleaseUse(dataDir: string, releaseId: string) {
  const store = new ReleaseStateStore(dataDir);
  const token = randomUUID();
  await store.update(state => {
    if (!state.releases[releaseId]) throw new Error("Selected release is no longer available for launch");
    const uses = Object.fromEntries(Object.entries(state.uses ?? {}).filter(([, claim]) => releaseUseIsLive(claim)));
    return { ...state, uses: { ...uses, [token]: { releaseId, pid: process.pid, phase: "launching" as const } } };
  });
  let released = false;
  return {
    track(child: ChildProcess): Promise<void> {
      let handoff = Promise.resolve();
      child.once("spawn", () => { handoff = this.started(child.pid!).catch(() => undefined); });
      return new Promise<void>((resolve, reject) => {
        child.once("close", () => { void handoff.then(() => this.release()).then(resolve, reject); });
      });
    },
    async started(pid: number): Promise<void> {
      if (!Number.isSafeInteger(pid) || pid <= 0 || released) throw new Error("Invalid release process handoff");
      await store.update(state => {
        if (!state.uses?.[token]) throw new Error("Release launch reservation was lost");
        const claim: ReleaseUseClaim = { releaseId, pid, phase: "running" };
        return { ...state, uses: { ...state.uses, [token]: claim } };
      });
    },
    async release(): Promise<void> {
      if (released) return;
      try {
        await store.update(state => {
          const uses = { ...state.uses }; delete uses[token];
          return { ...state, uses };
        });
      } catch (error) {
        // Compatibility: once a newer release owns the state, it settles this claim by process liveness.
        if (!isReleaseStateNewerError(error)) throw error;
      }
      released = true;
    },
  };
}
