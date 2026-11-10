import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ReleaseStateStore, emptyState, planProtectedReleases, RELEASE_STATE_SCHEMA, withinRetention } from "../../../src/foundation/release/index.js";
import type { ReleaseState, MaterializedRelease } from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("atomic release references", () => {
  it("persists candidate, approval, and initial activation", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    const first = release("1.0.0", "1");

    const candidate = await store.recordCandidate(first);
    expect(candidate.releases[first.releaseId]?.approval).toBe("candidate");
    expect(candidate.references.pending).toBe(first.releaseId);
    expect(await store.read()).toEqual(candidate);
    await expect(store.activate(first.releaseId)).rejects.toThrow(/unverified/);
    expect(await store.read()).toEqual(candidate);
    const approved = await store.approve(first.releaseId, "first-verdict.json");
    expect(approved.releases[first.releaseId]).toMatchObject({ approval: "approved", diagnosticsPath: "first-verdict.json" });
    expect(await store.read()).toEqual(approved);
    const activated = await store.activate(first.releaseId);
    expect(activated.references).toEqual({ active: first.releaseId, pending: null, approved: first.releaseId, rollback: null, retention: [] });
    expect(activated.revision).toBe(3);
    expect(await store.read()).toEqual(activated);
  });

  it("certifies a replacement candidate without changing the active release", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-replacement-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    const first = release("1.0.0", "1");
    const second = release("1.1.0", "2");
    const seed = approvedState(first, first);
    await writeFile(store.path, JSON.stringify({
      ...seed,
      revision: 3,
      references: { ...seed.references, rollback: null },
    }));

    const candidate = await store.recordCandidate(second);
    expect(candidate.references).toEqual({ active: first.releaseId, pending: second.releaseId, approved: first.releaseId, rollback: null, retention: [] });
    expect(candidate.releases[second.releaseId]?.approval).toBe("candidate");
    expect(await store.read()).toEqual(candidate);
    const approved = await store.approve(second.releaseId, "second-verdict.json");
    expect(approved.references).toEqual({ ...candidate.references, approved: second.releaseId });
    expect(approved.releases[second.releaseId]).toMatchObject({ approval: "approved", diagnosticsPath: "second-verdict.json" });
    expect(approved.revision).toBe(5);
    expect(await store.read()).toEqual(approved);
  });

  it("replaces the active release without appending activation history", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-activate-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    const first = release("1.0.0", "1");
    const second = release("1.1.0", "2");
    // Performance: seed already-certified releases; the preceding test exercises their durable setup.
    const seed = approvedState(first, second);
    await writeFile(store.path, JSON.stringify({
      ...seed,
      revision: 5,
      references: { ...seed.references, active: first.releaseId, pending: second.releaseId, rollback: null },
    }));
    const activated = await store.activate(second.releaseId);

    expect(activated.references).toEqual({
      active: second.releaseId,
      pending: null,
      approved: second.releaseId,
      rollback: first.releaseId,
      retention: [],
    });
    expect(activated.revision).toBe(6);
    expect(await store.read()).toEqual(activated);
  });

  it("keeps ordinary launch monotonic while explicit activation can select an older target", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-monotonic-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    const older = release("1.0.0", "1");
    const active = release("1.1.0", "2");
    const newer = release("1.2.0", "3");
    const seed = approvedState(older, active);
    await writeFile(store.path, JSON.stringify(seed));

    const retained = await store.activateForLaunch(older.releaseId);
    expect(retained.references).toMatchObject({ active: active.releaseId, approved: active.releaseId, pending: null });

    await store.recordCandidate(newer);
    await store.approve(newer.releaseId, "newer-verdict.json");
    const advanced = await store.activateForLaunch(newer.releaseId);
    expect(advanced.references).toMatchObject({ active: newer.releaseId, rollback: active.releaseId });

    const explicitDowngrade = await store.activate(older.releaseId);
    expect(explicitDowngrade.references).toMatchObject({ active: older.releaseId, rollback: newer.releaseId });
  });

  it("rolls back only to a retained approved release", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-rollback-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    const first = release("1.0.0", "4");
    const second = release("1.1.0", "5");
    // Performance: rollback tests start from an independent committed snapshot, not six setup commits.
    const seed = approvedState(first, second);
    await writeFile(store.path, JSON.stringify(seed));
    expect(await store.read()).toEqual(seed);

    const rolledBack = await store.rollback();
    expect(rolledBack.references).toMatchObject({ active: first.releaseId, rollback: second.releaseId });
    expect(rolledBack.revision).toBe(7);
    expect(await store.read()).toEqual(rolledBack);
  });

  it("rejects a legacy release schema without migration", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-legacy-schema-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    await writeFile(store.path, JSON.stringify({ ...emptyState(), schema: "addone-release-cohort-v1" }));

    expect(RELEASE_STATE_SCHEMA).toBe("a1-release-cohort-v2");
    await expect(store.read()).rejects.toThrow(/invalid release state/);
  });

  it("upgrades v1 control state and retains legacy approved roots", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-claims-")); roots.push(root);
    const store = new ReleaseStateStore(root);
    const first = release("1.0.0", "1"), second = release("1.0.1", "2");
    const initial = approvedState(first, second);
    const { lifetimeClaims: _capability, ...legacy } = initial.releases[first.releaseId]!;
    await writeFile(store.path, JSON.stringify({ ...initial, schema: "a1-release-cohort-v1",
      releases: { ...initial.releases, [first.releaseId]: legacy },
      references: { ...initial.references, rollback: null },
    }));
    const state = await store.update(value => value);
    expect(state.schema).toBe(RELEASE_STATE_SCHEMA);
    expect(planProtectedReleases(state).retainedReleaseIds).toContain(first.releaseId);
    expect(JSON.parse(await readFile(store.path, "utf8")).schema).toBe("a1-release-cohort-v2");
  });

  it("reconciles a large legacy retention list to age-based retention", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-migration-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    const releases = Array.from({ length: 40 }, (_, index) => release(`1.0.${index}`, String(index + 1)));
    const active = releases[39]!;
    const rollback = releases[38]!;
    const own = releases[7]!;
    const recent = releases[11]!;
    const prior = releases[20]!;
    const now = Date.parse("2026-11-07T12:00:00.000Z");
    const timestamp = new Date(0).toISOString();
    // Performance: seed the legacy snapshot once instead of replaying 121 durable updates;
    // candidate, approval, and activation transitions have dedicated coverage above.
    const legacyState = {
      schema: RELEASE_STATE_SCHEMA,
      revision: 121,
      releases: Object.fromEntries(releases.map(candidate => [candidate.releaseId, {
        releaseId: candidate.releaseId,
        releaseRoot: candidate.releaseRoot,
        packageVersion: candidate.packageVersion,
        contentDigest: candidate.contentDigest,
        approval: "approved" as const,
        lifetimeClaims: true as const,
        materializedAt: timestamp,
        certifiedAt: candidate === recent ? new Date(now - 6 * 24 * 60 * 60 * 1_000).toISOString() : timestamp,
        diagnosticsPath: `${candidate.releaseId}.json`,
      }])),
      references: {
        active: active.releaseId,
        pending: null,
        approved: active.releaseId,
        rollback: rollback.releaseId,
        retention: releases.map(candidate => candidate.releaseId),
      },
    } satisfies Omit<ReleaseState, "cleanup">;
    // Compatibility: the supervisor-era activation record is accepted and dropped on write.
    await writeFile(store.path, JSON.stringify({ ...legacyState, activation: { state: "idle", reason: null, blockerGenerationIds: [], updatedAt: timestamp } }));

    const reconciled = await store.reconcileRetention(() => ({
      ownReleaseIds: [own.releaseId],
      transaction: { status: "active", priorActiveReleaseId: prior.releaseId },
      now,
    }));

    expect(reconciled.plan.retainedReleaseIds).toEqual([active.releaseId, rollback.releaseId, own.releaseId, recent.releaseId, prior.releaseId].sort());
    expect(Object.keys(reconciled.state.releases).sort()).toEqual(reconciled.plan.retainedReleaseIds);
    expect(Object.keys(reconciled.state.cleanup.pending)).toHaveLength(35);
    expect(reconciled.state).not.toHaveProperty("activation");
    expect(reconciled.state.references.retention).toEqual(reconciled.plan.retainedReleaseIds);
    expect(reconciled.state.revision).toBe(legacyState.revision + 1);
    expect(JSON.parse(await readFile(store.path, "utf8"))).toEqual(reconciled.state);
  });

  it("keeps selectors, the own release, and releases approved within seven days", () => {
    const now = Date.parse("2026-11-07T12:00:00.000Z");
    const day = 24 * 60 * 60 * 1_000;
    const at = (age: number) => new Date(now - age).toISOString();
    const active = release("1.0.0", "8");
    const fresh = release("1.0.1", "9");
    const edge = release("1.0.2", "a");
    const old = release("1.0.3", "b");
    const legacy = release("1.0.4", "c");
    const candidate = release("1.0.5", "d");
    const staleCandidate = release("1.0.6", "e");
    const rejected = release("1.0.7", "f");
    const own = release("1.0.8", "1");
    const records = [
      [active, "approved", at(30 * day)],
      [fresh, "approved", at(day)],
      [edge, "approved", at(7 * day)],
      [old, "approved", at(8 * day)],
      [legacy, "approved", null],
      [candidate, "candidate", null],
      [staleCandidate, "candidate", null],
      [rejected, "rejected", at(day)],
      [own, "approved", at(90 * day)],
    ] as const;
    const state: ReleaseState = {
      ...emptyState(),
      releases: Object.fromEntries(records.map(([value, approval, certifiedAt]) => [value.releaseId, {
        releaseId: value.releaseId,
        releaseRoot: value.releaseRoot,
        packageVersion: value.packageVersion,
        contentDigest: value.contentDigest,
        approval,
        lifetimeClaims: true as const,
        materializedAt: value === candidate ? at(day) : at(400 * day),
        certifiedAt,
        diagnosticsPath: null,
      }])),
      references: { ...emptyState().references, active: active.releaseId, approved: active.releaseId },
    };

    const plan = planProtectedReleases(state, { ownReleaseIds: [own.releaseId, own.releaseId], now });
    expect(plan.retainedReleaseIds).toEqual([active.releaseId, fresh.releaseId, candidate.releaseId, own.releaseId].sort());
    expect(plan.collectibleReleaseIds).toEqual([edge.releaseId, old.releaseId, legacy.releaseId, staleCandidate.releaseId, rejected.releaseId].sort());
    expect(withinRetention(state.releases[fresh.releaseId]!, now)).toBe(true);
    expect(withinRetention(state.releases[old.releaseId]!, now, 10 * day)).toBe(true);
    // Invariant: the active release is never collected, however old or unstamped its approval.
    const unstamped = { ...state, releases: { ...state.releases, [active.releaseId]: { ...state.releases[active.releaseId]!, certifiedAt: null } } };
    expect(planProtectedReleases(unstamped, { now }).retainedReleaseIds).toContain(active.releaseId);
  });

  it("stamps approval time when a release is approved", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-release-state-approval-"));
    roots.push(root);
    const store = new ReleaseStateStore(root);
    const candidate = release("2.0.0", "3");
    await store.recordCandidate(candidate);
    const before = Date.now();
    const approved = await store.approve(candidate.releaseId, "verdict.json");
    const stamp = Date.parse(approved.releases[candidate.releaseId]!.certifiedAt ?? "");
    expect(stamp).toBeGreaterThanOrEqual(before - 1_000);
    expect(withinRetention(approved.releases[candidate.releaseId]!, Date.now())).toBe(true);
  });
});

