#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/index.js");
startup.enableEnvironmentCompileCache(process.env);
await startup.markStartupPhase(process.env, "guardian-start");
const { resolve } = await import("node:path");
const { parseSessionSelection } = await import("../dist/foundation/lifecycle/index.js");
const { runLaunchGuardian } = await import("../dist/foundation/launch-guardian/index.js");

const { readLaunchContext } = await import("../dist/foundation/launch-context/index.js");
const launchContext = readLaunchContext(process.env, "release");
const releaseRoot = launchContext.releaseRoot;
const profileId = readLaunchContext(process.env, "profile").launchProfile;

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
