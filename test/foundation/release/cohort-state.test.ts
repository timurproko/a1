import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CohortStateStore, emptyState, RELEASE_COHORT_SCHEMA } from "../../../src/foundation/release/index.js";
import type { MaterializedRelease } from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("atomic release references", () => {
  it("persists candidate, approval, active, rollback, and retention references", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-cohort-state-"));
    roots.push(root);
    const store = new CohortStateStore(root);
    const first = release("1.0.0", "1");
    const second = release("1.1.0", "2");

    await store.recordCandidate(first);
    await expect(store.activate(first.releaseId)).rejects.toThrow(/unverified/);
    await store.approve(first.releaseId, "first-verdict.json");
    await store.activate(first.releaseId);
    await store.recordCandidate(second);
    await store.approve(second.releaseId, "second-verdict.json");
    const activated = await store.activate(second.releaseId);

    expect(activated.references).toEqual({
      active: second.releaseId,
      pending: null,
      approved: second.releaseId,
      rollback: first.releaseId,
      retention: [first.releaseId, second.releaseId],
    });
    expect((await store.read()).revision).toBe(6);
  });

  it("rolls back only to a retained approved release and protects referenced releases from collection", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-cohort-rollback-"));
    roots.push(root);
    const store = new CohortStateStore(root);
    const first = release("1.0.0", "4");
    const second = release("1.1.0", "5");
    await store.recordCandidate(first);
    await store.approve(first.releaseId, "first.json");
    await store.activate(first.releaseId);
    await store.recordCandidate(second);
    await store.approve(second.releaseId, "second.json");
    await store.activate(second.releaseId);

    await expect(store.rollback(false)).rejects.toThrow(/ownership is released/);
    const rolledBack = await store.rollback(true);
    expect(rolledBack.references).toMatchObject({ active: first.releaseId, rollback: second.releaseId });
    await expect(store.removeUnreferencedRelease(second.releaseId, [])).rejects.toThrow(/still referenced/);

    await store.setRetention([first.releaseId]);
    await expect(store.removeUnreferencedRelease(second.releaseId, [])).rejects.toThrow(/still referenced/);
  });

  it("rejects a legacy release cohort schema without migration", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-cohort-legacy-schema-"));
    roots.push(root);
    const store = new CohortStateStore(root);
    await writeFile(store.path, JSON.stringify({ ...emptyState(), schema: "addone-release-cohort-v1" }));

    expect(RELEASE_COHORT_SCHEMA).toBe("a1-release-cohort-v1");
    await expect(store.read()).rejects.toThrow(/invalid release cohort state/);
  });

  it("durably records activation blockers", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-cohort-block-"));
    roots.push(root);
    const store = new CohortStateStore(root);
    const candidate = release("2.0.0", "3");
    await store.recordCandidate(candidate);
    const blocked = await store.blockPending("busy non-resumable foreground generation", ["generation-live"]);
    expect(blocked.activation).toMatchObject({ state: "blocked", blockerGenerationIds: ["generation-live"] });
    expect((await store.read()).activation.reason).toBe("busy non-resumable foreground generation");
  });
});

function release(version: string, seed: string): MaterializedRelease {
  const digest = seed.repeat(64).slice(0, 64);
  return {
    packageName: "@timurproko/a1",
    packageVersion: version,
    contentDigest: digest,
    releaseId: `${version}-${digest.slice(0, 20)}`,
    packageRoot: `/package/${version}`,
    releaseRoot: `/data/releases/${version}`,
    files: [{ path: "bin/a1-ui.js", bytes: 1, sha256: "0".repeat(64), executable: true }],
  };
}
