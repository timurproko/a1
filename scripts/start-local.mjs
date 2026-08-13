import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const canonicalRoot = await realpath(packageRoot);
const [{ deriveReleaseIdentity }, { resolveDevelopmentLaunchEnvironment }] = await Promise.all([
  import("../dist/src/foundation/release/index.js"),
  import("../dist/src/features/launch/index.js"),
]);
const release = await deriveReleaseIdentity(packageRoot);
const { checkoutId, instanceId, developmentRoot, environment } = resolveDevelopmentLaunchEnvironment(
  canonicalRoot,
  release.releaseId,
  process.env,
);

const launchArguments = process.argv.slice(2);
if (launchArguments[0] === "--print-environment") {
  process.stdout.write(`${JSON.stringify({ checkoutId, instanceId, releaseId: release.releaseId, developmentRoot, launchArguments: launchArguments.slice(1), environment: {
    ADDONE_CONFIG_DIR: environment.ADDONE_CONFIG_DIR,
    ADDONE_DATA_DIR: environment.ADDONE_DATA_DIR,
    ADDONE_RUNTIME_DIR: environment.ADDONE_RUNTIME_DIR,
    ADDONE_DATABASE_PATH: environment.ADDONE_DATABASE_PATH,
  } }, null, 2)}\n`);
} else {
  const child = spawn(process.execPath, [resolve(packageRoot, "bin", "addone.js"), ...launchArguments], {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
    windowsHide: false,
  });
  child.once("error", error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
  child.once("close", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}