function approvedState(first: MaterializedRelease, second: MaterializedRelease): ReleaseState {
  const timestamp = new Date(0).toISOString();
  return {
    ...emptyState(),
    revision: 6,
    releases: Object.fromEntries([first, second].map(candidate => [candidate.releaseId, {
      releaseId: candidate.releaseId,
      releaseRoot: candidate.releaseRoot,
      packageVersion: candidate.packageVersion,
      launchContract: "neutral-launch-v1",
      contentDigest: candidate.contentDigest,
      approval: "approved" as const,
      lifetimeClaims: true as const,
      materializedAt: timestamp,
      certifiedAt: timestamp,
      diagnosticsPath: `${candidate.releaseId}.json`,
    }])),
    references: { active: second.releaseId, pending: null, approved: second.releaseId, rollback: first.releaseId, retention: [] },
  };
}

function release(version: string, seed: string): MaterializedRelease {
  const digest = seed.repeat(64).slice(0, 64);
  return {
    packageName: "@timurproko/a1",
    launchContract: "neutral-launch-v1",
    packageVersion: version,
    contentDigest: digest,
    releaseId: `${version}-${digest.slice(0, 20)}`,
    packageRoot: `/package/${version}`,
    releaseRoot: `/data/releases/${version}`,
    files: [{ path: "bin/ui.js", bytes: 1, sha256: "0".repeat(64), executable: true }],
  };
}
