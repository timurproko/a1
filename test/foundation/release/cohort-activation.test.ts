import { describe, expect, it } from "vitest";
import { selectOrdinaryLaunchReleaseId } from "../../../src/foundation/release/index.js";
import { emptyState, type CohortState } from "../../../src/foundation/release/index.js";
import type { MaterializedRelease } from "../../../src/foundation/release/index.js";

describe("ordinary launch activation", () => {
  it("selects the newest semantic release for ordinary launch without granting rollback authority", () => {
    const active = release("1.1.0", "a");
    const older = release("1.0.0", "b");
    const newer = release("1.2.0", "c");
    const equal = release("1.1.0", "d");
    const state = stateWith(active, newer);
    const activeRecord = state.releases[active.releaseId];

    expect(selectOrdinaryLaunchReleaseId(older, activeRecord)).toBe(active.releaseId);
    expect(selectOrdinaryLaunchReleaseId(equal, activeRecord)).toBe(active.releaseId);
    expect(selectOrdinaryLaunchReleaseId(newer, activeRecord)).toBe(newer.releaseId);
    expect(selectOrdinaryLaunchReleaseId(newer, activeRecord ? { ...activeRecord, approval: "candidate" } : undefined)).toBe(newer.releaseId);
    expect(selectOrdinaryLaunchReleaseId(newer)).toBe(newer.releaseId);
    expect(() => selectOrdinaryLaunchReleaseId({ ...newer, packageVersion: "not-semver" }, activeRecord)).toThrow(/semantic versions/);
  });
});

function stateWith(old: MaterializedRelease, candidate: MaterializedRelease): CohortState {
  return {
    ...emptyState(),
    releases: {
      [old.releaseId]: record(old, "approved"),
      [candidate.releaseId]: record(candidate, "candidate"),
    },
    references: { active: old.releaseId, pending: candidate.releaseId, approved: old.releaseId, rollback: null, retention: [old.releaseId, candidate.releaseId] },
  };
}
function record(value: MaterializedRelease, approval: "approved" | "candidate") {
  return { releaseId: value.releaseId, releaseRoot: value.releaseRoot, packageVersion: value.packageVersion, contentDigest: value.contentDigest, approval, materializedAt: new Date(0).toISOString(), certifiedAt: approval === "approved" ? new Date(0).toISOString() : null, diagnosticsPath: null } as const;
}
function release(version: string, seed: string): MaterializedRelease {
  const digest = seed.repeat(64);
  return { packageName: "@timurproko/a1", packageVersion: version, contentDigest: digest, releaseId: `${version}-${digest.slice(0, 20)}`, packageRoot: `/package/${version}`, releaseRoot: `/data/releases/${version}`, files: [{ path: "bin/ui.js", bytes: 1, sha256: "0".repeat(64), executable: true }] };
}
