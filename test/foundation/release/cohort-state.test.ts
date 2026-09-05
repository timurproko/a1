import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CohortStateStore, emptyState, planProtectedReleases, RELEASE_COHORT_SCHEMA } from "../../../src/foundation/release/index.js";
import type { CohortState, MaterializedRelease } from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("atomic release references", () => {
  it("persists candidate, approval, active, and rollback without appending activation history", async () => {
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
      retention: [],
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

  it("reconciles a large legacy retention list to current typed ownership", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-cohort-migration-"));
    roots.push(root);
    const store = new CohortStateStore(root);
    const releases = Array.from({ length: 40 }, (_, index) => release(`1.0.${index}`, String(index + 1)));
    const active = releases[39]!;
    const rollback = releases[38]!;
    const live = releases[7]!;
    const held = releases[11]!;
    const timestamp = new Date(0).toISOString();
    // Performance: seed the legacy snapshot once instead of replaying 121 durable updates;
    // candidate, approval, and activation transitions have dedicated coverage above.
    const legacyState = {
      schema: RELEASE_COHORT_SCHEMA,
      revision: 121,
      releases: Object.fromEntries(releases.map(candidate => [candidate.releaseId, {
        releaseId: candidate.releaseId,
        releaseRoot: candidate.releaseRoot,
        packageVersion: candidate.packageVersion,
        contentDigest: candidate.contentDigest,
        approval: "approved" as const,
        materializedAt: timestamp,
        certifiedAt: timestamp,
        diagnosticsPath: `${candidate.releaseId}.json`,
      }])),
      references: {
        active: active.releaseId,
        pending: null,
        approved: active.releaseId,
        rollback: rollback.releaseId,
        retention: releases.map(candidate => candidate.releaseId),
      },
      activation: { state: "idle", reason: null, blockerGenerationIds: [], updatedAt: timestamp },
    } satisfies Omit<CohortState, "cleanup">;
    await writeFile(store.path, JSON.stringify(legacyState));

    const reconciled = await store.reconcileRetention(() => ({
      liveReleaseIds: [live.releaseId],
      externalHolds: [{ authority: "migration", releaseId: held.releaseId }],
      transaction: { status: "active", priorActiveReleaseId: rollback.releaseId },
    }));

    expect(reconciled.plan.retainedReleaseIds).toEqual([active.releaseId, live.releaseId, held.releaseId, rollback.releaseId].sort());
    expect(Object.keys(reconciled.state.releases).sort()).toEqual(reconciled.plan.retainedReleaseIds);
    expect(Object.keys(reconciled.state.cleanup.pending)).toHaveLength(36);
    expect(reconciled.state.references.retention).toEqual(reconciled.plan.retainedReleaseIds);
    expect(reconciled.state.revision).toBe(legacyState.revision + 1);
    expect(JSON.parse(await readFile(store.path, "utf8"))).toEqual(reconciled.state);
  });

  it("produces deterministic protection and rejects unknown typed holds", () => {
    const first = release("1.0.0", "8");
    const state = {
      ...emptyState(),
      releases: { [first.releaseId]: { ...first, approval: "approved" as const, materializedAt: new Date(0).toISOString(), certifiedAt: new Date(0).toISOString(), diagnosticsPath: null } },
      references: { ...emptyState().references, active: first.releaseId },
    };
    expect(planProtectedReleases(state, { liveReleaseIds: [first.releaseId, first.releaseId] }).protectedReleaseIds).toEqual([first.releaseId]);
    expect(() => planProtectedReleases(state, { externalHolds: [{ authority: "agent", releaseId: "missing" }] })).toThrow(/unknown release/);
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
    files: [{ path: "bin/ui.js", bytes: 1, sha256: "0".repeat(64), executable: true }],
  };
}
