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
  const instanceId = source.A1_DEV_INSTANCE_ID
    ? createHash("sha256").update(source.A1_DEV_INSTANCE_ID).digest("hex").slice(0, 16)
    : randomUUID().replaceAll("-", "").slice(0, 16);
  const developmentRoot = resolve(source.A1_DEV_ROOT
    ?? join(temporaryDirectory, "addone-development", checkoutId, releaseId, "instances", instanceId));
  const dataDir = resolve(source.A1_DATA_DIR ?? join(developmentRoot, "data"));
  return {
    checkoutId,
    releaseId,
    instanceId,
    developmentRoot,
    environment: {
      ...source,
      A1_DEV_INSTANCE_ID: instanceId,
      A1_CONFIG_DIR: resolve(source.A1_CONFIG_DIR ?? join(developmentRoot, "config")),
      A1_DATA_DIR: dataDir,
      A1_RUNTIME_DIR: resolve(source.A1_RUNTIME_DIR ?? join(developmentRoot, "runtime")),
      A1_DATABASE_PATH: resolve(source.A1_DATABASE_PATH ?? join(dataDir, "control.sqlite3")),
    },
  };
}
