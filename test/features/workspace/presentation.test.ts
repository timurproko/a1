import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  WorkspaceReducer,
  presentWorkspace,
  workspaceSelectionForKey,
} from "../../../src/features/workspace/index.js";
import { WORKSPACE_CONTRACT_VERSION, type ManagedAgentDescriptor } from "../../../src/foundation/workspace-contracts/index.js";

function agent(id: string, displayName = id): ManagedAgentDescriptor {
  return {
    id,
    displayName,
    adapterId: "adapter.synthetic",
    runtime: "structured",
    lifecycle: "ready",
    capability: {
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

function workspace(): WorkspaceReducer {
  const reducer = new WorkspaceReducer("workspace-default");
  reducer.createAgent(agent("agent-1", "Research"));
  reducer.createAgent(agent("agent-2", "Reviewer"));
  return reducer;
}

describe("workspace presentation model", () => {
  it("renders multiple structured agents as bounded accessible rows", () => {
    const reducer = workspace();
    reducer.recordActivity("agent-2", 2);
    reducer.requestAttention("agent-2");
    const model = presentWorkspace(reducer.view(), { maxRows: 4, maxLabelWidth: 16 });
    expect(model).toMatchObject({
      role: "listbox",
      label: "AddOne agents",
      selectedAgentId: "agent-1",
      overflowCount: 0,
      emptyMessage: null,
      rows: [
        {
          role: "option",
          agentId: "agent-1",
          label: "Research",
          selected: true,
          lifecycle: "ready",
          unreadActivity: 0,
          attention: false,
          failure: null,
          actions: ["structured-command", "cancel-structured-command", "restore-structured-snapshot", "send-structured-attachment"],
          text: "› Research — ready",
          accessibleDescription: "ready",
        },
        {
          role: "option",
          agentId: "agent-2",
          label: "Reviewer",
          selected: false,
          lifecycle: "ready",
          unreadActivity: 2,
          attention: true,
          failure: null,
          text: "  Reviewer — ready, 2 unread, attention",
          accessibleDescription: "ready; 2 unread; needs attention",
        },
      ],
    });
    expect(model.text).toBe("AddOne agents\n› Research — ready\n  Reviewer — ready, 2 unread, attention");
  });

  it("bounds row count and label width without retaining overflow rows", () => {
    const reducer = new WorkspaceReducer("workspace-default");
    for (let index = 0; index < 20; index += 1) {
      reducer.createAgent(agent(`agent-${index}`, `A very long synthetic agent label ${index}`));
    }
    const model = presentWorkspace(reducer.view(), { maxRows: 3, maxLabelWidth: 12 });
    expect(model.rows).toHaveLength(3);
    expect(model.overflowCount).toBe(17);
    expect(model.rows.every(row => row.label.length <= 12)).toBe(true);
    expect(model.text).toContain("… 17 more");
    expect(() => presentWorkspace(reducer.view(), { maxRows: 0 })).toThrow(/maximum workspace rows/);
  });

  it("maps accessibility keyboard navigation to stable agent identities", () => {
    const reducer = workspace();
    const initial = reducer.view();
    expect(workspaceSelectionForKey(initial, "ArrowDown")).toBe("agent-2");
    const selected = reducer.selectAgent("agent-2");
    expect(selected.kind).toBe("applied");
    expect(workspaceSelectionForKey(reducer.view(), "ArrowDown")).toBe("agent-2");
    expect(workspaceSelectionForKey(reducer.view(), "ArrowUp")).toBe("agent-1");
    expect(workspaceSelectionForKey(reducer.view(), "Home")).toBe("agent-1");
    expect(workspaceSelectionForKey(reducer.view(), "End")).toBe("agent-2");
  });

  it("renders an empty status model and supports no-op keyboard navigation", () => {
    const reducer = new WorkspaceReducer("workspace-default");
    const model = presentWorkspace(reducer.view());
    expect(model).toMatchObject({
      role: "listbox",
      selectedAgentId: null,
      rows: [],
      overflowCount: 0,
      emptyMessage: "No managed agents.",
      text: "AddOne agents\nNo managed agents.",
    });
    expect(workspaceSelectionForKey(reducer.view(), "ArrowDown")).toBeNull();
  });

  it("keeps presentation free of physical terminal I/O and timing side effects", async () => {
    const source = await readFile("src/features/workspace/presentation.ts", "utf8");
    expect(source).not.toMatch(/process\.(?:stdin|stdout|stderr)|console\.|Date\.now|performance\.now|\u001b|\x1b/);
  });
});
