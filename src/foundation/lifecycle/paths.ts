import { createHash } from "node:crypto";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";

export interface AddOnePaths {
  readonly configDir: string;
  readonly dataDir: string;
  readonly runtimeDir: string;
  readonly databasePath: string;
  readonly endpoint: string;
  readonly endpointMetadataPath: string;
  readonly supervisorLogPath: string;
}

export function resolveAddOnePaths(environment: NodeJS.ProcessEnv = process.env): AddOnePaths {
  const windows = platform() === "win32";
  const home = environment.HOME ?? environment.USERPROFILE ?? homedir();
  const configDir = resolve(environment.ADDONE_CONFIG_DIR
    ?? (windows ? join(environment.APPDATA ?? home, "AddOne") : join(environment.XDG_CONFIG_HOME ?? join(home, ".config"), "addone")));
  const dataDir = resolve(environment.ADDONE_DATA_DIR
    ?? (windows ? join(environment.LOCALAPPDATA ?? home, "AddOne") : join(environment.XDG_DATA_HOME ?? join(home, ".local", "share"), "addone")));
  const runtimeDir = resolve(environment.ADDONE_RUNTIME_DIR
    ?? (windows ? join(dataDir, "runtime") : join(environment.XDG_RUNTIME_DIR ?? dataDir, "addone-runtime")));
  const namespace = createHash("sha256").update(runtimeDir.toLowerCase()).digest("hex").slice(0, 20);
  const endpoint = environment.ADDONE_ENDPOINT
    ?? (windows ? `\\\\.\\pipe\\addone-${namespace}` : join(runtimeDir, "supervisor.sock"));
  return {
    configDir,
    dataDir,
    runtimeDir,
    databasePath: resolve(environment.ADDONE_DATABASE_PATH ?? join(dataDir, "control.sqlite3")),
    endpoint,
    endpointMetadataPath: join(runtimeDir, "supervisor.json"),
    supervisorLogPath: join(runtimeDir, "supervisor.log"),
  };
}
