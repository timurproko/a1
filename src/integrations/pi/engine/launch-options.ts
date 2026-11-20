import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { DefaultPackageManager, resolveModelScopeWithDiagnostics, resolveCliModel, type AgentSessionServices, type ScopedModel } from "../startup-public.js";
import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";

/** An expected invocation refusal, distinct from an unexpected runtime crash. */
export class RuntimeLaunchError extends Error {
  constructor(message: string) {
    // Security: resource errors may contain terminal controls; never execute them while reporting a refusal.
    super(stripVTControlCharacters(message).replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "").slice(0, 16_384));
    this.name = "RuntimeLaunchError";
  }
}

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

/** Reject only requested resources/flags; discovered failures retain ordinary startup reporting. */
export async function assertPiInvocationResources(services: AgentSessionServices, options: RuntimeLaunchOptions): Promise<void> {
  const failures: string[] = [];
  const requested = options.extensionPaths ?? [];
  const explicitPaths = new Set(requested.map(path => resourceKey(path, services.cwd)));
  if (requested.length > 0) {
    // Provenance: Pi expands directory manifests and package sources; do not guess ownership from a path prefix.
    // This resolves entries only, without executing extension factories a second time.
    const manager = new DefaultPackageManager(services);
    for (const source of requested) {
      try {
        const resolved = await manager.resolveExtensionSources([source], { temporary: true });
        for (const resource of resolved.extensions) if (resource.enabled) explicitPaths.add(resourceKey(resource.path, services.cwd));
        for (const failure of resolved.installFailures ?? []) failures.push(`${failure.source}: ${failure.message}`);
        if (![...resolved.extensions, ...resolved.skills, ...resolved.prompts, ...resolved.themes].some(resource => resource.enabled)) {
          failures.push(`${source}: Explicit extension source resolved no loadable resources`);
        }
      } catch (error) {
        failures.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const result = services.resourceLoader.getExtensions();
  for (const item of result.errors) {
    if (explicitPaths.has(resourceKey(item.path, services.cwd))) failures.push(`${item.path}: ${item.error}`);
  }
  // Provenance: Pi exposes provider-registration diagnostic ownership in this stable prefix, not a path field.
  for (const extension of result.extensions) {
    if (!explicitPaths.has(resourceKey(extension.path, services.cwd))) continue;
    for (const item of services.diagnostics) {
      if (item.type === "error" && item.message.startsWith(`Extension "${extension.path}" error: `)) failures.push(item.message);
    }
  }
  const flags = new Map(result.extensions.flatMap(extension => [...extension.flags]));
  for (const [name, value] of options.extensionFlagValues ?? []) {
    const registration = flags.get(name);
    if (registration === undefined) {
      failures.push(`Unknown extension flag --${name}; no loaded extension registered it`);
      // Rationale: a failed discovery may explain the missing registration, but does not itself make ordinary options fatal.
      failures.push(...result.errors.map(item => `${item.path}: ${item.error}`));
    } else if (typeof value !== registration.type) {
      failures.push(`Extension flag --${name} requires ${registration.type}; put -- before literal instructions`);
    }
  }
  if (failures.length) throw new RuntimeLaunchError([...new Set(failures)].join("\n"));
}

/** Compare loader paths without interpreting built-in identifiers as filesystem paths. */
function resourceKey(path: string, cwd: string): string {
  let key = path.startsWith("builtin:") ? path : resolve(cwd, path);
  try { key = realpathSync(key); } catch { /* Rationale: missing paths and built-in identifiers have no filesystem identity. */ }
  return process.platform === "win32" ? key.toLowerCase() : key;
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
  if (selected.error) throw new RuntimeLaunchError(selected.error);
  if (selected.model && !services.modelRuntime.getModels().some(model => model.provider === selected.model!.provider && model.id === selected.model!.id)) {
    throw new RuntimeLaunchError(`Requested model is not in the available catalog: ${options.model}`);
  }
  const credentialProvider = keyProvider ?? selected.model?.provider ?? fallbackModel?.provider;
  if (options.apiKey !== undefined) {
    if (credentialProvider === undefined) throw new RuntimeLaunchError("--api-key could not resolve a provider from --model or --models");
    try { await services.modelRuntime.setRuntimeApiKey(credentialProvider, options.apiKey); }
    catch { throw new RuntimeLaunchError("Could not apply invocation credential"); }
  }
  if (selected.model && !services.modelRuntime.getAvailableSnapshot().some(model => model.provider === selected.model!.provider && model.id === selected.model!.id)) {
    throw new RuntimeLaunchError(`Requested model has no usable authentication in the A1 profile: ${selected.model.provider}/${selected.model.id}`);
  }
  return { model: selected.model, thinkingLevel: applySelection ? options.thinking ?? selected.thinkingLevel : undefined, keyProvider: credentialProvider };
}
