import { unwatchFile, watchFile } from "node:fs";
import type { AgentSettingsPort } from "../contracts/agent-engine/index.js";
import { resolveLaunchProfilePaths } from "../features/launch/profile-paths.js";
import { resolveProductPaths } from "../foundation/lifecycle/paths.js";
import { PRODUCT_IDENTITY } from "../product-identity.js";
import { OwnedSettingsManager } from "../ui/settings/manager.js";

export interface OwnedSettingsManagerFactoryOptions {
  readonly profileId: string;
  readonly hideTabSettings?: boolean;
  readonly agent?: AgentSettingsPort | null;
  readonly agentProvider?: () => AgentSettingsPort | null;
}

/** Builds the profile-global settings manager shared by the Agent and slim utility compositions. */
export function createOwnedSettingsManager(options: OwnedSettingsManagerFactoryOptions): OwnedSettingsManager {
  const profilePaths = resolveLaunchProfilePaths();
  const productPaths = resolveProductPaths();
  return new OwnedSettingsManager({
    profileDir: profilePaths.agentProfile,
    profileId: options.profileId,
    namespace: PRODUCT_IDENTITY.commandName,
    legacyConfigDir: productPaths.configDir,
    ...(options.agent === undefined ? {} : { agent: options.agent }),
    ...(options.agentProvider === undefined ? {} : { agentProvider: options.agentProvider }),
    ...(options.hideTabSettings ? { hiddenOwnedSettingIds: ["tabsAutoName", "tabsPosition", "tabBarPlusMenu"] } : {}),
    hiddenAgentSettingIds: ["fullscreenWheelScrollLines"],
    agentSettingLabelOverrides: { fullscreenCopyOnSelect: "Copy on select" },
  });
}

const SHARED_SETTINGS_POLL_MS = 250;

/** Rereads the shared settings document whenever its stat changes; returns the stop. */
export function watchSharedSettings(settings: Pick<OwnedSettingsManager, "file" | "refresh">): () => void {
  const file = settings.file;
  const listener = (): void => {
    try { settings.refresh(); } catch {
      // Compatibility: an unreadable peer write resolves on the next stat change.
    }
  };
  watchFile(file, { interval: SHARED_SETTINGS_POLL_MS, persistent: false }, listener);
  return () => unwatchFile(file, listener);
}
