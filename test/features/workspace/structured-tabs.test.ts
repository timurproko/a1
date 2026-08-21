import { describe, expect, it } from "vitest";
import {
  StructuredWorkspaceTabs,
  type StructuredWorkspaceTabsResult,
} from "../../../src/features/workspace/index.js";
import {
  AGENT_ENGINE_CONTRACT_VERSION,
  type AgentCapabilityContract,
  type AgentCommand,
  type AgentCommandOutcome,
  type AgentEnginePort,
  type AgentEvent,
  type AgentMessage,
  type AgentSessionLifecycle,
  type AgentSessionPort,
  type AgentSnapshot,
} from "../../../src/foundation/agent-engine-contracts/index.js";

const CAPABILITIES: AgentCapabilityContract = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  commands: ["prompt", "abort"],
  events: ["lifecycle", "content", "command-outcome", "snapshot-invalidated", "diagnostic"],
  snapshots: { supported: true, maxBytes: 256 * 1024 },
};

class WorkspaceTestSession implements AgentSessionPort {
  lifecycle: AgentSessionLifecycle = "ready";
  readonly capabilities = CAPABILITIES;
  readonly commands: AgentCommand[] = [];
  readonly #listeners = new Set<(event: AgentEvent) => void>();
  snapshotValue: AgentSnapshot;
  outcome: AgentCommandOutcome = "completed";
  disposed = false;

  constructor(readonly sessionId: string, content: readonly AgentMessage[] = []) {
    this.snapshotValue = snapshot(sessionId, 0, content);
  }

