import { describe, expect, it } from "vitest";
import {
  StructuredBackpressureController,
  StructuredCommandTracker,
  StructuredEventReducer,
  StructuredReconnectionManager,
  negotiateStructuredAdapter,
  type StructuredAgentEvent,
  type StructuredCommandRecord,
  type StructuredResourceLease,
} from "../../../src/foundation/structured-agent-runtime/index.js";
import { WORKSPACE_CONTRACT_VERSION, type StructuredAgentSnapshot, type StructuredCapabilityContract } from "../../../src/foundation/workspace-contracts/index.js";
import { SyntheticStructuredAdapter } from "./synthetic-adapter.js";

class SyntheticAgentSession {
  readonly capability: StructuredCapabilityContract;
  readonly reducer: StructuredEventReducer;
  readonly commands: StructuredCommandTracker;
  readonly backpressure: StructuredBackpressureController;
  readonly #commandLeases = new Map<string, StructuredResourceLease>();
  #crashed = false;

  private constructor(readonly adapter: SyntheticStructuredAdapter, readonly agentId: string, capability: StructuredCapabilityContract) {
    this.capability = capability;
    this.reducer = new StructuredEventReducer(agentId, capability);
    this.commands = new StructuredCommandTracker(agentId, capability);
    this.backpressure = new StructuredBackpressureController(capability.adapterId, capability);
  }

  static connect(adapter: SyntheticStructuredAdapter, agentId: string): SyntheticAgentSession {
    const handshake = negotiateStructuredAdapter(adapter.hello());
    if (!handshake.accepted) throw new Error(`synthetic adapter failed handshake: ${handshake.diagnostic}`);
    return new SyntheticAgentSession(adapter, agentId, handshake.capability);
  }

