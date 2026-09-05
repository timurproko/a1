#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/index.js");
startup.enableEnvironmentCompileCache(process.env);
await startup.markStartupPhase(process.env, "guardian-start");
const { fileURLToPath } = await import("node:url");
const { resolve } = await import("node:path");
const { parseSessionSelection } = await import("../dist/foundation/lifecycle/index.js");
const { runLaunchGuardian } = await import("../dist/foundation/launch-guardian/index.js");

const releaseRoot = process.env.A1_RELEASE_ROOT ?? fileURLToPath(new URL("..", import.meta.url));
const profileId = process.env.A1_LAUNCH_PROFILE ?? "a1";

Promise.resolve().then(() => runLaunchGuardian({
  sessionSelection: parseSessionSelection(process.argv.slice(2)),
  profileId,
  releaseRoot,
  uiEntry: resolve(releaseRoot, "bin", "ui.js"),
  environment: process.env,
  cwd: process.cwd(),
})).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
