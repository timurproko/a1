import {
  assertManagedAgentDescriptor,
  type AgentLifecycleState,
  type ManagedAgentDescriptor,
} from "../../contracts/workspace/index.js";

export interface WorkspaceAgentFailure {
  readonly code: string;
  readonly message: string;
}

export interface WorkspaceAgentState extends ManagedAgentDescriptor {
  readonly unreadActivity: number;
  readonly attention: boolean;
  readonly failure: WorkspaceAgentFailure | null;
}

export interface WorkspaceView {
  readonly workspaceId: string;
  readonly revision: number;
  readonly selectedAgentId: string | null;
  readonly agents: readonly WorkspaceAgentState[];
}

export type WorkspaceReducerResult<T = undefined> =
  | { readonly kind: "applied"; readonly view: WorkspaceView; readonly value: T }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

type MutableAgentState = {
  -readonly [Key in keyof WorkspaceAgentState]: WorkspaceAgentState[Key];
};

const REMOVABLE_STATES: ReadonlySet<AgentLifecycleState> = new Set(["stopped", "failed", "discontinuous"]);

export class WorkspaceReducer {
  readonly #agents = new Map<string, MutableAgentState>();
  #selectedAgentId: string | null;
  #revision: number;

  constructor(
    readonly workspaceId: string,
    agents: readonly WorkspaceAgentState[] = [],
    selectedAgentId: string | null = null,
    revision = 0,
  ) {
    if (!workspaceId || workspaceId.includes("\0")) throw new TypeError("workspace id is invalid");
    if (!Number.isSafeInteger(revision) || revision < 0) throw new RangeError("workspace revision must be a non-negative safe integer");
    for (const agent of agents) {
      assertWorkspaceAgent(agent);
      if (this.#agents.has(agent.id)) throw new TypeError(`duplicate workspace agent id: ${agent.id}`);
      this.#agents.set(agent.id, { ...agent });
    }
    if (selectedAgentId !== null && !this.#agents.has(selectedAgentId)) throw new TypeError("selected workspace agent must exist");
    this.#selectedAgentId = selectedAgentId ?? agents[0]?.id ?? null;
    this.#revision = revision;
  }

  createAgent(descriptor: ManagedAgentDescriptor): WorkspaceReducerResult<WorkspaceAgentState> {
    try {
      assertManagedAgentDescriptor(descriptor);
    } catch (error) {
      return rejected("invalid-agent", error);
    }
    if (this.#agents.has(descriptor.id)) return rejected("duplicate-agent", new Error(`workspace agent id already exists: ${descriptor.id}`));
    const agent: MutableAgentState = {
      ...descriptor,
      displayName: this.#uniqueDisplayName(descriptor.displayName),
      unreadActivity: 0,
      attention: false,
      failure: null,
    };
    this.#agents.set(agent.id, agent);
    this.#selectedAgentId ??= agent.id;
    this.#revision += 1;
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  selectAgent(agentId: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    const changed = this.#selectedAgentId !== agentId || agent.unreadActivity !== 0 || agent.attention;
    this.#selectedAgentId = agentId;
    agent.unreadActivity = 0;
    agent.attention = false;
    if (changed) this.#revision += 1;
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  renameAgent(agentId: string, displayName: string): WorkspaceReducerResult<string> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    try {
      assertDisplayName(displayName);
    } catch (error) {
      return rejected("invalid-display-name", error);
    }
    agent.displayName = this.#uniqueDisplayName(displayName, agentId);
    this.#revision += 1;
    return applied(this.view(), agent.displayName);
  }

  stopAgent(agentId: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    if (agent.lifecycle !== "stopped") {
      agent.lifecycle = "stopped";
      agent.unreadActivity = 0;
      agent.attention = false;
      this.#revision += 1;
    }
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  restartAgent(agentId: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    agent.lifecycle = "creating";
    agent.unreadActivity = 0;
    agent.attention = false;
    agent.failure = null;
    this.#revision += 1;
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  removeAgent(agentId: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    if (!REMOVABLE_STATES.has(agent.lifecycle)) {
      return rejected("agent-active", new Error(`workspace agent must be stopped, failed, or discontinuous before removal: ${agentId}`));
    }
    const removed = Object.freeze({ ...agent });
    this.#agents.delete(agentId);
    if (this.#selectedAgentId === agentId) this.#selectedAgentId = this.#agents.keys().next().value ?? null;
    this.#revision += 1;
    return applied(this.view(), removed);
  }

  recordActivity(agentId: string, amount = 1): WorkspaceReducerResult<number> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    if (!Number.isSafeInteger(amount) || amount <= 0) return rejected("invalid-activity", new Error("workspace unread activity amount must be positive"));
    if (this.#selectedAgentId !== agentId) {
      agent.unreadActivity += amount;
      this.#revision += 1;
    }
    return applied(this.view(), agent.unreadActivity);
  }

  requestAttention(agentId: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    if (!agent.attention) {
      agent.attention = true;
      if (this.#selectedAgentId !== agentId && agent.unreadActivity === 0) agent.unreadActivity = 1;
      this.#revision += 1;
    }
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  markRecovered(agentId: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    agent.lifecycle = "ready";
    agent.unreadActivity = 0;
    agent.attention = false;
    agent.failure = null;
    this.#revision += 1;
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  markDiscontinuous(agentId: string, code: string, message: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    if (!code || code.length > 128 || code.includes("\0") || !message || message.length > 4_096 || message.includes("\0")) {
      return rejected("invalid-failure", new Error("workspace discontinuity code and message must be bounded non-empty values"));
    }
    agent.lifecycle = "discontinuous";
    agent.failure = Object.freeze({ code, message });
    agent.attention = true;
    this.#revision += 1;
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  markFailed(agentId: string, code: string, message: string): WorkspaceReducerResult<WorkspaceAgentState> {
    const agent = this.#agents.get(agentId);
    if (!agent) return unknownAgent(agentId);
    if (!code || code.length > 128 || code.includes("\0") || !message || message.length > 4_096 || message.includes("\0")) {
      return rejected("invalid-failure", new Error("workspace failure code and message must be bounded non-empty values"));
    }
    agent.lifecycle = "failed";
    agent.failure = Object.freeze({ code, message });
    agent.attention = true;
    this.#revision += 1;
    return applied(this.view(), Object.freeze({ ...agent }));
  }

  view(): WorkspaceView {
    return Object.freeze({
      workspaceId: this.workspaceId,
      revision: this.#revision,
      selectedAgentId: this.#selectedAgentId,
      agents: Object.freeze([...this.#agents.values()].map(agent => Object.freeze({ ...agent }))),
    });
  }

  #uniqueDisplayName(requested: string, excludeAgentId: string | null = null): string {
    assertDisplayName(requested);
    const used = new Set([...this.#agents.values()].filter(agent => agent.id !== excludeAgentId).map(agent => agent.displayName));
    if (!used.has(requested)) return requested;
    for (let suffix = 2; suffix < 1_000_000; suffix += 1) {
      const candidate = `${requested} (${suffix})`;
      if (!used.has(candidate)) return candidate;
    }
    throw new RangeError("workspace display name suffix budget is exhausted");
  }
}

function applied<T>(view: WorkspaceView, value: T): Extract<WorkspaceReducerResult<T>, { kind: "applied" }> {
  return { kind: "applied", view, value };
}

function rejected(code: string, error: unknown): Extract<WorkspaceReducerResult<never>, { kind: "rejected" }> {
  return { kind: "rejected", code, diagnostic: error instanceof Error ? error.message : String(error) };
}

function unknownAgent(agentId: string): Extract<WorkspaceReducerResult<never>, { kind: "rejected" }> {
  return rejected("unknown-agent", new Error(`workspace agent does not exist: ${agentId}`));
}

function assertWorkspaceAgent(agent: WorkspaceAgentState): void {
  assertManagedAgentDescriptor(agent);
  if (!Number.isSafeInteger(agent.unreadActivity) || agent.unreadActivity < 0) throw new RangeError("workspace unread activity is invalid");
  if (typeof agent.attention !== "boolean") throw new TypeError("workspace attention is invalid");
  if (agent.failure !== null && (!agent.failure.code || !agent.failure.message)) throw new TypeError("workspace failure is invalid");
}

function assertDisplayName(value: string): void {
  if (typeof value !== "string" || value.length === 0 || value.length > 256 || value.includes("\0")) {
    throw new TypeError("workspace display name is invalid");
  }
}