  applyEvent(position: number, eventType = "message", payload: unknown = { position }) {
    if (this.#crashed) return { kind: "adapter-unavailable" } as const;
    const event: StructuredAgentEvent = { type: "structured-event", agentId: this.agentId, position, eventType, payload };
    const lease = this.backpressure.acquire("events", 1, payloadBytes(payload));
    if (lease.kind !== "accepted") return lease;
    const result = this.reducer.applyEvent(event);
    this.backpressure.release(lease.lease);
    return result;
  }

  startCommand(correlationId: string, command = "prompt") {
    if (this.#crashed) return { kind: "adapter-unavailable" } as const;
    const lease = this.backpressure.acquire("commands", 1, 16);
    if (lease.kind !== "accepted") return lease;
    const result = this.commands.start({ type: "structured-command", correlationId, agentId: this.agentId, command, payload: { correlationId } });
    if (result.kind === "accepted") this.#commandLeases.set(correlationId, lease.lease);
    else this.backpressure.release(lease.lease);
    return result;
  }

  completeCommand(correlationId: string, outcome: "completed" | "failed" = "completed") {
    const result = this.commands.complete(correlationId, outcome);
    const lease = this.#commandLeases.get(correlationId);
    if (lease && result.kind === "outcome") {
      this.#commandLeases.delete(correlationId);
      this.backpressure.release(lease);
    }
    return result;
  }

  replaceWithSnapshot(position: number, payload: unknown): StructuredAgentSnapshot {
    const snapshot: StructuredAgentSnapshot = {
      contractVersion: WORKSPACE_CONTRACT_VERSION,
      agentId: this.agentId,
      snapshotId: `snapshot-${this.agentId}-${position}`,
      position,
      authoritative: true,
      payload,
    };
    const lease = this.backpressure.acquire("snapshots", 1, payloadBytes(payload));
    if (lease.kind !== "accepted") throw new Error(`snapshot reservation failed: ${lease.diagnostic}`);
    const result = this.reducer.replaceWithSnapshot(snapshot);
    this.backpressure.release(lease.lease);
    if (result.kind !== "snapshot-applied") throw new Error(`snapshot replacement failed: ${result.kind}`);
    return snapshot;
  }

  positionAuthority() {
    const position = this.reducer.view().lastAppliedPosition;
    if (position === null) throw new Error("session has no recovery boundary");
    return this.adapter.positionAuthority(this.agentId, position);
  }

  crash(): readonly StructuredCommandRecord[] {
    this.#crashed = true;
    const outcomes: StructuredCommandRecord[] = [];
    for (const correlationId of [...this.#commandLeases.keys()]) {
      const result = this.commands.complete(correlationId, "failed");
      if (result.kind === "outcome") outcomes.push(result.record);
    }
    for (const lease of this.#commandLeases.values()) this.backpressure.release(lease);
    this.#commandLeases.clear();
    return Object.freeze(outcomes);
  }

  crashed(): boolean {
    return this.#crashed;
  }
}

describe("synthetic structured adapter integration", () => {
  it("runs two concurrent agents with independent commands, state, and resource windows", () => {
    const firstAdapter = new SyntheticStructuredAdapter({ adapterId: "adapter.one" });
    const secondAdapter = new SyntheticStructuredAdapter({ adapterId: "adapter.two" });
    const first = SyntheticAgentSession.connect(firstAdapter, "agent-one");
    const second = SyntheticAgentSession.connect(secondAdapter, "agent-two");

    expect(first.applyEvent(0, "message", { text: "first-0" })).toMatchObject({ kind: "applied" });
    expect(second.applyEvent(0, "tool-call", { text: "second-0" })).toMatchObject({ kind: "applied" });
    expect(first.applyEvent(1, "tool-call", { text: "first-1" })).toMatchObject({ kind: "applied" });

    expect(first.reducer.view()).toMatchObject({ agentId: "agent-one", lastAppliedPosition: 1, lastEventType: "tool-call" });
    expect(second.reducer.view()).toMatchObject({ agentId: "agent-two", lastAppliedPosition: 0, lastEventType: "tool-call" });

    expect(first.startCommand("first-1")).toMatchObject({ kind: "accepted", activeCount: 1 });
    expect(first.startCommand("first-2")).toMatchObject({ kind: "accepted", activeCount: 2 });
    expect(second.startCommand("second-1")).toMatchObject({ kind: "accepted", activeCount: 1 });
    expect(first.startCommand("first-3")).toMatchObject({ kind: "rejected", code: "resource-exhausted", action: "reject-request" });
    expect(second.startCommand("second-2")).toMatchObject({ kind: "accepted", activeCount: 2 });

    expect(first.completeCommand("first-1")).toMatchObject({ kind: "outcome", record: { outcome: "completed" } });
    expect(first.commands.activeCount()).toBe(1);
    expect(second.commands.activeCount()).toBe(2);
    expect(second.completeCommand("second-1")).toMatchObject({ kind: "outcome", record: { outcome: "completed" } });
  });

  it("isolates a crashing adapter and bounds cleanup to that agent", () => {
    const first = SyntheticAgentSession.connect(new SyntheticStructuredAdapter({ adapterId: "adapter.one" }), "agent-one");
    const second = SyntheticAgentSession.connect(new SyntheticStructuredAdapter({ adapterId: "adapter.two" }), "agent-two");
    first.applyEvent(0);
    second.applyEvent(0);
    first.startCommand("first-command");
    second.startCommand("second-command");

    expect(first.applyEvent(1, "unknown", { text: "malformed" })).toMatchObject({ kind: "rejected", code: "unsupported-event-type" });
    const failed = first.crash();
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ correlationId: "first-command", outcome: "failed" });
    expect(first.crashed()).toBe(true);
    expect(first.commands.activeCount()).toBe(0);
    expect(first.backpressure.leaseCount()).toBe(0);
    expect(first.applyEvent(1)).toEqual({ kind: "adapter-unavailable" });

    expect(second.applyEvent(1, "tool-call", { text: "healthy" })).toMatchObject({ kind: "applied" });
    expect(second.commands.activeCount()).toBe(1);
    expect(second.completeCommand("second-command")).toMatchObject({ kind: "outcome", record: { outcome: "completed" } });
    expect(second.reducer.view()).toMatchObject({ lastAppliedPosition: 1, nextEventPosition: 2 });
  });

  it("restarts the control runtime and reconnects a surviving adapter only through verified authority", () => {
    const adapter = new SyntheticStructuredAdapter({ adapterId: "adapter.one", resume: "position" });
    const session = SyntheticAgentSession.connect(adapter, "agent-one");
    session.applyEvent(0);
    session.applyEvent(1, "tool-call", { text: "before restart" });
    const authority = session.positionAuthority();

    const restored = SyntheticAgentSession.connect(adapter, "agent-one");
    const manager = new StructuredReconnectionManager(session.capability);
    expect(manager.resume(authority, adapter.proof(authority), restored.reducer)).toMatchObject({
      kind: "accepted",
      view: { lastAppliedPosition: 1, nextEventPosition: 2 },
    });
    expect(restored.applyEvent(2, "message", { text: "after restart" })).toMatchObject({ kind: "applied", view: { lastAppliedPosition: 2 } });

    const staleManager = new StructuredReconnectionManager(session.capability);
    const staleProof = { ...adapter.proof(authority), processIdentity: "pid:adapter.one:start:2" };
    const rejectedReducer = new StructuredEventReducer("agent-one", session.capability);
    expect(staleManager.resume(authority, staleProof, rejectedReducer)).toMatchObject({ kind: "rejected", code: "process-mismatch" });
    expect(rejectedReducer.view()).toMatchObject({ lastAppliedPosition: null, nextEventPosition: 0 });
  });

  it("restores authoritative snapshot state after restart and accepts the next event boundary", () => {
    const adapter = new SyntheticStructuredAdapter({ adapterId: "adapter.snapshot", resume: "snapshot" });
    const session = SyntheticAgentSession.connect(adapter, "agent-one");
    session.applyEvent(0);
    const snapshot = session.replaceWithSnapshot(1, { messages: ["before restart"] });
    const authority = adapter.snapshotAuthority("agent-one", snapshot);

    const restored = SyntheticAgentSession.connect(adapter, "agent-one");
    const manager = new StructuredReconnectionManager(session.capability);
    expect(manager.resume(authority, adapter.proof(authority, snapshot), restored.reducer)).toMatchObject({
      kind: "accepted",
      view: { lastAppliedPosition: 1, nextEventPosition: 2, snapshotId: snapshot.snapshotId, snapshotPayload: { messages: ["before restart"] } },
    });
    expect(restored.applyEvent(2, "tool-call", { text: "after snapshot" })).toMatchObject({ kind: "applied", view: { lastAppliedPosition: 2, nextEventPosition: 3 } });
  });

  it("cleans active command and resource ownership on session cleanup without touching another agent", () => {
    const first = SyntheticAgentSession.connect(new SyntheticStructuredAdapter({ adapterId: "adapter.one" }), "agent-one");
    const second = SyntheticAgentSession.connect(new SyntheticStructuredAdapter({ adapterId: "adapter.two" }), "agent-two");
    first.startCommand("first-command");
    second.startCommand("second-command");
    first.crash();

    expect(first.commands.activeCount()).toBe(0);
    expect(first.commands.outcomeFor("first-command")).toMatchObject({ outcome: "failed" });
    expect(first.backpressure.leaseCount()).toBe(0);
    expect(second.commands.activeCount()).toBe(1);
    expect(second.commands.outcomeFor("second-command")).toMatchObject({ outcome: "active" });
    expect(second.completeCommand("second-command")).toMatchObject({ kind: "outcome", record: { outcome: "completed" } });
  });
});

function payloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}
