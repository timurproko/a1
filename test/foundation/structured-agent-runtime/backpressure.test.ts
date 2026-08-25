import { describe, expect, it } from "vitest";
import {
  StructuredBackpressureController,
  type StructuredBackpressureResource,
  type StructuredResourceLease,
} from "../../../src/foundation/structured-agent-runtime/index.js";
import { WORKSPACE_CONTRACT_VERSION, type StructuredCapabilityContract } from "../../../src/contracts/workspace/index.js";

const capability: StructuredCapabilityContract = {
  kind: "structured",
  protocolVersion: WORKSPACE_CONTRACT_VERSION,
  adapterId: "adapter.synthetic",
  commands: ["prompt"],
  eventTypes: ["message"],
  snapshots: "authoritative",
  resume: "position",
  cancellation: "correlated",
  attachmentTypes: ["json"],
  flow: {
    maxEventBytes: 8,
    maxSnapshotBytes: 16,
    maxAttachmentBytes: 24,
    maxQueuedEvents: 2,
    maxConcurrentCommands: 2,
    maxReconnectEvents: 3,
  },
};

function controller(): StructuredBackpressureController {
  return new StructuredBackpressureController("adapter.synthetic", capability);
}

function acquire(controller: StructuredBackpressureController, resource: StructuredBackpressureResource, units = 1, bytes = 0): StructuredResourceLease {
  const result = controller.acquire(resource, units, bytes);
  if (result.kind !== "accepted") throw new Error(`expected ${resource} lease, got ${result.code}: ${result.diagnostic}`);
  return result.lease;
}

describe("structured backpressure", () => {
  it("pauses an adapter when its queued-event count or aggregate bytes exceed the negotiated window", () => {
    const limits = controller();
    const first = acquire(limits, "events", 1, 4);
    const second = acquire(limits, "events", 1, 4);
    expect(limits.usage("events")).toMatchObject({ units: 2, bytes: 8, unitLimit: 2, byteLimit: 16 });
    expect(limits.acquire("events", 1, 1)).toMatchObject({ kind: "rejected", code: "resource-exhausted", action: "pause-adapter" });
    expect(limits.usage("events")).toMatchObject({ units: 2, bytes: 8 });

    expect(limits.release(first)).toMatchObject({ kind: "released", usage: { units: 1, bytes: 4 } });
    const third = acquire(limits, "events", 1, 4);
    expect(limits.acquire("events", 1, 9)).toMatchObject({ kind: "rejected", code: "payload-too-large", action: "reject-payload" });
    expect(limits.release(second)).toMatchObject({ kind: "released" });
    expect(limits.release(third)).toMatchObject({ kind: "released", usage: { units: 0, bytes: 0 } });
  });

  it("bounds concurrent command reservations without blocking after release", () => {
    const limits = controller();
    const first = acquire(limits, "commands", 1, 8);
    const second = acquire(limits, "commands", 1, 8);
    expect(limits.acquire("commands", 1, 1)).toMatchObject({ kind: "rejected", code: "resource-exhausted", action: "reject-request" });
    expect(limits.release(first)).toMatchObject({ kind: "released", usage: { units: 1, bytes: 8 } });
    acquire(limits, "commands", 1, 8);
    limits.release(second);
    expect(limits.usage("commands").units).toBe(1);
  });

  it("bounds in-flight snapshots and attachments by negotiated payload windows", () => {
    const limits = controller();
    const snapshot = acquire(limits, "snapshots", 1, 16);
    expect(limits.acquire("snapshots", 1, 1)).toMatchObject({ kind: "rejected", code: "resource-exhausted", action: "reject-request" });
    expect(limits.acquire("snapshots", 1, 17)).toMatchObject({ kind: "rejected", code: "payload-too-large", action: "reject-payload" });
    limits.release(snapshot);

    const attachment = acquire(limits, "attachments", 1, 24);
    expect(limits.acquire("attachments", 1, 1)).toMatchObject({ kind: "rejected", code: "resource-exhausted", action: "reject-request" });
    expect(limits.acquire("attachments", 1, 25)).toMatchObject({ kind: "rejected", code: "payload-too-large", action: "reject-payload" });
    expect(limits.release(attachment)).toMatchObject({ kind: "released", usage: { units: 0, bytes: 0 } });
  });

  it("disconnects replay after the negotiated reconnect window and latches until a new recovery session", () => {
    const limits = controller();
    acquire(limits, "reconnect-replay", 1, 8);
    acquire(limits, "reconnect-replay", 1, 8);
    acquire(limits, "reconnect-replay", 1, 8);
    expect(limits.acquire("reconnect-replay", 1, 1)).toMatchObject({ kind: "rejected", code: "replay-exhausted", action: "disconnect-adapter" });
    expect(limits.replayExhausted()).toBe(true);
    expect(limits.acquire("reconnect-replay", 1, 1)).toMatchObject({ kind: "rejected", code: "replay-exhausted", action: "disconnect-adapter" });

    limits.resetReconnectReplay();
    expect(limits.replayExhausted()).toBe(false);
    expect(limits.usage("reconnect-replay")).toMatchObject({ units: 0, bytes: 0 });
    acquire(limits, "reconnect-replay", 1, 8);
  });

  it("keeps high-rate acquire/release usage and lease retention bounded", () => {
    const limits = controller();
    for (let index = 0; index < 1_000; index += 1) {
      const event = acquire(limits, "events", 1, 8);
      const command = acquire(limits, "commands", 1, 8);
      const replay = acquire(limits, "reconnect-replay", 1, 8);
      limits.release(event);
      limits.release(command);
      limits.release(replay);
      expect(limits.usage("events")).toMatchObject({ units: 0, bytes: 0 });
      expect(limits.usage("commands")).toMatchObject({ units: 0, bytes: 0 });
    }
    expect(limits.leaseCount()).toBe(0);
    expect(limits.usage("reconnect-replay")).toMatchObject({ units: 0, bytes: 0 });
  });

  it("rejects malformed, unknown, and double-released leases without negative counters", () => {
    const limits = controller();
    const lease = acquire(limits, "events", 1, 4);
    expect(limits.release(lease)).toMatchObject({ kind: "released" });
    expect(limits.release(lease)).toMatchObject({ kind: "rejected", code: "unknown-lease" });
    expect(limits.release({ ...lease, bytes: 3 })).toMatchObject({ kind: "rejected", code: "unknown-lease" });
    expect(limits.acquire("events", 0, 1)).toMatchObject({ kind: "rejected", code: "invalid-request" });
    expect(limits.acquire("events", -1, 1)).toMatchObject({ kind: "rejected", code: "invalid-request" });
    expect(limits.usage("events")).toMatchObject({ units: 0, bytes: 0 });
  });

  it("isolates one exhausted adapter from another adapter's budget", () => {
    const first = controller();
    const second = controller();
    acquire(first, "events", 1, 8);
    acquire(first, "events", 1, 8);
    expect(first.acquire("events", 1, 1)).toMatchObject({ kind: "rejected", action: "pause-adapter" });
    expect(second.acquire("events", 1, 8)).toMatchObject({ kind: "accepted", usage: { units: 1, bytes: 8 } });
  });
});
