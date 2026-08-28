import type {
  AgentJsonValue,
  AgentModelDescriptor,
  AgentSettingChangeOutcome,
  AgentResourceDescriptor,
  AgentSettingDescriptor,
} from "./domain.js";

export interface AgentModelPort {
  readonly capabilities: { readonly selection: boolean; readonly refresh: boolean; readonly scopedCatalog: boolean };
  listModels(scope?: string): Promise<readonly AgentModelDescriptor[]>;
  currentModel(): Promise<AgentModelDescriptor | null>;
  selectModel?(providerId: string, modelId: string): Promise<void>;
  refreshModels?(): Promise<void>;
}

export interface AgentAuthenticationPort {
  readonly capabilities: { readonly login: boolean; readonly logout: boolean };
  status(providerId: string): Promise<"authenticated" | "unauthenticated" | "unavailable">;
  login?(providerId: string, signal?: AbortSignal): Promise<void>;
  logout?(providerId: string): Promise<void>;
}

export interface AgentSettingsPort {
  readonly capabilities: { readonly write: boolean; readonly flush: boolean };
  listSettings(): Promise<readonly AgentSettingDescriptor[]>;
  readSetting(key: string): Promise<AgentJsonValue | undefined>;
  writeSetting?(key: string, value: AgentJsonValue): Promise<AgentSettingChangeOutcome>;
  flush?(): Promise<void>;
}

export interface AgentResourcesPort {
  readonly capabilities: { readonly reload: boolean; readonly extensionBinding: boolean };
  discoverResources(): Promise<readonly AgentResourceDescriptor[]>;
  reload?(): Promise<void>;
  bindExtensions?(sessionId: string): Promise<AgentExtensionBinding>;
}

export interface AgentExtensionBinding {
  readonly sessionId: string;
  dispose(): Promise<void>;
}

export interface AgentExtensionCommand {
  readonly name: string;
  readonly description: string;
}

export interface AgentSessionMetadata {
  readonly sessionId: string;
  readonly sessionName: string | null;
  readonly sessionPath: string | null;
  readonly cwd: string;
}

export interface AgentExtensionFailure {
  readonly extensionPath: string | null;
  readonly operation: string;
  readonly message: string;
  readonly recoverable: boolean;
}

export interface AgentExtensionPort {
  readonly capabilities: { readonly reload: boolean; readonly binding: boolean; readonly renderers: boolean };
  discoverCommands(): Promise<readonly AgentExtensionCommand[]>;
  sessionMetadata(): Promise<AgentSessionMetadata>;
  bind?(sessionId: string): Promise<AgentExtensionBinding>;
  reload?(): Promise<void>;
  resolveMessageRenderer?(customType: string): unknown;
  resolveToolRenderer?(toolName: string): unknown;
  subscribeFailures(listener: (failure: AgentExtensionFailure) => void): () => void;
}

export interface AgentWorkflowDescriptor {
  readonly id: string;
  readonly label: string;
  readonly requiredCommands: readonly string[];
}

export interface AgentWorkflowPort {
  readonly capabilities: { readonly execute: boolean };
  listWorkflows(): Promise<readonly AgentWorkflowDescriptor[]>;
  executeWorkflow?(workflowId: string, input: AgentJsonValue, signal?: AbortSignal): Promise<AgentJsonValue>;
}

export interface AgentServicePorts {
  readonly models: AgentModelPort;
  readonly authentication: AgentAuthenticationPort;
  readonly settings: AgentSettingsPort;
  readonly resources: AgentResourcesPort;
  readonly extensions: AgentExtensionPort;
  readonly workflows: AgentWorkflowPort;
}

export function assertAgentServicePorts(ports: AgentServicePorts): void {
  required(ports.models, ["listModels", "currentModel"], "model");
  advertised(ports.models, "selection", "selectModel", "model");
  advertised(ports.models, "refresh", "refreshModels", "model");
  required(ports.authentication, ["status"], "authentication");
  advertised(ports.authentication, "login", "login", "authentication");
  advertised(ports.authentication, "logout", "logout", "authentication");
  required(ports.settings, ["listSettings", "readSetting"], "settings");
  advertised(ports.settings, "write", "writeSetting", "settings");
  advertised(ports.settings, "flush", "flush", "settings");
  required(ports.resources, ["discoverResources"], "resources");
  advertised(ports.resources, "reload", "reload", "resources");
  advertised(ports.resources, "extensionBinding", "bindExtensions", "resources");
  required(ports.extensions, ["discoverCommands", "sessionMetadata", "subscribeFailures"], "extensions");
  advertised(ports.extensions, "reload", "reload", "extensions");
  advertised(ports.extensions, "binding", "bind", "extensions");
  advertised(ports.extensions, "renderers", "resolveMessageRenderer", "extensions");
  advertised(ports.extensions, "renderers", "resolveToolRenderer", "extensions");
  required(ports.workflows, ["listWorkflows"], "workflow");
  advertised(ports.workflows, "execute", "executeWorkflow", "workflow");
}

function required(port: object | undefined, operations: readonly string[], label: string): void {
  if (!port || typeof (port as { capabilities?: unknown }).capabilities !== "object") throw new TypeError(`${label} port and capabilities are required`);
  for (const operation of operations) if (typeof (port as Record<string, unknown>)[operation] !== "function") throw new TypeError(`${label} port requires ${operation}`);
}

function advertised(port: object, capability: string, operation: string, label: string): void {
  const enabled = (port as { capabilities: Record<string, unknown> }).capabilities[capability];
  if (typeof enabled !== "boolean") throw new TypeError(`${label} capability ${capability} must be explicit`);
  if (enabled && typeof (port as Record<string, unknown>)[operation] !== "function") throw new TypeError(`${label} capability ${capability} requires ${operation}`);
}
