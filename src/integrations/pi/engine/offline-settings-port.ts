import { join } from "node:path";
import type { AgentSettingOwner } from "../../../contracts/agent-engine/index.js";
import { resolvePiProjectTrustPreflight } from "./project-trust-preflight.js";
import {
  PI_SETTING_EFFECTS,
  PiSettingsBridge,
  supportedThinkingLevels,
  type PiSettingKey,
  type PiSettingOwnerHandlers,
  type PiSettingsModelChoice,
} from "./settings-bridge.js";
import { ModelRuntime, SettingsManager } from "../startup-public.js";

const PERSIST_ONLY_OWNERS: readonly AgentSettingOwner[] = ["shell", "startup", "agent", "terminal"];

export interface OfflinePiSettingsPortOptions {
  readonly cwd: string;
  readonly agentDir: string;
  readonly resolveTrust?: typeof resolvePiProjectTrustPreflight;
  readonly createSettingsManager?: (cwd: string, agentDir: string, projectTrusted: boolean) => SettingsManager;
  readonly createModelRuntime?: (options: Parameters<typeof ModelRuntime.create>[0]) => Promise<Pick<ModelRuntime, "getAvailableSnapshot">>;
}

export interface OfflinePiSettingsPort {
  readonly port: PiSettingsBridge;
  readonly manager: SettingsManager;
  /** Resolves after the local auth/model catalog has populated the per-model choices. */
  readonly modelsReady: Promise<void>;
}

/**
 * Pi settings for the resident Settings utility tab. It reads the same persisted manager as an
 * Agent, but every bound live effect is persistence-only because each Agent process owns its effect.
 */
export async function createOfflinePiSettingsPort(options: OfflinePiSettingsPortOptions): Promise<OfflinePiSettingsPort> {
  let modelRuntime: Pick<ModelRuntime, "getAvailableSnapshot"> | null = null;
  const createModelRuntime = options.createModelRuntime ?? (input => ModelRuntime.create(input));
  const modelsReady = createModelRuntime({
    authPath: join(options.agentDir, "auth.json"),
    modelsPath: join(options.agentDir, "models.json"),
    allowModelNetwork: false,
  }).then(runtime => { modelRuntime = runtime; }, () => undefined);

  const trust = await (options.resolveTrust ?? resolvePiProjectTrustPreflight)({
    cwd: options.cwd,
    agentDir: options.agentDir,
  });
  const manager = (options.createSettingsManager
    ?? ((cwd, agentDir, projectTrusted) => SettingsManager.create(cwd, agentDir, { projectTrusted })))(
    options.cwd,
    options.agentDir,
    trust.trusted,
  );
  const port = new PiSettingsBridge(manager, {
    productMode: "bare",
    models: () => modelChoices(modelRuntime?.getAvailableSnapshot() ?? [], manager.getAllModelThinkingLevels?.() ?? {}),
  });
  for (const owner of PERSIST_ONLY_OWNERS) port.bindOwner(owner, persistOnlyHandlers(owner));
  return { port, manager, modelsReady };
}

function persistOnlyHandlers(owner: AgentSettingOwner): PiSettingOwnerHandlers {
  return Object.fromEntries(Object.entries(PI_SETTING_EFFECTS)
    .filter(([, definition]) => definition.owner === owner && definition.hiddenInBare !== true)
    .map(([key]) => [key, { apply() {} }])) as PiSettingOwnerHandlers;
}

function modelChoices(
  models: readonly { readonly provider: string; readonly id: string; readonly reasoning?: boolean; readonly thinkingLevelMap?: Readonly<Record<string, unknown>> }[],
  overrides: Readonly<Record<string, string>>,
): readonly PiSettingsModelChoice[] {
  return models.map(model => {
    const key = `${model.provider}/${model.id}`;
    return {
      key,
      label: `${model.id} [${model.provider}]`,
      description: overrides[key] === undefined ? "global default" : `override: ${overrides[key]}`,
      levels: supportedThinkingLevels(model),
    };
  });
}

/** Keys the slim Settings port intentionally binds and exposes in bare mode. */
export function offlinePiSettingKeys(): readonly PiSettingKey[] {
  return Object.entries(PI_SETTING_EFFECTS)
    .filter(([, definition]) => PERSIST_ONLY_OWNERS.includes(definition.owner) && definition.hiddenInBare !== true)
    .map(([key]) => key as PiSettingKey);
}
