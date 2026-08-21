import {
  StructuredCommandTracker,
  type StructuredCommandRecord,
} from "../../foundation/structured-agent-runtime/index.js";
import type { ManagedAgentDescriptor } from "../../foundation/workspace-contracts/index.js";
import { gateWorkspaceAction } from "./capabilities.js";
import { WorkspaceReducer, type WorkspaceAgentState, type WorkspaceView } from "./reducer.js";

export interface RoutedStructuredCommand {
  readonly agentId: string;
  readonly correlationId: string;
  readonly command: string;
  readonly record: StructuredCommandRecord;
}

export type WorkspaceRouterResult<T = undefined> =
  | { readonly kind: "applied"; readonly view: WorkspaceView; readonly value: T }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

export class WorkspaceRouter {
  readonly #trackers = new Map<string, StructuredCommandTracker>();
  #tail: Promise<void> = Promise.resolve();
  #nextCommandSequence = 0;

  constructor(readonly reducer: WorkspaceReducer) {
    for (const agent of reducer.view().agents) this.#registerTracker(agent);
  }

  createAgent(agent: ManagedAgentDescriptor): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => {
      const result = this.reducer.createAgent(agent);
      if (result.kind === "rejected") return result;
      this.#registerTracker(result.value);
      return result;
    });
  }

  selectAgent(agentId: string): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => this.reducer.selectAgent(agentId));
  }

  restartAgent(agentId: string): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => this.reducer.restartAgent(agentId));
  }

  markRecovered(agentId: string): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => this.reducer.markRecovered(agentId));
  }

  markFailed(agentId: string, code: string, message: string): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => this.reducer.markFailed(agentId, code, message));
  }

  requestAttention(agentId: string): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => this.reducer.requestAttention(agentId));
  }

  stopAgent(agentId: string): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => this.reducer.stopAgent(agentId));
  }

  removeAgent(agentId: string): Promise<WorkspaceRouterResult<WorkspaceAgentState>> {
    return this.#enqueue(() => {
      const result = this.reducer.removeAgent(agentId);
      if (result.kind === "applied") this.#trackers.delete(agentId);
      return result;
    });
  }

  recordActivity(agentId: string, amount = 1): Promise<WorkspaceRouterResult<number>> {
    return this.#enqueue(() => this.reducer.recordActivity(agentId, amount));
  }

  sendStructuredCommand(agentId: string, command: string, payload: unknown): Promise<WorkspaceRouterResult<RoutedStructuredCommand>> {
    return this.#enqueue(() => {
      const agent = this.#selectedAgent();
      if (!agent) return reject("no-selected-agent", "no workspace agent is selected");
      if (agent.id !== agentId) return reject("stale-selection", `structured command was accepted for ${agentId}, but ${agent.id} is selected at the routing point`);
      const gate = gateWorkspaceAction(agent, { type: "structured-command", command });
      if (gate.kind === "rejected") return gate;
      const tracker = this.#trackerFor(agent);
      if (!tracker) return reject("capability-mismatch", `agent ${agent.id} is not structured`);
      const correlationId = this.#nextCorrelationId("command");
      const started = tracker.start({
        type: "structured-command",
        correlationId,
        agentId: agent.id,
        command,
        payload,
      });
      if (started.kind === "rejected") return started;
      return applied(this.reducer.view(), {
        agentId: agent.id,
        correlationId,
        command,
        record: started.record,
      });
    });
  }

  cancelStructuredCommand(agentId: string, targetCorrelationId: string): Promise<WorkspaceRouterResult<StructuredCommandRecord>> {
    return this.#enqueue(() => {
      const agent = this.#selectedAgent();
      if (!agent) return reject("no-selected-agent", "no workspace agent is selected");
      if (agent.id !== agentId) return reject("stale-selection", `structured cancellation was accepted for ${agentId}, but ${agent.id} is selected at the routing point`);
      const gate = gateWorkspaceAction(agent, { type: "cancel-structured-command" });
      if (gate.kind === "rejected") return gate;
      const tracker = this.#trackerFor(agent);
      if (!tracker) return reject("capability-mismatch", `agent ${agent.id} is not structured`);
      const result = tracker.cancel({
        type: "cancel-structured-command",
        correlationId: this.#nextCorrelationId("cancel"),
        agentId: agent.id,
        targetCorrelationId,
      });
      if (result.kind === "rejected") return result;
      return applied(this.reducer.view(), result.record);
    });
  }

  settleStructuredCommand(agentId: string, correlationId: string, outcome: "completed" | "failed"): Promise<WorkspaceRouterResult<StructuredCommandRecord>> {
    return this.#enqueue(() => {
      const agent = this.reducer.view().agents.find(candidate => candidate.id === agentId);
      if (!agent) return reject("unknown-agent", `workspace agent does not exist: ${agentId}`);
      const tracker = this.#trackerFor(agent);
      if (!tracker) return reject("capability-mismatch", `agent ${agent.id} is not structured`);
      const result = tracker.complete(correlationId, outcome);
      if (result.kind === "rejected") return result;
      return applied(this.reducer.view(), result.record);
    });
  }

  view(): WorkspaceView {
    return this.reducer.view();
  }

  #selectedAgent(): WorkspaceAgentState | null {
    const view = this.reducer.view();
    return view.agents.find(agent => agent.id === view.selectedAgentId) ?? null;
  }

  #registerTracker(agent: WorkspaceAgentState): void {
    if (agent.capability.kind === "structured") this.#trackers.set(agent.id, new StructuredCommandTracker(agent.id, agent.capability));
  }

  #trackerFor(agent: WorkspaceAgentState): StructuredCommandTracker | null {
    return this.#trackers.get(agent.id) ?? null;
  }

  #nextCorrelationId(prefix: string): string {
    this.#nextCommandSequence += 1;
    return `${prefix}-${this.#nextCommandSequence}`;
  }

  #enqueue<T>(operation: () => WorkspaceRouterResult<T>): Promise<WorkspaceRouterResult<T>> {
    const result = this.#tail.then(operation);
    this.#tail = result.then(() => undefined, () => undefined);
    return result;
  }
}

function applied<T>(view: WorkspaceView, value: T): Extract<WorkspaceRouterResult<T>, { kind: "applied" }> {
  return { kind: "applied", view, value };
}

function reject(code: string, diagnostic: string): Extract<WorkspaceRouterResult<never>, { kind: "rejected" }> {
  return { kind: "rejected", code, diagnostic };
}
