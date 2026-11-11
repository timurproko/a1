import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ReleaseStateNewerError,
  ReleaseStateStore,
  RELEASE_STATE_LEVEL,
  RELEASE_STATE_SCHEMA,
  emptyState,
  runReleaseCleanupWorker,
  scheduleReleaseCleanup,
} from "../../../src/foundation/release/index.js";
import { acquireReleaseUse } from "../../../src/foundation/release/release-use.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function dataRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-compat-"));
  roots.push(root);
  return root;
}

function sharingViolation(): Error {
  return Object.assign(new Error("EPERM: operation not permitted, rename"), { code: "EPERM" });
}

describe("release state compatibility levels", () => {
  it("keeps the family identifier that published releases read", () => {
    // Protocol: published 0.2.7-dev.1285 requires exactly this identifier; changing it breaks its updates.
    expect(RELEASE_STATE_SCHEMA).toBe("a1-release-cohort-v2");
    expect(RELEASE_STATE_LEVEL).toBe(1);
  });

  it("treats state without levels as level 1 and records the levels on write", async () => {
    const store = new ReleaseStateStore(await dataRoot());
    await writeFile(store.path, JSON.stringify(emptyState()));
    const written = await store.update(state => state);
    expect(written.format).toEqual({ read: 1, write: 1 });
    expect(JSON.parse(await readFile(store.path, "utf8"))).toMatchObject({ schema: RELEASE_STATE_SCHEMA, format: { read: 1, write: 1 } });
  });

  it("preserves fields a newer release added at the same levels", async () => {
    const store = new ReleaseStateStore(await dataRoot());
    await writeFile(store.path, JSON.stringify({ ...emptyState(), format: { read: 1, write: 1 }, futureLedger: { kept: true } }));
    await store.update(state => ({ ...state, cleanup: { ...state.cleanup, diagnostics: [] } }));
    expect(JSON.parse(await readFile(store.path, "utf8"))).toMatchObject({ futureLedger: { kept: true }, revision: 1 });
  });

  it("reads but refuses to write state that requires a higher write level", async () => {
    const store = new ReleaseStateStore(await dataRoot());
    const original = JSON.stringify({ ...emptyState(), revision: 7, format: { read: 1, write: 2 } });
    await writeFile(store.path, original);
    await expect(store.read()).resolves.toMatchObject({ revision: 7 });
    await expect(store.update(state => state)).rejects.toBeInstanceOf(ReleaseStateNewerError);
    expect(await readFile(store.path, "utf8")).toBe(original);
  });

  it("refuses to read state that requires a higher read level, naming the newer release", async () => {
    const store = new ReleaseStateStore(await dataRoot());
    await writeFile(store.path, JSON.stringify({ ...emptyState(), format: { read: 2, write: 2 }, releases: "reshaped" }));
    await expect(store.read()).rejects.toThrow(/requires read level 2.*newer release owns it/);
  });

  it("keeps recorded levels even when an operation drops them", async () => {
    const store = new ReleaseStateStore(await dataRoot());
    await writeFile(store.path, JSON.stringify({ ...emptyState(), format: { read: 1, write: 1 } }));
    const written = await store.update(({ format: _dropped, ...state }) => state);
    expect(JSON.parse(await readFile(store.path, "utf8")).format).toEqual({ read: 1, write: 1 });
    expect(written.format).toEqual({ read: 1, write: 1 });
  });

  it("rejects malformed levels", async () => {
    const store = new ReleaseStateStore(await dataRoot());
    await writeFile(store.path, JSON.stringify({ ...emptyState(), format: { read: "1", write: 1 } }));
    await expect(store.read()).rejects.toThrow("invalid release state format");
  });

  it("skips cleanup scheduling and launch claims instead of failing on newer state", async () => {
    const root = await dataRoot();
    const store = new ReleaseStateStore(root);
    const original = JSON.stringify({ ...emptyState(), format: { read: 1, write: 2 } });
    await writeFile(store.path, original);
    const paths = { dataDir: root, runtimeDir: resolve(root, "runtime"), configDir: resolve(root, "config") } as Parameters<typeof scheduleReleaseCleanup>[1];
    await expect(scheduleReleaseCleanup(root, paths, { workerSpawner: async () => { throw new Error("must not spawn"); } })).resolves.toBeUndefined();
    await expect(acquireReleaseUse(root, "1.0.0-11111111111111111111")).rejects.toBeInstanceOf(ReleaseStateNewerError);
    expect(await readFile(store.path, "utf8")).toBe(original);
  });

  it("stands a cleanup worker down once a newer release owns the state", async () => {
    const root = await dataRoot();
    const store = new ReleaseStateStore(root);
    const original = JSON.stringify({ ...emptyState(), format: { read: 1, write: 2 } });
    await writeFile(store.path, original);
    const environment = {
      [PRODUCT_IDENTITY.environment.dataDir]: root,
      [PRODUCT_IDENTITY.environment.runtimeDir]: resolve(root, "runtime"),
      [PRODUCT_IDENTITY.environment.configDir]: resolve(root, "config"),
    };
    await expect(runReleaseCleanupWorker(environment)).resolves.toMatchObject({ attempted: 0, completed: 0 });
    expect(await readFile(store.path, "utf8")).toBe(original);
  });
});

describe("durable release state writes", () => {
  it("retries a transient Windows sharing failure and leaves no temporary file", async () => {
    const root = await dataRoot();
    const { rename } = await import("node:fs/promises");
    let refusals = 2;
    const store = new ReleaseStateStore(root, {
      platform: "win32",
      rename: async (from, to) => { if (refusals-- > 0) throw sharingViolation(); await rename(from, to); },
    });
    await expect(store.update(state => state)).resolves.toMatchObject({ revision: 1 });
    expect(refusals).toBe(-1);
    expect((await readdir(root)).filter(name => name.endsWith(".tmp"))).toEqual([]);
  });

  it("removes its temporary file when the replacement keeps failing", async () => {
    const root = await dataRoot();
    const store = new ReleaseStateStore(root, { platform: "linux", rename: async () => { throw sharingViolation(); } });
    await expect(store.update(state => state)).rejects.toThrow("EPERM");
    expect((await readdir(root)).filter(name => name.endsWith(".tmp"))).toEqual([]);
  });

  it("reclaims temporary files of writers that are gone and keeps a live writer's file", async () => {
    const root = await dataRoot();
    const dead = `release-state.json.2000000000.${"0".repeat(8)}-0000-0000-0000-${"0".repeat(12)}.tmp`;
    const live = `release-state.json.${process.ppid}.${"1".repeat(8)}-1111-1111-1111-${"1".repeat(12)}.tmp`;
    await writeFile(resolve(root, dead), "{}");
    await writeFile(resolve(root, live), "{}");
    await new ReleaseStateStore(root).update(state => state);
    const remaining = await readdir(root);
    expect(remaining).not.toContain(dead);
    expect(remaining).toContain(live);
  });
});
