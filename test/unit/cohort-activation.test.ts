import { describe, expect, it } from "vitest";
import { selectCohortLaunch } from "../../src/cohort-selection.js";
import { cleanupProvenIdleOwner } from "../../src/process-cleanup.js";
import { emptyState, type CohortState, type SupervisorEndpointMetadata } from "../../src/cohort-state.js";
import type { MaterializedRelease } from "../../src/release-store.js";

describe("cohort activation and stale ownership", () => {
  it("drains an idle old cohort but defers around a live non-resumable generation", () => {
    const old = release("1.0.0", "a");
    const candidate = release("1.1.0", "b");
    const state = stateWith(old, candidate);
    const idle = metadata(old, []);
    expect(selectCohortLaunch(candidate, state, idle, "live-verified")).toMatchObject({ action: "replace-idle-cohort", pid: idle.pid });

    const busy = metadata(old, ["pty-generation"]);
    expect(selectCohortLaunch(candidate, state, busy, "live-verified")).toMatchObject({
      action: "launch-retained-ui",
      releaseId: old.releaseId,
      recordPending: true,
    });
  });

  it("preserves uncertain live ownership and cleans dead idle metadata without shell instructions", async () => {
    const old = release("1.0.0", "c");
    const candidate = release("1.1.0", "d");
    const state = stateWith(old, candidate);
    const busy = metadata(old, ["pty-generation"]);
    expect(selectCohortLaunch(candidate, state, busy, "unresponsive")).toMatchObject({ action: "blocked" });
    await expect(cleanupProvenIdleOwner(busy)).rejects.toThrow(/recorded live generations/);

    const dead = { ...metadata(old, []), pid: 2_000_000_000 };
    const diagnostics = await cleanupProvenIdleOwner(dead);
    expect(diagnostics).toMatchObject({ terminated: true, attempted: ["owner-already-dead"] });
    expect(JSON.stringify(diagnostics)).not.toMatch(/taskkill|kill -9/i);
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
function metadata(value: MaterializedRelease, generations: readonly string[]): SupervisorEndpointMetadata {
  return {
    supervisorId: "supervisor-old", endpoint: "endpoint", pid: 987654, pidStartIdentity: "old-start", bootNonce: "old-boot", startedAt: new Date(0).toISOString(),
    releaseId: value.releaseId, releaseRoot: value.releaseRoot, contentDigest: value.contentDigest,
    ownership: { state: generations.length ? "busy" : "idle", liveGenerationIds: generations, nonResumableGenerationIds: generations },
    envelope: "addone-control-envelope", envelopeRevision: 1, requiredFeatures: [], optionalFeatures: [], contractDigest: "contract",
  };
}
function release(version: string, seed: string): MaterializedRelease {
  const digest = seed.repeat(64);
  return { packageName: "@timurproko/addone", packageVersion: version, contentDigest: digest, releaseId: `${version}-${digest.slice(0, 20)}`, packageRoot: `/package/${version}`, releaseRoot: `/data/releases/${version}`, files: [{ path: "bin/addone-ui.js", bytes: 1, sha256: "0".repeat(64), executable: true }] };
}
