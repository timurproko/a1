import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { availableWorkspaceActions, gateWorkspaceAction } from "../../../src/features/workspace/index.js";
import { NATIVE_HOST_PROTOCOL_VERSION, WORKSPACE_CONTRACT_VERSION, type ManagedAgentDescriptor } from "../../../src/contracts/workspace/index.js";

function structuredAgent(overrides: Partial<Extract<ManagedAgentDescriptor["capability"], { kind: "structured" }>> = {}): ManagedAgentDescriptor {
  return {
    id: "agent-structured",
    displayName: "Structured",
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
      attachmentTypes: ["json"],
      flow: {
        maxEventBytes: 64_000,
        maxSnapshotBytes: 128_000,
        maxAttachmentBytes: 256_000,
        maxQueuedEvents: 8,
        maxConcurrentCommands: 2,
        maxReconnectEvents: 32,
      },
      ...overrides,
    },
    createdAt: "2026-08-13T00:00:00.000Z",
    recoveryReferenceId: null,
  };
}

function composedAgent(proofStatus: "unavailable" | "pending" | "accepted" | "rejected"): ManagedAgentDescriptor {
  return {
    id: "agent-composed",
    displayName: "Composed",
    adapterId: "adapter.native-host",
    runtime: "composed-terminal",
    lifecycle: "ready",
    capability: {
      kind: "composed-terminal",
      protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
      hostInstanceId: "host-1",
      topologyRevision: 4,
      proofStatus,
    },
    createdAt: "2026-08-13T00:00:00.000Z",
    recoveryReferenceId: null,
  };
}

describe("workspace capability gates", () => {
  it("allows only declared structured commands, cancellation, snapshots, and attachment types", () => {
    const agent = structuredAgent();
    expect(gateWorkspaceAction(agent, { type: "structured-command", command: "prompt" })).toMatchObject({ kind: "allowed" });
    expect(gateWorkspaceAction(agent, { type: "structured-command", command: "missing" })).toMatchObject({
      kind: "rejected",
      code: "unsupported-command",
      diagnostic: expect.stringContaining("does not declare command missing"),
    });
    expect(gateWorkspaceAction(agent, { type: "cancel-structured-command" })).toMatchObject({ kind: "allowed" });
    expect(gateWorkspaceAction(agent, { type: "restore-structured-snapshot" })).toMatchObject({ kind: "allowed" });
    expect(gateWorkspaceAction(agent, { type: "send-structured-attachment", attachmentType: "json" })).toMatchObject({ kind: "allowed" });
    expect(gateWorkspaceAction(agent, { type: "send-structured-attachment", attachmentType: "binary" })).toMatchObject({ kind: "rejected", code: "unsupported-attachment" });
    expect(availableWorkspaceActions(agent)).toEqual([
      "structured-command",
      "cancel-structured-command",
      "restore-structured-snapshot",
      "send-structured-attachment",
    ]);
  });

  it("narrows structured actions when capabilities are absent", () => {
    const agent = structuredAgent({ commands: [], snapshots: "none", resume: "none", cancellation: "none", attachmentTypes: [] });
    expect(availableWorkspaceActions(agent)).toEqual([]);
    expect(gateWorkspaceAction(agent, { type: "structured-command", command: "prompt" })).toMatchObject({ kind: "rejected", code: "unsupported-command" });
    expect(gateWorkspaceAction(agent, { type: "cancel-structured-command" })).toMatchObject({ kind: "rejected", code: "unsupported-cancellation" });
    expect(gateWorkspaceAction(agent, { type: "restore-structured-snapshot" })).toMatchObject({ kind: "rejected", code: "unsupported-snapshot" });
    expect(gateWorkspaceAction(agent, { type: "send-structured-attachment", attachmentType: "json" })).toMatchObject({ kind: "rejected", code: "unsupported-attachment" });
  });

  it("keeps structured and composed action families disjoint", () => {
    expect(gateWorkspaceAction(structuredAgent(), { type: "focus-terminal-pane" })).toMatchObject({ kind: "rejected", code: "capability-mismatch" });
    expect(gateWorkspaceAction(composedAgent("accepted"), { type: "structured-command", command: "prompt" })).toMatchObject({ kind: "rejected", code: "capability-mismatch" });
  });

  it("enables composed actions only after native-host proof acceptance", () => {
    for (const status of ["unavailable", "pending", "rejected"] as const) {
      expect(availableWorkspaceActions(composedAgent(status))).toEqual([]);
      expect(gateWorkspaceAction(composedAgent(status), { type: "create-terminal-pane" })).toMatchObject({ kind: "rejected", code: "composed-unavailable" });
    }
    expect(availableWorkspaceActions(composedAgent("accepted"))).toEqual([
      "create-terminal-pane",
      "apply-terminal-layout",
      "focus-terminal-pane",
      "close-terminal-pane",
    ]);
    expect(gateWorkspaceAction(composedAgent("accepted"), { type: "apply-terminal-layout" })).toMatchObject({ kind: "allowed" });
  });

  it("does not infer structured capability from ANSI-like text, timing, or composed host state", async () => {
    const agent = structuredAgent({ commands: ["prompt"] });
    const acceptedPlain = gateWorkspaceAction(agent, { type: "structured-command", command: "prompt" });
    const acceptedAnsi = gateWorkspaceAction(agent, { type: "structured-command", command: "prompt" });
    expect(acceptedAnsi).toEqual(acceptedPlain);
    expect(gateWorkspaceAction(agent, { type: "structured-command", command: "\u001b[32mprompt\u001b[0m" })).toMatchObject({ kind: "rejected", code: "unsupported-command" });

    const source = await readFile("src/features/workspace/capabilities.ts", "utf8");
    expect(source).not.toMatch(/\u001b|\x1b|Date\.now|performance\.now|terminalBytes|terminalOutput|ptyBytes|renderedCells|nativeHostAvailable/i);
  });
});
