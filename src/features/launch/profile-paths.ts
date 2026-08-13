import { homedir } from "node:os";
import { posix, win32, type PlatformPath } from "node:path";
import type { LaunchProfileId } from "./profiles.js";

export interface LaunchProfilePaths {
  readonly home: string;
  readonly addoneRoot: string;
  readonly addoneAgent: string;
  readonly sandbox: string;
}

export interface LaunchProfilePathOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly home?: string;
  readonly readHome?: () => string;
  readonly platform?: NodeJS.Platform;
}

export function resolveLaunchProfilePaths(options: LaunchProfilePathOptions = {}): LaunchProfilePaths {
  const environment = options.environment ?? process.env;
  const path = options.platform === "win32" || (options.platform === undefined && process.platform === "win32") ? win32 : posix;
  const selectedHome = options.home ?? environment.ADDONE_PROFILE_HOME ?? options.readHome?.() ?? homedir();
  const home = validateAbsolutePath(selectedHome, "effective user home", path);
  const addoneRoot = path.resolve(home, ".a1");
  return Object.freeze({
    home,
    addoneRoot,
    addoneAgent: path.resolve(addoneRoot, "agent"),
    sandbox: path.resolve(addoneRoot, "sandbox"),
  });
}

export function configurationRootForProfile(
  profileId: LaunchProfileId,
  paths: LaunchProfilePaths,
): string | null {
  if (profileId === "addone") return paths.addoneAgent;
  if (profileId === "sandbox") return paths.sandbox;
  return null;
}

function validateAbsolutePath(value: string, name: string, path: PlatformPath): string {
  if (value.length === 0 || value.includes("\0")) throw new TypeError(`${name} is invalid`);
  if (!path.isAbsolute(value)) throw new TypeError(`${name} must be absolute`);
  return path.resolve(value);
}
