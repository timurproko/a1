import type { AgentJsonValue, AgentWorkflowDescriptor, AgentWorkflowPort } from "../agent-engine-contracts/index.js";
import { PINNED_PI_HIDDEN_COMMAND_NAMES, PINNED_PI_WORKFLOW_COMMAND_NAMES, type PiWorkflowRoute } from "./workflows.js";

export type WorkflowCapability =
  | "prompt" | "abort" | "compact" | "bash"
  | "models.read" | "models.write" | "auth.login" | "auth.logout"
  | "settings.read" | "settings.write" | "resources.read" | "resources.reload"
  | "session.read" | "session.new" | "session.resume" | "session.fork" | "session.tree" | "session.import"
  | "clipboard.write" | "export.write" | "share.write" | "process.quit" | "diagnostics.read";

export interface WorkflowControllerResult {
  readonly outcome: "completed" | "cancelled" | "failed";
  readonly message: string;
  readonly value?: AgentJsonValue;
}

interface WorkflowDefinition {
  readonly id: PiWorkflowRoute;
  readonly required: readonly WorkflowCapability[];
}

const DEFINITIONS: readonly WorkflowDefinition[] = [
  define("settings", "settings.read", "settings.write"), define("model", "models.read", "models.write"),
  define("scoped-models", "models.read", "models.write"), define("export", "export.write"), define("import", "session.import"),
  define("share", "share.write"), define("copy", "clipboard.write"), define("name", "session.read"), define("session", "session.read"),
  define("changelog", "resources.read"), define("hotkeys", "resources.read"), define("fork", "session.fork"), define("clone", "session.fork"),
  define("tree", "session.tree"), define("trust", "settings.write"), define("login", "auth.login"), define("logout", "auth.logout"),
  define("new", "session.new"), define("compact", "compact"), define("resume", "session.resume"), define("reload", "resources.reload"),
  define("quit", "process.quit"), define("debug", "diagnostics.read"), define("arminsayshi", "resources.read"), define("dementedelves", "resources.read"),
];

export class PiWorkflowControllerPort implements AgentWorkflowPort {
  readonly capabilities = { execute: true };
  readonly #available: ReadonlySet<WorkflowCapability>;
  constructor(
    available: readonly WorkflowCapability[],
    private readonly execute: (workflowId: PiWorkflowRoute, input: AgentJsonValue, signal?: AbortSignal) => Promise<WorkflowControllerResult>,
  ) { this.#available = new Set(available); }

  async listWorkflows(): Promise<readonly AgentWorkflowDescriptor[]> {
    return DEFINITIONS.map(definition => ({ id: definition.id, label: definition.id, requiredCommands: definition.required }));
  }

  async executeWorkflow(workflowId: string, input: AgentJsonValue, signal?: AbortSignal): Promise<AgentJsonValue> {
    const definition = DEFINITIONS.find(value => value.id === workflowId);
    if (!definition) return failure(`workflow is unavailable: ${workflowId}`);
    const missing = definition.required.filter(capability => !this.#available.has(capability));
    if (missing.length > 0) return failure(`${workflowId} requires unavailable capabilities: ${missing.join(", ")}`);
    if (signal?.aborted) return { outcome: "cancelled", message: "workflow cancelled" };
    try {
      const result = await this.execute(definition.id, input, signal);
      return { ...result, message: bounded(result.message) };
    } catch (error) {
      return failure(`${workflowId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const PI_BUILTIN_WORKFLOW_ROUTES = Object.freeze([...PINNED_PI_WORKFLOW_COMMAND_NAMES, ...PINNED_PI_HIDDEN_COMMAND_NAMES]);
export const PI_WORKFLOW_CAPABILITIES: readonly WorkflowCapability[] = Object.freeze([
  "prompt", "abort", "compact", "bash", "models.read", "models.write", "auth.login", "auth.logout", "settings.read", "settings.write",
  "resources.read", "resources.reload", "session.read", "session.new", "session.resume", "session.fork", "session.tree", "session.import",
  "clipboard.write", "export.write", "share.write", "process.quit", "diagnostics.read",
]);

function define(id: PiWorkflowRoute, ...required: WorkflowCapability[]): WorkflowDefinition { return { id, required }; }
function failure(message: string): AgentJsonValue { return { outcome: "failed", message: bounded(message) }; }
function bounded(message: string): string { return message.length <= 512 ? message : `${message.slice(0, 509)}...`; }