  async execute(command: AgentCommand): Promise<AgentCommandOutcome> {
    this.commands.push(command);
    return this.outcome;
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  emit(event: AgentEvent): void {
    for (const listener of this.#listeners) listener(event);
  }

  async snapshot(): Promise<AgentSnapshot> {
    return this.snapshotValue;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.lifecycle = "stopped";
    this.#listeners.clear();
  }
}

class WorkspaceTestEngine implements AgentEnginePort {
  readonly capabilities = CAPABILITIES;
  disposed = false;
  constructor(readonly session: WorkspaceTestSession) {}
  async createSession(input: { readonly sessionId: string }): Promise<AgentSessionPort> {
    if (input.sessionId !== this.session.sessionId) throw new Error("unexpected session identity");
    return this.session;
  }
  async dispose(): Promise<void> { this.disposed = true; }
}

function harness(options: ConstructorParameters<typeof StructuredWorkspaceTabs>[0] extends infer _ ? {
  readonly maxAgents?: number;
  readonly maxMessagesPerAgent?: number;
  readonly maxMessageBytes?: number;
  readonly maxEditorBytes?: number;
} : never = {}) {
  const engines = new Map<string, WorkspaceTestEngine[]>();
  const workspace = new StructuredWorkspaceTabs({
    cwd: process.cwd(),
    limits: options,
    now: () => "2026-08-21T00:00:00.000Z",
    createEngine: async agentId => {
      const engine = new WorkspaceTestEngine(new WorkspaceTestSession(`${agentId}.session`));
      const entries = engines.get(agentId) ?? [];
      entries.push(engine);
      engines.set(agentId, entries);
      return engine;
    },
  });
  return { workspace, engines };
}

function value<T>(result: StructuredWorkspaceTabsResult<T>): T {
  if (result.kind !== "applied") throw new Error(`${result.code}: ${result.diagnostic}`);
  return result.value;
}

function message(id: string, role: AgentMessage["role"] = "assistant", text = id): AgentMessage {
  return { id, role, status: "final", content: [{ kind: "text", text }] };
}

function contentEvent(sessionId: string, sequence: number, content: AgentMessage): AgentEvent {
  return { contractVersion: AGENT_ENGINE_CONTRACT_VERSION, type: "content", sessionId, sequence, content };
}

function snapshot(sessionId: string, sequence: number, content: readonly AgentMessage[] = []): AgentSnapshot {
  return {
    contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
    snapshotId: `${sessionId}.snapshot.${sequence}`,
    sessionId,
    revision: sequence,
    sequence,
    lifecycle: "ready",
    content,
    activeCommandIds: [],
    capabilities: CAPABILITIES,
  };
}

async function createTwo(workspace: StructuredWorkspaceTabs): Promise<void> {
  value(await workspace.createAgent({ id: "agent-1", displayName: "Research" }));
  value(await workspace.createAgent({ id: "agent-2", displayName: "Research" }));
}

describe("structured workspace tabs", () => {
  it("keeps transcript, tool, editor, selection, and accessibility state independent", async () => {
    const { workspace, engines } = harness();
    await createTwo(workspace);
    value(workspace.setEditorText("agent-1", "first draft"));
    value(workspace.setEditorText("agent-2", "second draft"));
    value(await workspace.selectAgent("agent-2"));

    engines.get("agent-1")![0]!.session.emit(contentEvent("agent-1.session", 1, message("background-message")));
    engines.get("agent-1")![0]!.session.emit(contentEvent("agent-1.session", 2, {
      id: "tool-message",
      role: "tool",
      status: "final",
      content: [{ kind: "tool-result", invocationId: "tool-1", output: { ok: true }, failed: false }],
    }));
    engines.get("agent-2")![0]!.session.emit(contentEvent("agent-2.session", 1, message("selected-message")));
    await workspace.flush();

    const view = workspace.view();
    expect(view.role).toBe("tablist");
    expect(view.tabs).toMatchObject([
      { role: "tab", agentId: "agent-1", label: "Research", selected: false },
      { role: "tab", agentId: "agent-2", label: "Research (2)", selected: true },
    ]);
    expect(view.panels[0]).toMatchObject({ role: "tabpanel", editorText: "first draft", transcript: [{ id: "background-message" }, { id: "tool-message" }] });
    expect(view.panels[0]!.toolMessages.map(entry => entry.id)).toEqual(["tool-message"]);
    expect(view.panels[1]).toMatchObject({ editorText: "second draft", transcript: [{ id: "selected-message" }] });
    expect(view.workspace.agents[0]).toMatchObject({ unreadActivity: 2 });
    expect(view.workspace.agents[1]).toMatchObject({ unreadActivity: 0 });
    expect(view.selectedPanel?.accessibleDescription).toContain("selected structured agent agent-2");
    await workspace.dispose();
  });

  it("serializes switching and prompt acceptance without crossing input targets", async () => {
    const { workspace, engines } = harness();
    await createTwo(workspace);
    const [firstPrompt, firstSwitch] = await Promise.all([
      workspace.sendPrompt("agent-1", "for one"),
      workspace.selectAgent("agent-2"),
    ]);
    expect(firstPrompt).toMatchObject({ kind: "applied", value: { outcome: "completed" } });
    expect(firstSwitch).toMatchObject({ kind: "applied", view: { workspace: { selectedAgentId: "agent-2" } } });
    expect(engines.get("agent-1")![0]!.session.commands).toMatchObject([{ type: "prompt", text: "for one", sessionId: "agent-1.session" }]);
    expect(engines.get("agent-2")![0]!.session.commands).toEqual([]);

    const [switchBack, stalePrompt] = await Promise.all([
      workspace.selectAgent("agent-1"),
      workspace.sendPrompt("agent-2", "must not cross"),
    ]);
    expect(switchBack).toMatchObject({ kind: "applied" });
    expect(stalePrompt).toMatchObject({ kind: "rejected", code: "stale-selection" });
    expect(engines.get("agent-2")![0]!.session.commands).toEqual([]);
    await workspace.dispose();
  });

  it("isolates background failure and supports restart from an authoritative snapshot", async () => {
    const { workspace, engines } = harness();
    await createTwo(workspace);
    engines.get("agent-2")![0]!.session.emit({
      contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
      type: "lifecycle",
      sessionId: "agent-2.session",
      sequence: 1,
      lifecycle: "failed",
      reason: "adapter crashed",
    });
    await workspace.flush();
    expect(workspace.view().workspace.agents[1]).toMatchObject({ lifecycle: "failed", attention: true, failure: { code: "engine-failed" } });
    expect(workspace.view().workspace.agents[0]).toMatchObject({ lifecycle: "ready", failure: null });

    const restarted = value(await workspace.restartAgent("agent-2"));
    expect(restarted).toMatchObject({ lifecycle: "ready", failure: null, transcript: [] });
    expect(engines.get("agent-2")).toHaveLength(2);
    value(await workspace.selectAgent("agent-1"));
    expect(await workspace.sendPrompt("agent-1", "still available")).toMatchObject({ kind: "applied", value: { outcome: "completed" } });
    await workspace.dispose();
  });

  it("recovers event gaps from snapshots and bounds agents, transcript, editors, and messages", async () => {
    const { workspace, engines } = harness({ maxAgents: 2, maxMessagesPerAgent: 2, maxMessageBytes: 256, maxEditorBytes: 8 });
    await createTwo(workspace);
    expect(await workspace.createAgent({ id: "agent-3", displayName: "Third" })).toMatchObject({ kind: "rejected", code: "agent-limit" });
    expect(workspace.setEditorText("agent-1", "123456789")).toMatchObject({ kind: "rejected", code: "editor-limit" });

    const first = engines.get("agent-1")![0]!.session;
    first.emit(contentEvent("agent-1.session", 1, message("one")));
    first.emit(contentEvent("agent-1.session", 2, message("two")));
    first.emit(contentEvent("agent-1.session", 3, message("three")));
    await workspace.flush();
    expect(workspace.view().panels[0]!.transcript.map(entry => entry.id)).toEqual(["two", "three"]);

    first.snapshotValue = snapshot("agent-1.session", 5, [message("snapshot-a"), message("snapshot-b")]);
    first.emit(contentEvent("agent-1.session", 5, message("gap-event")));
    await workspace.flush();
    expect(workspace.view().panels[0]).toMatchObject({ lastSequence: 5, transcript: [{ id: "snapshot-a" }, { id: "snapshot-b" }] });

    first.emit(contentEvent("agent-1.session", 6, message("oversized", "assistant", "x".repeat(512))));
    await workspace.flush();
    expect(workspace.view().workspace.agents[0]).toMatchObject({ lifecycle: "failed", attention: true });
    expect(workspace.view().workspace.agents[1]).toMatchObject({ lifecycle: "ready", failure: null });
    await workspace.dispose();
  });
});
