import { configurationRootForProfile, resolveLaunchProfilePaths, type LaunchProfilePathOptions } from "./profile-paths.js";
import { initializeAddOneProfile } from "./initialize-profile.js";
import type { InteractiveLaunchIntent } from "./intent.js";

export interface PreparedInteractiveLaunch {
  readonly intent: InteractiveLaunchIntent;
  readonly environment: NodeJS.ProcessEnv;
  readonly piArguments: readonly string[];
  readonly configurationRoot: string | null;
}

export interface PrepareInteractiveLaunchOptions extends LaunchProfilePathOptions {
  readonly initializeProfile?: typeof initializeAddOneProfile;
}

export async function prepareInteractiveLaunch(
  intent: InteractiveLaunchIntent,
  environment: NodeJS.ProcessEnv = process.env,
  options: PrepareInteractiveLaunchOptions = {},
): Promise<PreparedInteractiveLaunch> {
  const paths = resolveLaunchProfilePaths({ ...options, environment });
  const configurationRoot = configurationRootForProfile(intent.profile.id, paths);
  if (configurationRoot !== null) await (options.initializeProfile ?? initializeAddOneProfile)(configurationRoot);

  const childEnvironment = { ...environment };
  if (configurationRoot === null) delete childEnvironment.PI_CODING_AGENT_DIR;
  else childEnvironment.PI_CODING_AGENT_DIR = configurationRoot;

  const piArguments = intent.profile.projectTrust === "ignore" ? ["--no-approve"] : [];
  childEnvironment.ADDONE_LAUNCH_ARGUMENTS_JSON = JSON.stringify(piArguments);
  return Object.freeze({
    intent,
    environment: childEnvironment,
    piArguments: Object.freeze(piArguments),
    configurationRoot,
  });
}
