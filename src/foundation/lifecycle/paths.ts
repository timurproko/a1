import { homedir, platform } from "node:os";
import { posix, win32 } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export interface ProductPaths {
  readonly configDir: string;
  readonly dataDir: string;
  readonly runtimeDir: string;
}

export function resolveProductPaths(
  environment: NodeJS.ProcessEnv = process.env,
  hostPlatform: NodeJS.Platform = platform(),
  fallbackHome: string = homedir(),
): ProductPaths {
  const windows = hostPlatform === "win32";
  const path = windows ? win32 : posix;
  const home = environment.HOME ?? environment.USERPROFILE ?? fallbackHome;
  const configOverride = environment[PRODUCT_IDENTITY.environment.configDir];
  const dataOverride = environment[PRODUCT_IDENTITY.environment.dataDir];
  const runtimeOverride = environment[PRODUCT_IDENTITY.environment.runtimeDir];
  const configDir = path.resolve(configOverride
    ?? (windows
      ? path.join(environment.APPDATA ?? home, PRODUCT_IDENTITY.state.windowsControlDirectory)
      : path.join(environment.XDG_CONFIG_HOME ?? path.join(home, ".config"), PRODUCT_IDENTITY.state.unixControlDirectory)));
  const dataDir = path.resolve(dataOverride
    ?? (windows
      ? path.join(environment.LOCALAPPDATA ?? home, PRODUCT_IDENTITY.state.windowsControlDirectory)
      : path.join(environment.XDG_DATA_HOME ?? path.join(home, ".local", "share"), PRODUCT_IDENTITY.state.unixControlDirectory)));
  const runtimeDir = path.resolve(runtimeOverride
    ?? (windows
      ? path.join(dataDir, "runtime")
      : environment.XDG_RUNTIME_DIR
        ? path.join(environment.XDG_RUNTIME_DIR, PRODUCT_IDENTITY.state.unixControlDirectory)
        : path.join(dataDir, "runtime")));
  return {
    configDir,
    dataDir,
    runtimeDir,
  };
}
