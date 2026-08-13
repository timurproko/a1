import { describe, expect, it } from "vitest";
import {
  StructuredCommandTracker,
  type StructuredCancelRequest,
  type StructuredCommandRequest,
  type StructuredCommandTerminalOutcome,
} from "../../../src/foundation/structured-agent-runtime/index.js";
import { WORKSPACE_CONTRACT_VERSION, type StructuredCapabilityContract } from "../../../src/foundation/workspace-contracts/index.js";

const capability: StructuredCapabilityContract = {
  kind: "structured",
  protocolVersion: WORKSPACE_CONTRACT_VERSION,
  adapterId: "adapter.synthetic",
  commands: ["prompt", "inspect"],
  eventTypes: ["message"],
  snapshots: "authoritative",
  resume: "position",
  cancellation: "correlated",
  attachmentTypes: [],
  flow: {
    maxEventBytes: 128,
    maxSnapshotBytes: 256,
    maxAttachmentBytes: 512,
    maxQueuedEvents: 4,
    maxConcurrentCommands: 2,
    maxReconnectEvents: 16,
  },
};

function command(id: string, name = "prompt", payload: unknown = { text: id }): StructuredCommandRequest {
  return { type: "structured-command", correlationId: id, agentId: "agent-1", command: name, payload };
}

function cancel(id: string, target: string): StructuredCancelRequest {
  return { type: "cancel-structured-command", correlationId: id, agentId: "agent-1", targetCorrelationId: target };
}

function tracker(timeoutMs = 100): StructuredCommandTracker {
  return new StructuredCommandTracker("agent-1", capability, timeoutMs);
}

