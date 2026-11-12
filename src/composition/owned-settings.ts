import { statSync } from "node:fs";
import type { AgentSettingsPort } from "../contracts/agent-engine/index.js";
import { resolveLaunchProfilePaths } from "../features/launch/profile-paths.js";
import { PRODUCT_IDENTITY } from "../product-identity.js";
import type { OwnedSettingsManager } from "../ui/settings/manager.js";

interface OwnedSettingsManagerFactoryOptions {
  readonly profileId: string;
  readonly agent?: AgentSettingsPort | null;
  readonly agentProvider?: () => AgentSettingsPort | null;
}

/** Builds the profile-global settings manager shared by the Agent and slim utility compositions. */
export async function createOwnedSettingsManager(options: OwnedSettingsManagerFactoryOptions): Promise<OwnedSettingsManager> {
  const { OwnedSettingsManager } = await import("../ui/settings/manager.js");
  const profilePaths = resolveLaunchProfilePaths();
  return new OwnedSettingsManager({
    profileDir: profilePaths.agentProfile,
    profileId: options.profileId,
    namespace: PRODUCT_IDENTITY.commandName,
    ...(options.agent === undefined ? {} : { agent: options.agent }),
    ...(options.agentProvider === undefined ? {} : { agentProvider: options.agentProvider }),
    hiddenAgentSettingIds: ["fullscreenWheelScrollLines"],
    agentSettingLabelOverrides: { fullscreenCopyOnSelect: "Copy on select" },
  });
}

/** Rereads the shared settings document whenever its stat changes; returns the stop. */
export function watchSharedSettings(settings: Pick<OwnedSettingsManager, "file" | "refresh">): () => void {
  let last = "";
  const poll = (): void => {
    try {
      const s = statSync(settings.file);
      if (last !== (last = `${s.ino}:${s.mtimeMs}`)) settings.refresh();
    } catch {
      // Compatibility: an unreadable peer write resolves on the next stat change.
    }
  };
  poll();
  const timer = setInterval(poll, 250).unref();
  return () => clearInterval(timer);
}
