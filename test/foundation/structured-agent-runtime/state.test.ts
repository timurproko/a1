import { describe, expect, it } from "vitest";
import {
  StructuredEventReducer,
  type StructuredAgentEvent,
} from "../../../src/foundation/structured-agent-runtime/index.js";
import {
  WORKSPACE_CONTRACT_VERSION,
  type StructuredAgentSnapshot,
  type StructuredCapabilityContract,
} from "../../../src/foundation/workspace-contracts/index.js";

const capability: StructuredCapabilityContract = {
  kind: "structured",
  protocolVersion: WORKSPACE_CONTRACT_VERSION,
  adapterId: "adapter.synthetic",
  commands: ["prompt"],
  eventTypes: ["message", "tool-call"],
  snapshots: "authoritative",
  resume: "position",
  cancellation: "correlated",
  attachmentTypes: ["text"],
  flow: {
    maxEventBytes: 128,
    maxSnapshotBytes: 256,
    maxAttachmentBytes: 512,
    maxQueuedEvents: 8,
    maxConcurrentCommands: 2,
    maxReconnectEvents: 32,
  },
};

function event(position: number, eventType = "message", payload: unknown = { text: `event-${position}` }): StructuredAgentEvent {
  return { type: "structured-event", agentId: "agent-1", position, eventType, payload };
}

function snapshot(position: number, payload: unknown = { state: `snapshot-${position}` }): StructuredAgentSnapshot {
  return {
    contractVersion: WORKSPACE_CONTRACT_VERSION,
    agentId: "agent-1",
    snapshotId: `snapshot-${position}`,
    position,
    authoritative: true,
    payload,
  };
}

describe("structured event reduction", () => {
  it("applies valid events once in declared order and treats terminal-looking text as typed payload", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    expect(reducer.applyEvent(event(0))).toMatchObject({
      kind: "applied",
      view: { revision: 1, lastAppliedPosition: 0, nextEventPosition: 1, appliedEventCount: 1, lastEventType: "message" },
    });
    const ansiPayload = { text: "\u001b[32mtyped payload only\u001b[0m" };
    expect(reducer.applyEvent(event(1, "tool-call", ansiPayload))).toMatchObject({
      kind: "applied",
      view: { revision: 2, lastAppliedPosition: 1, nextEventPosition: 2, appliedEventCount: 2, lastEventType: "tool-call", lastEventPayload: ansiPayload },
    });
  });

  it("ignores duplicates without applying effects twice", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    reducer.applyEvent(event(0));
    reducer.applyEvent(event(1));
    const result = reducer.applyEvent(event(1, "tool-call", { text: "duplicate" }));
    expect(result).toMatchObject({ kind: "duplicate", duplicatePosition: 1 });
    expect(reducer.view()).toMatchObject({ revision: 2, lastAppliedPosition: 1, nextEventPosition: 2, appliedEventCount: 2, lastEventType: "message" });
  });

  it("requests snapshot resynchronization for a forward gap without guessing missing state", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    reducer.applyEvent(event(0));
    const result = reducer.applyEvent(event(4));
    expect(result).toEqual({
      kind: "resynchronization-required",
      view: reducer.view(),
      expectedPosition: 1,
      receivedPosition: 4,
      recovery: "snapshot",
    });
    expect(reducer.view()).toMatchObject({ revision: 1, lastAppliedPosition: 0, nextEventPosition: 1 });
  });

  it("rejects malformed identity, type, ordering, and oversized event contracts", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    expect(reducer.applyEvent({ ...event(0), agentId: "agent-2" })).toMatchObject({ kind: "rejected", code: "agent-mismatch" });
    expect(reducer.applyEvent(event(0, "unknown"))).toMatchObject({ kind: "rejected", code: "unsupported-event-type" });
    expect(reducer.applyEvent(event(-1))).toMatchObject({ kind: "rejected", code: "malformed-event" });
    expect(reducer.applyEvent(event(0, "message", { text: "x".repeat(200) }))).toMatchObject({ kind: "rejected", code: "event-too-large" });
    expect(reducer.view()).toMatchObject({ revision: 0, lastAppliedPosition: null, nextEventPosition: 0 });
  });

  it("replaces state with an authoritative snapshot and resumes from its boundary", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    reducer.applyEvent(event(0));
    expect(reducer.replaceWithSnapshot(snapshot(5))).toMatchObject({
      kind: "snapshot-applied",
      view: { revision: 2, lastAppliedPosition: 5, nextEventPosition: 6, appliedEventCount: 0, lastEventType: null, snapshotId: "snapshot-5" },
    });
    expect(reducer.applyEvent(event(6))).toMatchObject({ kind: "applied", view: { lastAppliedPosition: 6, nextEventPosition: 7, appliedEventCount: 1 } });
  });

  it("recovers a forward gap through snapshot replacement before the next event", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    expect(reducer.applyEvent(event(3))).toMatchObject({ kind: "resynchronization-required", expectedPosition: 0, receivedPosition: 3 });
    expect(reducer.replaceWithSnapshot(snapshot(3))).toMatchObject({ kind: "snapshot-applied" });
    expect(reducer.applyEvent(event(4))).toMatchObject({ kind: "applied", view: { lastAppliedPosition: 4, nextEventPosition: 5 } });
  });

  it("rejects stale, oversized, unsupported, and malformed snapshots without replacing state", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    reducer.applyEvent(event(0));
    reducer.applyEvent(event(1));
    expect(reducer.replaceWithSnapshot(snapshot(0))).toMatchObject({ kind: "snapshot-stale", currentPosition: 1, snapshotPosition: 0 });
    expect(reducer.replaceWithSnapshot(snapshot(2, { text: "x".repeat(300) }))).toMatchObject({ kind: "rejected", code: "snapshot-too-large" });
    expect(reducer.replaceWithSnapshot({ ...snapshot(2), agentId: "agent-2" })).toMatchObject({ kind: "rejected", code: "agent-mismatch" });
    expect(reducer.replaceWithSnapshot({ ...snapshot(2), authoritative: false as true })).toMatchObject({ kind: "rejected", code: "malformed-snapshot" });
    expect(reducer.view()).toMatchObject({ revision: 2, lastAppliedPosition: 1, nextEventPosition: 2, snapshotId: null });

    const withoutSnapshots = new StructuredEventReducer("agent-1", { ...capability, snapshots: "none", resume: "none" });
    expect(withoutSnapshots.replaceWithSnapshot(snapshot(0))).toMatchObject({ kind: "rejected", code: "snapshots-unsupported" });
  });

  it("keeps ANSI-looking event and snapshot payloads as opaque typed content", () => {
    const reducer = new StructuredEventReducer("agent-1", capability);
    const payload = { rawText: "\u001b[2J\u001b[Hnot-a-display-command" };
    expect(reducer.applyEvent(event(0, "message", payload))).toMatchObject({ kind: "applied", view: { lastEventPayload: payload } });
    expect(reducer.replaceWithSnapshot(snapshot(1, payload))).toMatchObject({ kind: "snapshot-applied", view: { snapshotPayload: payload } });
  });
});
