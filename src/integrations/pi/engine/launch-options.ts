import { resolveModelScopeWithDiagnostics, resolveCliModel, type AgentSessionServices, type ScopedModel } from "../startup-public.js";
import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";

interface ConfiguredModelScope {
  readonly scopedModels: readonly ScopedModel[];
  readonly model: ScopedModel["model"] | undefined;
  readonly thinkingLevel: ScopedModel["thinkingLevel"];
  readonly diagnostics: readonly { type: "info" | "warning" | "error"; message: string }[];
}

/** Invocation scopes replace saved patterns; CLI selection never writes settings. */
export async function resolveConfiguredModelScope(
  services: Pick<AgentSessionServices, "settingsManager" | "modelRuntime">,
  signal?: AbortSignal,
  invocationPatterns?: readonly string[],
): Promise<ConfiguredModelScope> {
  const patterns = invocationPatterns ?? services.settingsManager.getEnabledModels();
  if (!patterns || patterns.length === 0) return { scopedModels: [], model: undefined, thinkingLevel: undefined, diagnostics: [] };
  const { scopedModels, diagnostics } = await resolveModelScopeWithDiagnostics([...patterns], services.modelRuntime,
    { signal: signal === undefined ? AbortSignal.timeout(15_000) : AbortSignal.any([signal, AbortSignal.timeout(15_000)]) });
  const savedProvider = services.settingsManager.getDefaultProvider();
  const savedModelId = services.settingsManager.getDefaultModel();
  const savedModel = invocationPatterns === undefined && savedProvider && savedModelId
    ? services.modelRuntime.getAvailableSnapshot().find(model => model.provider === savedProvider && model.id === savedModelId) : undefined;
  const fallback = scopedModels[0];
  return {
    scopedModels, model: savedModel ?? fallback?.model,
    thinkingLevel: savedModel ? services.settingsManager.getModelThinkingLevel(savedModel.provider, savedModel.id)
      ?? services.settingsManager.getDefaultThinkingLevel() : fallback?.thinkingLevel,
    diagnostics: diagnostics.map(diagnostic => ({ type: diagnostic.type, message: diagnostic.message })),
  };
}

/** Reject failed explicit resources/flags rather than start a partially configured worker. */
export function assertPiInvocationResources(services: AgentSessionServices, options: RuntimeLaunchOptions): void {
  const failures = [
    ...services.diagnostics.filter(item => item.type === "error").map(item => item.message),
    ...services.resourceLoader.getExtensions().errors.map(item => `${item.path}: ${item.error}`),
  ];
  for (const [name, value] of options.extensionFlagValues ?? []) {
    const registration = services.resourceLoader.getExtensions().extensions.flatMap(extension => [...extension.flags]).find(([key]) => key === name)?.[1];
    if (registration !== undefined && typeof value !== registration.type) failures.push(`Extension flag --${name} requires ${registration.type}; put -- before literal instructions`);
  }
  if (failures.length) throw new Error(failures.join("\n"));
}

/** Use Pi's authoritative model grammar, but never invent an unlisted custom model or change accounts. */
export async function resolvePiInvocationModel(services: AgentSessionServices, options: RuntimeLaunchOptions, fallbackModel?: ScopedModel["model"], keyProvider?: string, applySelection = true) {
  const selected = resolveCliModel({
    modelRuntime: services.modelRuntime,
    ...(options.model === undefined || !applySelection ? {} : { cliModel: options.model }),
    ...(options.provider === undefined || !applySelection ? {} : { cliProvider: options.provider }),
    ...(options.thinking === undefined || !applySelection ? {} : { cliThinking: options.thinking }),
    inlineApiKey: options.apiKey !== undefined,
  });
  if (selected.error) throw new Error(selected.error);
  if (selected.model && !services.modelRuntime.getModels().some(model => model.provider === selected.model!.provider && model.id === selected.model!.id)) {
    throw new Error(`Requested model is not in the available catalog: ${options.model}`);
  }
  const credentialProvider = keyProvider ?? selected.model?.provider ?? fallbackModel?.provider;
  if (options.apiKey !== undefined) {
    if (credentialProvider === undefined) throw new Error("--api-key could not resolve a provider from --model or --models");
    try { await services.modelRuntime.setRuntimeApiKey(credentialProvider, options.apiKey); }
    catch { throw new Error("Could not apply invocation credential"); }
  }
  if (selected.model && !services.modelRuntime.getAvailableSnapshot().some(model => model.provider === selected.model!.provider && model.id === selected.model!.id)) {
    throw new Error(`Requested model has no usable authentication in the A1 profile: ${selected.model.provider}/${selected.model.id}`);
  }
  return { model: selected.model, thinkingLevel: applySelection ? options.thinking ?? selected.thinkingLevel : undefined, keyProvider: credentialProvider };
}
