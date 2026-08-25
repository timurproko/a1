import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type {
  AgentExtensionBinding,
  AgentExtensionFailure,
  AgentExtensionPort,
  AgentResourceDescriptor,
  AgentResourcesPort,
  AgentSessionMetadata,
} from "../../../contracts/agent-engine/index.js";

export interface PiResourceExtensionOptions {
  readonly session: AgentSession;
  readonly bindUi: () => Promise<void>;
  readonly unbindUi: () => Promise<void>;
}

export class PiResourceExtensionIntegration implements AgentResourcesPort, AgentExtensionPort {
  readonly capabilities = { reload: true, extensionBinding: true, binding: true, renderers: true };
  readonly #failures = new Set<(failure: AgentExtensionFailure) => void>();
  readonly #unsubscribeError: () => void;
  #binding: AgentExtensionBinding | undefined;
  constructor(private readonly options: PiResourceExtensionOptions) {
    this.#unsubscribeError = options.session.extensionRunner.onError(error => {
      const failure: AgentExtensionFailure = {
        extensionPath: error.extensionPath || null,
        operation: error.event || "extension",
        message: error.error || "unknown extension failure",
        recoverable: true,
      };
      for (const listener of this.#failures) listener(failure);
    });
  }

  async discoverResources(): Promise<readonly AgentResourceDescriptor[]> {
    const loader = this.options.session.resourceLoader;
    const resources: AgentResourceDescriptor[] = [];
    for (const skill of loader.getSkills().skills) resources.push(resource(skill.name, "skill", skill.name, { source: skill.filePath }));
    for (const prompt of loader.getPrompts().prompts) resources.push(resource(prompt.name, "prompt", prompt.name, { source: prompt.filePath }));
    for (const theme of loader.getThemes().themes) resources.push(resource(theme.name ?? "theme", "other", theme.name ?? "Theme", { resourceType: "theme" }));
    for (const file of loader.getAgentsFiles().agentsFiles) resources.push(resource(file.path, "other", file.path, { resourceType: "agent-context" }));
    for (const command of this.options.session.extensionRunner.getRegisteredCommands()) resources.push(resource(command.name, "command", command.name, { invocationName: command.invocationName }));
    return resources;
  }

  async discoverCommands() {
    return this.options.session.extensionRunner.getRegisteredCommands().map(command => ({
      name: command.name,
      description: command.description ?? "",
    }));
  }

  async sessionMetadata(): Promise<AgentSessionMetadata> {
    const manager = this.options.session.sessionManager;
    return {
      sessionId: this.options.session.sessionId,
      sessionName: manager.getSessionName() ?? null,
      sessionPath: manager.getSessionFile() ?? null,
      cwd: manager.getCwd(),
    };
  }

  async bind(sessionId: string): Promise<AgentExtensionBinding> {
    if (sessionId !== this.options.session.sessionId) throw new Error("extension binding targets a different session");
    await this.#binding?.dispose();
    await this.options.bindUi();
    let disposed = false;
    const binding: AgentExtensionBinding = {
      sessionId,
      dispose: async () => {
        if (disposed) return;
        disposed = true;
        if (this.#binding === binding) this.#binding = undefined;
        await this.options.unbindUi();
      },
    };
    this.#binding = binding;
    return binding;
  }

  async bindExtensions(sessionId: string): Promise<AgentExtensionBinding> { return this.bind(sessionId); }
  async reload(): Promise<void> { await this.options.session.reload(); }
  resolveMessageRenderer(customType: string): unknown { return this.options.session.extensionRunner.getMessageRenderer(customType); }
  resolveToolRenderer(toolName: string): unknown { return this.options.session.extensionRunner.getToolDefinition(toolName); }
  subscribeFailures(listener: (failure: AgentExtensionFailure) => void): () => void { this.#failures.add(listener); return () => this.#failures.delete(listener); }
  async dispose(): Promise<void> { await this.#binding?.dispose(); this.#unsubscribeError(); this.#failures.clear(); }
}

function resource(id: string, kind: AgentResourceDescriptor["kind"], label: string, metadata: Record<string, string | undefined>): AgentResourceDescriptor {
  return { id: normalizeId(id), kind, label, metadata: Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, string] => typeof entry[1] === "string")) };
}
function normalizeId(value: string): string { return value.replace(/[^A-Za-z0-9._:/-]/g, "-").slice(0, 128) || "resource"; }
