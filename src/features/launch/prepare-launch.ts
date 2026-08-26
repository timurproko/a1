import { configurationRootForProfile, resolveLaunchProfilePaths, type LaunchProfilePathOptions } from "./profile-paths.js";
import { initializeProductProfile } from "./initialize-profile.js";
import type { InteractiveLaunchIntent } from "./intent.js";

export interface PreparedInteractiveLaunch {
  readonly environment: NodeJS.ProcessEnv;
  readonly configurationRoot: string | null;
}

export interface PrepareInteractiveLaunchOptions extends LaunchProfilePathOptions {
  readonly initializeProfile?: typeof initializeProductProfile;
}

export async function prepareInteractiveLaunch(
  intent: InteractiveLaunchIntent,
  environment: NodeJS.ProcessEnv = process.env,
  options: PrepareInteractiveLaunchOptions = {},
): Promise<PreparedInteractiveLaunch> {
  const paths = resolveLaunchProfilePaths({ ...options, environment });
  const configurationRoot = configurationRootForProfile(intent.profileId, paths);
  if (configurationRoot !== null) await (options.initializeProfile ?? initializeProductProfile)(configurationRoot);

  const childEnvironment = { ...environment };
  if (configurationRoot === null) delete childEnvironment.PI_CODING_AGENT_DIR;
  else childEnvironment.PI_CODING_AGENT_DIR = configurationRoot;

  return Object.freeze({ environment: childEnvironment, configurationRoot });
}