describe("structured command lifecycle", () => {
  it("accepts correlated supported commands and reports completed outcomes", () => {
    const commands = tracker();
    expect(commands.start(command("command-1"), 10)).toMatchObject({
      kind: "accepted",
      activeCount: 1,
      record: { correlationId: "command-1", command: "prompt", startedAt: 10, outcome: "active", revision: 1 },
    });
    expect(commands.complete("command-1", "completed", 25)).toMatchObject({
      kind: "outcome",
      idempotent: false,
      record: { correlationId: "command-1", outcome: "completed", terminalAt: 25, revision: 2 },
    });
    expect(commands.activeCount()).toBe(0);
    expect(commands.terminalCount()).toBe(1);
  });

  it("enforces supported commands, payload bounds, and per-agent concurrency", () => {
    const commands = tracker();
    expect(commands.start(command("unknown", "missing"))).toMatchObject({ kind: "rejected", code: "unsupported-command" });
    expect(commands.start(command("large", "prompt", { text: "x".repeat(200) }))).toMatchObject({ kind: "rejected", code: "command-too-large" });
    expect(commands.start(command("one"))).toMatchObject({ kind: "accepted", activeCount: 1 });
    expect(commands.start(command("two"))).toMatchObject({ kind: "accepted", activeCount: 2 });
    expect(commands.start(command("three"))).toMatchObject({ kind: "rejected", code: "concurrency-limit" });
    commands.complete("one", "completed");
    expect(commands.start(command("three"))).toMatchObject({ kind: "accepted", activeCount: 2 });
    expect(commands.start({ ...command("agent-mismatch"), agentId: "agent-2" })).toMatchObject({ kind: "rejected", code: "agent-mismatch" });
  });

  it("rejects duplicate active correlations but returns idempotent outcomes for exact retries", () => {
    const commands = tracker();
    commands.start(command("command-1", "inspect", { value: 1 }));
    expect(commands.start(command("command-1", "inspect", { value: 1 }))).toMatchObject({ kind: "rejected", code: "duplicate-correlation" });
    commands.complete("command-1", "failed");
    expect(commands.start(command("command-1", "inspect", { value: 1 }))).toMatchObject({
      kind: "outcome",
      idempotent: true,
      record: { outcome: "failed" },
    });
    expect(commands.start(command("command-1", "prompt", { value: 1 }))).toMatchObject({ kind: "rejected", code: "correlation-conflict" });
  });

  it("cancels active commands when correlated cancellation is negotiated", () => {
    const commands = tracker();
    commands.start(command("command-1"), 10);
    expect(commands.cancel(cancel("cancel-1", "command-1"), 15)).toMatchObject({
      kind: "outcome",
      idempotent: false,
      record: { correlationId: "command-1", outcome: "cancelled", terminalAt: 15 },
    });
    expect(commands.activeCount()).toBe(0);
  });

  it("rejects cancellation when unsupported or targeting an unknown command", () => {
    const noCancellation = new StructuredCommandTracker("agent-1", { ...capability, cancellation: "none" });
    noCancellation.start(command("command-1"));
    expect(noCancellation.cancel(cancel("cancel-1", "command-1"))).toMatchObject({ kind: "rejected", code: "cancellation-unsupported" });

    const commands = tracker();
    expect(commands.cancel(cancel("cancel-1", "missing"))).toMatchObject({ kind: "rejected", code: "unknown-correlation" });
  });

  it("expires active commands deterministically and retains the timeout outcome", () => {
    const commands = tracker(100);
    commands.start(command("command-1"), 40);
    expect(commands.expire(139)).toEqual([]);
    expect(commands.activeCount()).toBe(1);
    const expired = commands.expire(140);
    expect(expired).toHaveLength(1);
    expect(expired[0]).toMatchObject({ correlationId: "command-1", outcome: "timed-out", terminalAt: 140 });
    expect(commands.complete("command-1", "completed", 141)).toMatchObject({
      kind: "outcome",
      idempotent: true,
      record: { outcome: "timed-out", revision: 2 },
    });
  });

  it.each([
    ["complete-then-cancel", "completed"],
    ["cancel-then-complete", "cancelled"],
    ["timeout-then-complete", "timed-out"],
  ])("resolves %s as one durable outcome", (_name, expected) => {
    const commands = tracker(50);
    commands.start(command("command-1"), 10);
    const first = expected === "completed"
      ? commands.complete("command-1", "completed", 20)
      : expected === "cancelled"
        ? commands.cancel(cancel("cancel-1", "command-1"), 20)
        : (commands.expire(60), commands.outcomeFor("command-1"));
    expect(first).toMatchObject(expected === "timed-out" ? { outcome: "timed-out" } : { record: { outcome: expected } });
    const second = expected === "cancelled"
      ? commands.complete("command-1", "completed", 21)
      : commands.cancel(cancel("cancel-2", "command-1"), 21);
    expect(second).toMatchObject({ kind: "outcome", idempotent: true, record: { outcome: expected, revision: 2 } });
    expect(commands.terminalCount()).toBe(1);
  });

  it("applies exactly one terminal effect across deterministic operation sequences", () => {
    const operations = ["complete", "cancel", "timeout"] as const;
    for (const first of operations) {
      for (const second of operations) {
        const commands = tracker(30);
        commands.start(command("command-1"), 0);
        apply(commands, first);
        apply(commands, second);
        apply(commands, first);
        const record = commands.outcomeFor("command-1");
        const expected: StructuredCommandTerminalOutcome = first === "complete" ? "completed" : first === "cancel" ? "cancelled" : "timed-out";
        expect(record).toMatchObject({ outcome: expected, revision: 2 });
        expect(commands.terminalCount()).toBe(1);
      }
    }
  });

  it("bounds retained terminal outcomes without affecting other agents' command state", () => {
    const commands = tracker();
    for (let index = 0; index < 6; index += 1) {
      commands.start(command(`command-${index}`), index);
      commands.complete(`command-${index}`, "completed", index + 1);
    }
    expect(commands.terminalCount()).toBe(4);
    expect(commands.outcomeFor("command-0")).toBeNull();
    expect(commands.outcomeFor("command-5")).toMatchObject({ outcome: "completed" });
  });
});

function apply(commands: StructuredCommandTracker, operation: "complete" | "cancel" | "timeout"): void {
  if (operation === "complete") commands.complete("command-1", "completed", 10);
  else if (operation === "cancel") commands.cancel(cancel("cancel-operation", "command-1"), 10);
  else commands.expire(30);
}
