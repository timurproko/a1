import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

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
  const selectedInstanceId = source[PRODUCT_IDENTITY.environment.developmentInstanceId];
  const instanceId = selectedInstanceId
    ? createHash("sha256").update(selectedInstanceId).digest("hex").slice(0, 16)
    : randomUUID().replaceAll("-", "").slice(0, 16);
  const checkoutRoot = resolve(temporaryDirectory, PRODUCT_IDENTITY.state.developmentDirectory, checkoutId);
  const selectedDevelopmentRoot = source[PRODUCT_IDENTITY.environment.developmentRoot];
  const developmentRoot = resolve(selectedDevelopmentRoot
    ?? join(checkoutRoot, releaseId, "instances", instanceId));
  // Runtime/data remain instance-isolated, but product settings are user
  // preferences and must survive a fresh local launch (and a rebuilt candidate).
  // An explicit development root retains its historical self-contained policy.
  const persistentConfigDir = selectedDevelopmentRoot
    ? join(developmentRoot, "config")
    : join(checkoutRoot, "config");
  const dataDir = resolve(source[PRODUCT_IDENTITY.environment.dataDir] ?? join(developmentRoot, "data"));
  return {
    checkoutId,
    releaseId,
    instanceId,
    developmentRoot,
    environment: {
      ...source,
      [PRODUCT_IDENTITY.environment.developmentInstanceId]: instanceId,
      [PRODUCT_IDENTITY.environment.configDir]: resolve(source[PRODUCT_IDENTITY.environment.configDir] ?? persistentConfigDir),
      [PRODUCT_IDENTITY.environment.dataDir]: dataDir,
      [PRODUCT_IDENTITY.environment.runtimeDir]: resolve(source[PRODUCT_IDENTITY.environment.runtimeDir] ?? join(developmentRoot, "runtime")),
      [PRODUCT_IDENTITY.environment.databasePath]: resolve(source[PRODUCT_IDENTITY.environment.databasePath] ?? join(dataDir, PRODUCT_IDENTITY.endpoint.databaseFilename)),
    },
  };
}
