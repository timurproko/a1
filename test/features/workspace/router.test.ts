import { describe, expect, it } from "vitest";
import { WorkspaceReducer, WorkspaceRouter, type WorkspaceRouterResult } from "../../../src/features/workspace/index.js";
import { WORKSPACE_CONTRACT_VERSION, type ManagedAgentDescriptor } from "../../../src/foundation/workspace-contracts/index.js";

function structuredAgent(id: string): ManagedAgentDescriptor {
  return {
    id,
    displayName: id,
    adapterId: "adapter.synthetic",
    runtime: "structured",
    lifecycle: "ready",
    capability: {
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
        maxEventBytes: 64_000,
        maxSnapshotBytes: 128_000,
        maxAttachmentBytes: 256_000,
        maxQueuedEvents: 8,
        maxConcurrentCommands: 2,
        maxReconnectEvents: 32,
      },
    },
    createdAt: "2026-08-13T00:00:00.000Z",
    recoveryReferenceId: null,
  };
}

function composedAgent(id: string): ManagedAgentDescriptor {
  return {
    ...structuredAgent(id),
    runtime: "composed-terminal",
    capability: {
      kind: "composed-terminal",
      protocolVersion: 1,
      hostInstanceId: "host-1",
      topologyRevision: 1,
      proofStatus: "accepted",
    },
  };
}

async function createRouter(): Promise<WorkspaceRouter> {
  const router = new WorkspaceRouter(new WorkspaceReducer("workspace-default"));
  await router.createAgent(structuredAgent("agent-1"));
  await router.createAgent(structuredAgent("agent-2"));
  return router;
}

function appliedValue<T>(result: WorkspaceRouterResult<T>): T {
  if (result.kind !== "applied") throw new Error(`expected applied route, got ${result.code}: ${result.diagnostic}`);
  return result.value;
}

describe("ordered workspace router", () => {
  it("routes a command to the agent selected at its serialized acceptance point", async () => {
    const router = await createRouter();
    const [command, selection] = await Promise.all([
      router.sendStructuredCommand("agent-1", "prompt", { text: "before switch" }),
      router.selectAgent("agent-2"),
    ]);
    expect(command).toMatchObject({ kind: "applied", value: { agentId: "agent-1" } });
    expect(selection).toMatchObject({ kind: "applied", view: { selectedAgentId: "agent-2" } });

    const [secondSelection, secondCommand] = await Promise.all([
      router.selectAgent("agent-1"),
      router.sendStructuredCommand("agent-2", "prompt", { text: "would cross-route" }),
    ]);
    expect(secondSelection).toMatchObject({ kind: "applied", view: { selectedAgentId: "agent-1" } });
    expect(secondCommand).toMatchObject({ kind: "rejected", code: "stale-selection" });
  });

  it("accepts post-switch commands when the expected selection still matches", async () => {
    const router = await createRouter();
    await router.selectAgent("agent-2");
    const result = await router.sendStructuredCommand("agent-2", "inspect", { safe: true });
    expect(result).toMatchObject({ kind: "applied", value: { agentId: "agent-2", command: "inspect" } });
  });

  it("serializes cancellation through the selected agent and returns one durable outcome", async () => {
    const router = await createRouter();
    const command = appliedValue(await router.sendStructuredCommand("agent-1", "prompt", {}));
    const [cancelOne, cancelTwo] = await Promise.all([
      router.cancelStructuredCommand("agent-1", command.correlationId),
      router.cancelStructuredCommand("agent-1", command.correlationId),
    ]);
    expect(cancelOne).toMatchObject({ kind: "applied", value: { correlationId: command.correlationId, outcome: "cancelled" } });
    expect(cancelTwo).toMatchObject({ kind: "applied", value: { correlationId: command.correlationId, outcome: "cancelled" } });
  });

  it("rejects commands for removed or non-structured agents without cross-routing", async () => {
    const router = await createRouter();
    await router.selectAgent("agent-2");
    await router.stopAgent("agent-2");
    const removed = await router.removeAgent("agent-2");
    expect(removed).toMatchObject({ kind: "applied", view: { selectedAgentId: "agent-1" } });
    expect(await router.sendStructuredCommand("agent-2", "prompt", {})).toMatchObject({ kind: "rejected", code: "stale-selection" });

    await router.createAgent(composedAgent("agent-composed"));
    await router.selectAgent("agent-composed");
    expect(await router.sendStructuredCommand("agent-composed", "prompt", {})).toMatchObject({ kind: "rejected", code: "capability-mismatch" });
  });

  it("serializes activity with selection so unread state belongs to the accepted target", async () => {
    const router = await createRouter();
    const [activity, selection] = await Promise.all([
      router.recordActivity("agent-2", 2),
      router.selectAgent("agent-2"),
    ]);
    expect(activity).toMatchObject({ kind: "applied", value: 2 });
    expect(selection).toMatchObject({ kind: "applied", value: { id: "agent-2", unreadActivity: 0 } });
  });

  it("keeps race outcomes deterministic across send/select orderings", async () => {
    for (const selectFirst of [false, true]) {
      const router = await createRouter();
      const send = () => router.sendStructuredCommand(selectFirst ? "agent-2" : "agent-1", "prompt", { selectFirst });
      const select = () => router.selectAgent("agent-2");
      const results = selectFirst
        ? await Promise.all([select(), send()])
        : await Promise.all([send(), select()]);
      const [first, second] = results;
      if (!selectFirst) {
        expect(first).toMatchObject({ kind: "applied", value: { agentId: "agent-1" } });
        expect(second).toMatchObject({ kind: "applied", view: { selectedAgentId: "agent-2" } });
      } else {
        expect(first).toMatchObject({ kind: "applied", view: { selectedAgentId: "agent-2" } });
        expect(second).toMatchObject({ kind: "applied", value: { agentId: "agent-2" } });
      }
    }
  });

  it("keeps removal races bounded by the serialized operation order", async () => {
    for (const removeFirst of [false, true]) {
      const router = await createRouter();
      await router.selectAgent("agent-2");
      await router.stopAgent("agent-2");
      const send = () => router.sendStructuredCommand("agent-2", "prompt", { removeFirst });
      const remove = () => router.removeAgent("agent-2");
      const [first, second] = removeFirst ? await Promise.all([remove(), send()]) : await Promise.all([send(), remove()]);
      if (!removeFirst) {
        expect(first).toMatchObject({ kind: "applied", value: { agentId: "agent-2" } });
        expect(second).toMatchObject({ kind: "applied", value: { id: "agent-2" } });
      } else {
        expect(first).toMatchObject({ kind: "applied", value: { id: "agent-2" } });
        expect(second).toMatchObject({ kind: "rejected", code: "stale-selection" });
      }
    }
  });
});
