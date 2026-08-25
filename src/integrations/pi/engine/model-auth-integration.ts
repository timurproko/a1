import type { ModelRuntime } from "@earendil-works/pi-coding-agent";
import type {
  AgentAuthenticationPort,
  AgentModelDescriptor,
  AgentModelPort,
} from "../../../foundation/agent-engine-contracts/index.js";

export type PiDocumentedModelRuntime = Pick<ModelRuntime,
  "getAvailableSnapshot" | "getModel" | "getProvider" | "hasConfiguredAuth" | "refresh" | "logout"
>;

export interface PiModelAuthenticationOptions {
  readonly runtime: PiDocumentedModelRuntime;
  readonly currentModel: () => AgentModelDescriptor | null;
  readonly selectModel: (model: ReturnType<PiDocumentedModelRuntime["getModel"]> extends infer T ? Exclude<T, undefined> : never) => Promise<void>;
  readonly login: (providerId: string, signal: AbortSignal) => Promise<void>;
  readonly timeoutMs?: number;
  readonly scopedModelIds?: () => readonly string[] | undefined;
}

export class PiModelAuthenticationIntegration implements AgentModelPort, AgentAuthenticationPort {
  readonly capabilities = { selection: true, refresh: true, scopedCatalog: true, login: true, logout: true };
  readonly #timeoutMs: number;
  constructor(private readonly options: PiModelAuthenticationOptions) { this.#timeoutMs = options.timeoutMs ?? 30_000; }

  async listModels(): Promise<readonly AgentModelDescriptor[]> {
    const scope = this.options.scopedModelIds?.();
    const selected = scope ? new Set(scope) : null;
    return this.options.runtime.getAvailableSnapshot()
      .filter(model => !selected || selected.has(`${model.provider}/${model.id}`))
      .map(model => ({
        providerId: model.provider,
        modelId: model.id,
        displayName: model.name,
        contextWindow: model.contextWindow,
        thinkingLevels: [],
      }));
  }

  async currentModel(): Promise<AgentModelDescriptor | null> { return this.options.currentModel(); }

  async selectModel(providerId: string, modelId: string): Promise<void> {
    const model = this.options.runtime.getModel(providerId, modelId);
    if (!model) throw new Error(`model is unavailable: ${providerId}/${modelId}`);
    await this.options.selectModel(model);
  }

  async refreshModels(): Promise<void> {
    await this.options.runtime.refresh();
  }

  async status(providerId: string): Promise<"authenticated" | "unauthenticated" | "unavailable"> {
    return this.options.runtime.getProvider(providerId) === undefined
      ? "unavailable"
      : this.options.runtime.hasConfiguredAuth(providerId) ? "authenticated" : "unauthenticated";
  }

  async login(providerId: string, signal?: AbortSignal): Promise<void> {
    await boundedOperation(inner => this.options.login(providerId, inner), this.#timeoutMs, signal);
  }

  async logout(providerId: string): Promise<void> {
    await boundedOperation(signal => this.options.runtime.logout(providerId, { signal }), this.#timeoutMs);
  }
}

async function boundedOperation(operation: (signal: AbortSignal) => Promise<void>, timeoutMs: number, outer?: AbortSignal): Promise<void> {
  const controller = new AbortController();
  const abort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error(`model/authentication operation timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    if (outer?.aborted) abort();
    await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(controller.signal.reason ?? new Error("model/authentication operation cancelled")), { once: true })),
    ]);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", abort);
  }
}
