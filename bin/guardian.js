#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/startup-runtime.js");
startup.enableEnvironmentCompileCache(process.env);
await startup.markStartupPhase(process.env, "guardian-start");
const { resolve } = await import("node:path");
const { parseSessionSelection } = await import("../dist/foundation/lifecycle/session-selection.js");
const { runLaunchGuardian } = await import("../dist/foundation/launch-guardian/main.js");

const { readLaunchContext } = await import("../dist/foundation/launch-context/index.js");
const launchContext = readLaunchContext(process.env, "release");
const releaseRoot = launchContext.releaseRoot;
const profileId = readLaunchContext(process.env, "profile").launchProfile;
// Invariant: the "release" and "profile" requirements above already refused an environment without
// these values; the checks give the type checker the same certainty.
if (releaseRoot === undefined || profileId === undefined) throw new Error("A1 launch context is incomplete");

const sessionSelection = parseSessionSelection(process.argv.slice(2));
Promise.resolve().then(() => runLaunchGuardian({
  ...(sessionSelection === undefined ? {} : { sessionSelection }),
  profileId,
  releaseRoot,
  uiEntry: resolve(releaseRoot, "bin", "ui.js"),
  environment: process.env,
  cwd: process.cwd(),
})).then(
  code => { process.exitCode = code; },
  error => {
    if (error instanceof Error && "code" in error && error.code === "release-superseded" && typeof process.send === "function") {
      process.send({ type: "a1-release-reselection" });
      process.exitCode = 1;
      return;
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
