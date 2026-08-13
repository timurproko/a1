import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface DevelopmentLaunchEnvironment {
  readonly checkoutId: string;
  readonly releaseId: string;
  readonly instanceId: string;
  readonly developmentRoot: string;
  readonly environment: NodeJS.ProcessEnv;
}

export function resolveDevelopmentLaunchEnvironment(
  canonicalPackageRoot: string,
  releaseId: string,
  source: NodeJS.ProcessEnv = process.env,
  temporaryDirectory = tmpdir(),
): DevelopmentLaunchEnvironment {
  const checkoutId = createHash("sha256").update(resolve(canonicalPackageRoot).toLowerCase()).digest("hex").slice(0, 16);
  const instanceId = source.ADDONE_DEV_INSTANCE_ID
    ? createHash("sha256").update(source.ADDONE_DEV_INSTANCE_ID).digest("hex").slice(0, 16)
    : randomUUID().replaceAll("-", "").slice(0, 16);
  const developmentRoot = resolve(source.ADDONE_DEV_ROOT
    ?? join(temporaryDirectory, "addone-development", checkoutId, releaseId, "instances", instanceId));
  const dataDir = resolve(source.ADDONE_DATA_DIR ?? join(developmentRoot, "data"));
  return {
    checkoutId,
    releaseId,
    instanceId,
    developmentRoot,
    environment: {
      ...source,
      ADDONE_DEV_INSTANCE_ID: instanceId,
      ADDONE_CONFIG_DIR: resolve(source.ADDONE_CONFIG_DIR ?? join(developmentRoot, "config")),
      ADDONE_DATA_DIR: dataDir,
      ADDONE_RUNTIME_DIR: resolve(source.ADDONE_RUNTIME_DIR ?? join(developmentRoot, "runtime")),
      ADDONE_DATABASE_PATH: resolve(source.ADDONE_DATABASE_PATH ?? join(dataDir, "control.sqlite3")),
    },
  };
}
