import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  WorkspaceReducer,
  WorkspaceStore,
  type WorkspaceAgentState,
} from "../../../src/features/workspace/index.js";
import { WORKSPACE_CONTRACT_VERSION, type ManagedAgentDescriptor } from "../../../src/contracts/workspace/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

function agent(id: string, displayName = "Research", lifecycle: ManagedAgentDescriptor["lifecycle"] = "ready"): ManagedAgentDescriptor {
  return {
    id,
    displayName,
    adapterId: "adapter.synthetic",
    runtime: "structured",
    lifecycle,
    capability: {
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

function createWorkspace(): WorkspaceReducer {
  const reducer = new WorkspaceReducer("workspace-default");
  reducer.createAgent(agent("agent-1", "Research"));
  reducer.createAgent(agent("agent-2", "Research"));
  return reducer;
}

describe("workspace reducer", () => {
  it("creates stable agent identities with unique selectable labels", () => {
    const reducer = createWorkspace();
    const view = reducer.view();
    expect(view.selectedAgentId).toBe("agent-1");
    expect(view.agents.map(value => [value.id, value.displayName])).toEqual([
      ["agent-1", "Research"],
      ["agent-2", "Research (2)"],
    ]);
    expect(reducer.createAgent(agent("agent-1", "Other"))).toMatchObject({ kind: "rejected", code: "duplicate-agent" });
  });

  it("tracks unread activity and attention without conflating selected agent state", () => {
    const reducer = createWorkspace();
    expect(reducer.recordActivity("agent-2", 3)).toMatchObject({ kind: "applied", value: 3 });
    expect(reducer.requestAttention("agent-2")).toMatchObject({ kind: "applied", value: { attention: true } });
    expect(reducer.view().agents[1]).toMatchObject({ id: "agent-2", unreadActivity: 3, attention: true });

    expect(reducer.selectAgent("agent-2")).toMatchObject({ kind: "applied", value: { id: "agent-2", unreadActivity: 0, attention: false } });
    expect(reducer.view().selectedAgentId).toBe("agent-2");
    expect(reducer.recordActivity("agent-2", 2)).toMatchObject({ kind: "applied", value: 0 });
    expect(reducer.view().agents[1]).toMatchObject({ unreadActivity: 0, attention: false });
  });

  it("renames through the same unique-label policy", () => {
    const reducer = createWorkspace();
    expect(reducer.renameAgent("agent-2", "Research")).toMatchObject({ kind: "applied", value: "Research (2)" });
    expect(reducer.renameAgent("agent-2", "Reviewer")).toMatchObject({ kind: "applied", value: "Reviewer" });
    expect(reducer.renameAgent("agent-2", "Research")).toMatchObject({ kind: "applied", value: "Research (2)" });
    expect(reducer.view().agents.map(value => value.displayName)).toEqual(["Research", "Research (2)"]);
  });

  it("supports stop, restart, failure, and safe removal over stable identities", () => {
    const reducer = createWorkspace();
    expect(reducer.removeAgent("agent-1")).toMatchObject({ kind: "rejected", code: "agent-active" });
    expect(reducer.stopAgent("agent-1")).toMatchObject({ kind: "applied", value: { lifecycle: "stopped" } });
    expect(reducer.removeAgent("agent-1")).toMatchObject({ kind: "applied", value: { id: "agent-1", lifecycle: "stopped" } });
    expect(reducer.view()).toMatchObject({ selectedAgentId: "agent-2" });

    expect(reducer.markFailed("agent-2", "adapter-crash", "synthetic failure")).toMatchObject({
      kind: "applied",
      value: { lifecycle: "failed", attention: true, failure: { code: "adapter-crash" } },
    });
    expect(reducer.restartAgent("agent-2")).toMatchObject({
      kind: "applied",
      value: { lifecycle: "creating", unreadActivity: 0, attention: false, failure: null },
    });
    expect(reducer.stopAgent("agent-2")).toMatchObject({ kind: "applied", value: { lifecycle: "stopped" } });
    expect(reducer.removeAgent("agent-2")).toMatchObject({ kind: "applied" });
    expect(reducer.view().agents).toEqual([]);
    expect(reducer.view().selectedAgentId).toBeNull();
  });

  it("rejects unknown and malformed operations without mutating state", () => {
    const reducer = createWorkspace();
    const before = reducer.view();
    expect(reducer.selectAgent("missing")).toMatchObject({ kind: "rejected", code: "unknown-agent" });
    expect(reducer.recordActivity("agent-2", 0)).toMatchObject({ kind: "rejected", code: "invalid-activity" });
    expect(reducer.renameAgent("agent-2", "")).toMatchObject({ kind: "rejected", code: "invalid-display-name" });
    expect(reducer.view()).toEqual(before);
  });
});

describe("workspace durable storage", () => {
  it("persists reducer state, presentation metadata, selection, and revision across restart", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-workspace-store-"));
    roots.push(root);
    const path = join(root, "control.sqlite3");
    const firstStore = new WorkspaceStore(path);
    const reducer = createWorkspace();
    reducer.recordActivity("agent-2", 2);
    reducer.requestAttention("agent-2");
    reducer.markFailed("agent-1", "adapter-crash", "bounded failure");
    firstStore.save(reducer);
    firstStore.close();

    const secondStore = new WorkspaceStore(path);
    const restored = secondStore.load();
    expect(restored.view()).toEqual(reducer.view());
    expect(restored.view().agents).toHaveLength(2);
    expect(restored.view().agents[0]).toMatchObject({ id: "agent-1", lifecycle: "failed", attention: true, failure: { code: "adapter-crash" } });
    expect(restored.view().agents[1]).toMatchObject({ id: "agent-2", unreadActivity: 2, attention: true });

    restored.stopAgent("agent-1");
    restored.removeAgent("agent-1");
    restored.selectAgent("agent-2");
    secondStore.save(restored);
    secondStore.close();

    const thirdStore = new WorkspaceStore(path);
    const final = thirdStore.load();
    expect(final.view().agents.map(value => value.id)).toEqual(["agent-2"]);
    expect(final.view().selectedAgentId).toBe("agent-2");
    expect(final.view().revision).toBe(restored.view().revision);
    thirdStore.close();
  });

  it("atomically rejects a selected identity outside the replacement set", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-workspace-invalid-store-"));
    roots.push(root);
    const store = new WorkspaceStore(join(root, "control.sqlite3"));
    const reducer = createWorkspace();
    store.save(reducer);
    expect(() => store.saveView({ ...reducer.view(), selectedAgentId: "missing" })).toThrow(/selected workspace agent/);
    expect(store.load().view()).toEqual(reducer.view());
    store.close();
  });

  it("loads stored agents into the reducer contract", () => {
    const stored: WorkspaceAgentState = {
      ...agent("agent-1", "Research"),
      unreadActivity: 1,
      attention: true,
      failure: { code: "failed", message: "stored" },
    };
    const reducer = new WorkspaceReducer("workspace-default", [stored], "agent-1", 4);
    expect(reducer.view()).toMatchObject({ workspaceId: "workspace-default", selectedAgentId: "agent-1", revision: 4 });
    expect(reducer.view().agents[0]).toMatchObject({ unreadActivity: 1, attention: true, failure: { code: "failed" } });
  });
});
