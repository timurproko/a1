import { describe, expect, it } from "vitest";
import { selectCohortLaunch } from "../../src/cohort-selection.js";
import { emptyState, type CohortState, type SupervisorEndpointMetadata } from "../../src/cohort-state.js";
import type { MaterializedRelease } from "../../src/release-store.js";
import { inspectNativePiReadiness } from "../../src/ui/native-pi-readiness.js";
import type { TerminalSurface } from "../../src/domain/index.js";

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

  it("fails a live empty/cursor-only surface with terminal evidence", () => {
    const surface = emptySurface();
    const evidence = inspectNativePiReadiness({ ...surface, cursor: { ...surface.cursor, column: 3 } }, 5_000, 5_000);
    expect(evidence).toMatchObject({ status: "failed", cursorOnly: true, visibleCharacters: 0 });
    expect(evidence.reason).toMatch(/empty or cursor-only/);
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
function emptySurface(): TerminalSurface {
  return {
    columns: 5,
    rows: 2,
    cells: Array.from({ length: 2 }, () => Array.from({ length: 5 }, () => ({ character: " ", width: 1, attributes: 0 }))),
    cursor: { column: 0, row: 0, visible: true, style: "block", blinking: true },
    activeScreen: "alternate",
    modes: { applicationCursorKeys: false, applicationKeypad: false, alternateScroll: false, bracketedPaste: false, focusReporting: false, mouseTracking: "none", mouseProtocol: "x10", synchronizedOutput: false, wraparound: true, keyboardProtocol: "legacy", modifyOtherKeys: 0, kittyKeyboardFlags: 0, win32InputMode: false },
    outputSequence: 1,
    revision: 1,
    final: false,
  };
}
