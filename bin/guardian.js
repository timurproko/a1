#!/usr/bin/env node

const { fileURLToPath } = await import("node:url");
const { resolve } = await import("node:path");
const { runLaunchGuardian } = await import("../dist/src/foundation/launch-guardian/index.js");

const releaseRoot = process.env.A1_RELEASE_ROOT ?? fileURLToPath(new URL("..", import.meta.url));
const profileId = process.env.A1_LAUNCH_PROFILE ?? "a1";

runLaunchGuardian({
  profileId,
  releaseRoot,
  uiEntry: resolve(releaseRoot, "bin", "ui.js"),
  environment: process.env,
  cwd: process.cwd(),
}).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
