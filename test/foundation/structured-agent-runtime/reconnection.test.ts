import { describe, expect, it } from "vitest";
import {
  StructuredEventReducer,
  StructuredReconnectionManager,
  type StructuredResumeProof,
} from "../../../src/foundation/structured-agent-runtime/index.js";
import {
  WORKSPACE_CONTRACT_VERSION,
  type StructuredAgentSnapshot,
  type StructuredCapabilityContract,
  type StructuredRecoveryAuthority,
} from "../../../src/contracts/workspace/index.js";

const capability: StructuredCapabilityContract = {
  kind: "structured",
  protocolVersion: WORKSPACE_CONTRACT_VERSION,
  adapterId: "adapter.synthetic",
  commands: ["prompt"],
  eventTypes: ["message"],
  snapshots: "authoritative",
  resume: "position",
  cancellation: "correlated",
  attachmentTypes: [],
  flow: {
    maxEventBytes: 128,
    maxSnapshotBytes: 256,
    maxAttachmentBytes: 512,
    maxQueuedEvents: 8,
    maxConcurrentCommands: 2,
    maxReconnectEvents: 16,
  },
};

function positionAuthority(position = 8, token = "resume-8"): StructuredRecoveryAuthority {
  return {
    kind: "structured",
    referenceId: "recovery-1",
    agentId: "agent-1",
    adapterId: "adapter.synthetic",
    processIdentity: "pid:100:start:1",
    ownershipProof: "proof-1",
    boundary: { kind: "position", position, resumeToken: token },
  };
}

function snapshotAuthority(snapshotId = "snapshot-8"): StructuredRecoveryAuthority {
  return {
    kind: "structured",
    referenceId: "recovery-2",
    agentId: "agent-1",
    adapterId: "adapter.synthetic",
    processIdentity: "pid:100:start:1",
    ownershipProof: "proof-1",
    boundary: { kind: "snapshot", snapshotId },
  };
}

function snapshot(position = 8, snapshotId = "snapshot-8", payload: unknown = { state: "ready" }): StructuredAgentSnapshot {
  return {
    contractVersion: WORKSPACE_CONTRACT_VERSION,
    agentId: "agent-1",
    snapshotId,
    position,
    authoritative: true,
    payload,
  };
}

function positionProof(position = 8, token = "resume-8"): StructuredResumeProof {
  return {
    protocolVersion: WORKSPACE_CONTRACT_VERSION,
    agentId: "agent-1",
    adapterId: "adapter.synthetic",
    processIdentity: "pid:100:start:1",
    ownershipProof: "proof-1",
    boundary: { kind: "position", position, resumeToken: token },
  };
}

function snapshotProof(position = 8, snapshotId = "snapshot-8"): StructuredResumeProof {
  return {
    protocolVersion: WORKSPACE_CONTRACT_VERSION,
    agentId: "agent-1",
    adapterId: "adapter.synthetic",
    processIdentity: "pid:100:start:1",
    ownershipProof: "proof-1",
    boundary: { kind: "snapshot", snapshotId, snapshot: snapshot(position, snapshotId) },
  };
}

