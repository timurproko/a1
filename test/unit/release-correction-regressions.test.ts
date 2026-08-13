import { describe, expect, it } from "vitest";
import { selectCohortLaunch } from "../../src/cohort-selection.js";
import { emptyState, type CohortState, type SupervisorEndpointMetadata } from "../../src/cohort-state.js";
import type { MaterializedRelease } from "../../src/release-store.js";

describe("release correction regressions", () => {
  it("selects the N-1 supervisor's retained UI instead of exposing its observed protocol error", () => {
    const oldRelease = release("0.1.3", "old-digest", "C:/data/releases/old");
    const candidate = release("0.1.4", "new-digest", "C:/data/releases/new");
    const state: CohortState = {
      ...emptyState(),
      releases: {
        [oldRelease.releaseId]: record(oldRelease, "approved"),
        [candidate.releaseId]: record(candidate, "candidate"),
      },
      references: { active: oldRelease.releaseId, pending: candidate.releaseId, approved: oldRelease.releaseId, rollback: null, retention: [oldRelease.releaseId, candidate.releaseId] },
    };
    const endpoint = endpointMetadata(oldRelease);
    const observedRegression = { code: "malformed-message", message: "invalid client message", supervisorPid: endpoint.pid, releaseId: endpoint.releaseId };

    const decision = selectCohortLaunch(candidate, state, endpoint, "live-verified");
    expect(observedRegression.message).toBe("invalid client message");
    expect(decision).toMatchObject({
      action: "launch-retained-ui",
      releaseId: oldRelease.releaseId,
      releaseRoot: oldRelease.releaseRoot,
      recordPending: true,
    });
    expect(decision.reason).not.toContain(observedRegression.message);
  });

});

function release(version: string, digestSeed: string, releaseRoot: string): MaterializedRelease {
  const contentDigest = digestSeed.padEnd(64, "0").slice(0, 64);
  return {
    packageName: "@timurproko/addone",
    packageVersion: version,
    contentDigest,
    releaseId: `${version}-${contentDigest.slice(0, 20)}`,
    packageRoot: releaseRoot,
    releaseRoot,
    files: [{ path: "bin/addone-ui.js", bytes: 1, sha256: "0".repeat(64), executable: true }],
  };
}
function record(value: MaterializedRelease, approval: "candidate" | "approved") {
  return {
    releaseId: value.releaseId,
    releaseRoot: value.releaseRoot,
    packageVersion: value.packageVersion,
    contentDigest: value.contentDigest,
    approval,
    materializedAt: new Date(0).toISOString(),
    certifiedAt: approval === "approved" ? new Date(0).toISOString() : null,
    diagnosticsPath: null,
  } as const;
}
function endpointMetadata(value: MaterializedRelease): SupervisorEndpointMetadata {
  return {
    supervisorId: "supervisor-old",
    endpoint: "old-endpoint",
    pid: 413,
    pidStartIdentity: "413:old-start",
    bootNonce: "old-boot",
    startedAt: new Date(0).toISOString(),
    releaseId: value.releaseId,
    releaseRoot: value.releaseRoot,
    contentDigest: value.contentDigest,
    ownership: { state: "busy", liveGenerationIds: ["generation-1"], nonResumableGenerationIds: ["generation-1"] },
    envelope: "old-control-envelope",
    envelopeRevision: 1,
    requiredFeatures: ["old-feature"],
    optionalFeatures: [],
    contractDigest: "old-contract",
  };
}
