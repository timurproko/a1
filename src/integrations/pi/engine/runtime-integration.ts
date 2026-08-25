import {
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  resolveModelScopeWithDiagnostics,
  SessionManager,
  type AgentSession,
  type AgentSessionRuntime,
  type AgentSessionServices,
  type CreateAgentSessionRuntimeFactory,
  type ScopedModel,
} from "@earendil-works/pi-coding-agent";

export interface PiRuntimeIntegrationOptions {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionDir?: string;
}

export type PiSessionReplacement =
  | { readonly kind: "new" }
  | { readonly kind: "resume"; readonly sessionPath: string };

interface ConfiguredModelScope {
  readonly scopedModels: readonly ScopedModel[];
  readonly model: ScopedModel["model"] | undefined;
  readonly thinkingLevel: ScopedModel["thinkingLevel"];
  readonly diagnostics: readonly { type: "info" | "warning" | "error"; message: string }[];
}

/**
 * Mirrors pinned Pi's CLI startup: resolve the `models` patterns from settings
 * into a scoped model list, keep the resolver's warnings (e.g. "No models match
 * pattern ..."), and pick the same initial model pinned Pi would pick — the
 * saved default when it is in scope, otherwise the first scoped model.
 */
export async function resolveConfiguredModelScope(
  services: Pick<AgentSessionServices, "settingsManager" | "modelRuntime">,
): Promise<ConfiguredModelScope> {
  const patterns = services.settingsManager.getEnabledModels();
  if (!patterns || patterns.length === 0) {
    return { scopedModels: [], model: undefined, thinkingLevel: undefined, diagnostics: [] };
  }
  const { scopedModels, diagnostics } = await resolveModelScopeWithDiagnostics(
    [...patterns],
    services.modelRuntime,
    { signal: AbortSignal.timeout(15_000) },
  );
  let selected: ScopedModel | undefined;
  if (scopedModels.length > 0) {
    const savedProvider = services.settingsManager.getDefaultProvider();
    const savedModelId = services.settingsManager.getDefaultModel();
    const savedModel = savedProvider && savedModelId
      ? services.modelRuntime.getModel(savedProvider, savedModelId)
      : undefined;
    selected = (savedModel
      ? scopedModels.find(scoped => scoped.model.provider === savedModel.provider && scoped.model.id === savedModel.id)
      : undefined) ?? scopedModels[0];
  }
  return {
    scopedModels,
    model: selected?.model,
    thinkingLevel: selected?.thinkingLevel,
    diagnostics: diagnostics.map(diagnostic => ({ type: diagnostic.type, message: diagnostic.message })),
  };
}

export async function createPiRuntimeIntegration(options: PiRuntimeIntegrationOptions): Promise<AgentSessionRuntime> {
  const sessionManager = SessionManager.create(options.cwd, options.sessionDir ?? process.env.PI_CODING_AGENT_SESSION_DIR);
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd,
    sessionManager: targetSessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({ cwd, agentDir: options.agentDir });
    const modelScope = await resolveConfiguredModelScope(services);
    const hasExistingSession = targetSessionManager.buildSessionContext().messages.length > 0;
    const created = await createAgentSessionFromServices({
      services,
      sessionManager: targetSessionManager,
      ...(sessionStartEvent ? { sessionStartEvent } : {}),
      ...(modelScope.model && !hasExistingSession ? { model: modelScope.model } : {}),
      ...(modelScope.thinkingLevel && !hasExistingSession ? { thinkingLevel: modelScope.thinkingLevel } : {}),
      ...(modelScope.scopedModels.length > 0 ? { scopedModels: [...modelScope.scopedModels] } : {}),
    });
    return { ...created, services, diagnostics: [...modelScope.diagnostics] };
  };
  return createAgentSessionRuntime(createRuntime, {
    cwd: options.cwd,
    agentDir: options.agentDir,
    sessionManager,
  });
}

export function bindPiRuntimeSession(runtime: AgentSessionRuntime, rebind: (session: AgentSession) => Promise<void>): () => void {
  runtime.setRebindSession(rebind);
  return () => runtime.setRebindSession(undefined);
}

export async function replacePiRuntimeSession(runtime: AgentSessionRuntime, replacement: PiSessionReplacement): Promise<{ readonly cancelled: boolean }> {
  return replacement.kind === "new"
    ? runtime.newSession()
    : runtime.switchSession(replacement.sessionPath);
}

export async function disposePiRuntimeIntegration(runtime: AgentSessionRuntime): Promise<void> {
  runtime.setRebindSession(undefined);
  runtime.setBeforeSessionInvalidate(undefined);
  await runtime.dispose();
}