describe("structured reconnection", () => {
  it("accepts a valid ownership-proven position resume and restores the reducer boundary", () => {
    const manager = new StructuredReconnectionManager(capability);
    const reducer = new StructuredEventReducer("agent-1", capability);
    expect(manager.resume(positionAuthority(), positionProof(), reducer)).toMatchObject({
      kind: "accepted",
      boundary: { kind: "position", position: 8, resumeToken: "resume-8" },
      view: { lastAppliedPosition: 8, nextEventPosition: 9, revision: 1 },
    });
    expect(reducer.view()).toMatchObject({ lastAppliedPosition: 8, nextEventPosition: 9 });
  });

  it("accepts a valid snapshot recovery and applies the authoritative state", () => {
    const manager = new StructuredReconnectionManager({ ...capability, resume: "snapshot" });
    const reducer = new StructuredEventReducer("agent-1", capability);
    const result = manager.resume(snapshotAuthority(), snapshotProof(), reducer);
    expect(result).toMatchObject({
      kind: "accepted",
      boundary: { kind: "snapshot", snapshotId: "snapshot-8" },
      view: { lastAppliedPosition: 8, nextEventPosition: 9, snapshotId: "snapshot-8" },
    });
    expect(reducer.view().snapshotPayload).toEqual({ state: "ready" });
  });

  it("terminates non-reconnectable adapters after restart", () => {
    const manager = new StructuredReconnectionManager({ ...capability, snapshots: "none", resume: "none" });
    expect(manager.resume(positionAuthority(), positionProof())).toEqual({
      kind: "terminated",
      reason: "non-reconnectable",
      diagnostic: "adapter did not negotiate reconnection; durable agent is ended after restart",
    });
  });

  it("rejects stale tokens, boundary mismatch, and replayed recovery", () => {
    const manager = new StructuredReconnectionManager(capability);
    expect(manager.resume(positionAuthority(), positionProof(8, "resume-7"))).toMatchObject({ kind: "rejected", code: "stale-token" });
    expect(manager.resume(positionAuthority(), positionProof(9, "resume-8"))).toMatchObject({ kind: "rejected", code: "boundary-mismatch" });
    expect(manager.resume(positionAuthority(), positionProof())).toMatchObject({ kind: "accepted" });
    expect(manager.resume(positionAuthority(), positionProof())).toMatchObject({ kind: "rejected", code: "replay-detected" });
  });

  it("rejects process, adapter, agent, and ownership-proof mismatches", () => {
    const manager = new StructuredReconnectionManager(capability);
    expect(manager.resume(positionAuthority(), { ...positionProof(), processIdentity: "pid:100:start:2" })).toMatchObject({ kind: "rejected", code: "process-mismatch" });
    expect(manager.resume(positionAuthority(), { ...positionProof(), adapterId: "adapter.other" })).toMatchObject({ kind: "rejected", code: "adapter-mismatch" });
    expect(manager.resume(positionAuthority(), { ...positionProof(), agentId: "agent-2" })).toMatchObject({ kind: "rejected", code: "agent-mismatch" });
    expect(manager.resume(positionAuthority(), { ...positionProof(), ownershipProof: "proof-2" })).toMatchObject({ kind: "rejected", code: "proof-mismatch" });
  });

  it("rejects protocol and negotiated resume-version mismatches", () => {
    const manager = new StructuredReconnectionManager(capability);
    expect(manager.resume(positionAuthority(), { ...positionProof(), protocolVersion: 2 })).toMatchObject({ kind: "rejected", code: "version-mismatch" });
    expect(manager.resume(snapshotAuthority(), snapshotProof())).toMatchObject({ kind: "rejected", code: "unsupported-resume" });
    expect(manager.resume(positionAuthority(), snapshotProof())).toMatchObject({ kind: "rejected", code: "boundary-mismatch" });
  });

  it("validates snapshot identity, authority, payload bounds, and reducer identity before recovery", () => {
    const snapshotManager = new StructuredReconnectionManager({ ...capability, resume: "snapshot" });
    expect(snapshotManager.resume(snapshotAuthority(), snapshotProof(8, "snapshot-7"))).toMatchObject({ kind: "rejected", code: "stale-token" });
    expect(snapshotManager.resume(snapshotAuthority(), {
      ...snapshotProof(),
      boundary: { kind: "snapshot", snapshotId: "snapshot-8", snapshot: { ...snapshot(), snapshotId: "snapshot-9" } },
    })).toMatchObject({ kind: "rejected", code: "invalid-snapshot" });
    expect(snapshotManager.resume(snapshotAuthority(), {
      ...snapshotProof(),
      boundary: { kind: "snapshot", snapshotId: "snapshot-8", snapshot: { ...snapshot(), agentId: "agent-2" } },
    })).toMatchObject({ kind: "rejected", code: "agent-mismatch" });
    expect(snapshotManager.resume(snapshotAuthority(), {
      ...snapshotProof(),
      boundary: { kind: "snapshot", snapshotId: "snapshot-8", snapshot: snapshot(8, "snapshot-8", { text: "x".repeat(300) }) },
    })).toMatchObject({ kind: "rejected", code: "snapshot-too-large" });
    expect(snapshotManager.resume(snapshotAuthority(), snapshotProof(8, "snapshot-8"), new StructuredEventReducer("agent-2", capability))).toMatchObject({ kind: "rejected", code: "snapshot-recovery-failed" });
  });

  it("accepts exactly one recovery across deterministic replay sequences", () => {
    for (const staleFirst of [false, true]) {
      const manager = new StructuredReconnectionManager(capability);
      const first = staleFirst
        ? { ...positionProof(), boundary: { kind: "position" as const, position: 8, resumeToken: "stale" } }
        : positionProof();
      const firstResult = manager.resume(positionAuthority(), first);
      const secondResult = manager.resume(positionAuthority(), positionProof());
      if (!staleFirst) {
        expect(firstResult).toMatchObject({ kind: "accepted" });
        expect(secondResult).toMatchObject({ kind: "rejected", code: "replay-detected" });
      } else {
        expect(firstResult).toMatchObject({ kind: "rejected", code: "stale-token" });
        expect(secondResult).toMatchObject({ kind: "accepted" });
      }
    }
  });
});
