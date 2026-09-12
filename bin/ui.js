#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/index.js");
startup.enableEnvironmentCompileCache(process.env);
const { readLaunchContext } = await import("../dist/foundation/launch-context/index.js");
const launchContext = readLaunchContext(process.env, "profile");
const profile = launchContext.launchProfile;
const { installFatalExit } = await import("../dist/foundation/terminal-cleanup/index.js");
const { resolveProductPaths } = await import("../dist/foundation/lifecycle/index.js");
const { join } = await import("node:path");
let runningApplication;
const fatal = profile === "a1" ? installFatalExit({
  directory: join(resolveProductPaths().runtimeDir, "crashes"),
  releaseId: launchContext.releaseId,
  dispose: () => runningApplication?.dispose(),
}) : undefined;
// Performance: begin the exact launch graph together while the trace write is pending.
// Direct owned-module entries avoid evaluating unrelated barrel exports before first paint.
const modules = Promise.all([
  import("./module-identity.js"),
  import("node:url"),
  import("../dist/features/launch/runtime-selection.js"),
  import("../dist/foundation/lifecycle/session-selection.js"),
  import("../dist/features/owned-ui/project-trust-prompt.js"),
  import("../dist/features/owned-ui/session-fork-prompt.js"),
  import("../dist/features/owned-ui/run.js"),
  import("../dist/composition/owned-ui.js"),
]);
await startup.markStartupPhase(process.env, "ui-entry");
const [
  { assertSinglePiTuiModuleAtLaunch },
  { fileURLToPath },
  { runSelectedInteractiveRuntime },
  { parseSessionSelection },
  { createConsoleProjectTrustPrompt },
  { createConsoleSessionForkPrompt },
  { runOwnedUi },
  { composeOwnedUi },
] = await modules;

// Compatibility: before the composition uses pinned Pi's terminal stack: confirm A1 and Pi
// resolve it to the same copy, so extensions and the owned UI share one module identity.
assertSinglePiTuiModuleAtLaunch(fileURLToPath(new URL("..", import.meta.url)), message => process.stderr.write(message));
await startup.markStartupPhase(process.env, "ui-modules-loaded");

const sessionSelection = parseSessionSelection(process.argv.slice(2));
Promise.resolve().then(() => {
  if (sessionSelection && profile !== "a1") throw new Error("session selection requires the normal A1 profile");
  return runSelectedInteractiveRuntime(profile, {
    ownedUi: async (profileId, ownedSurfaces) => {
      const { application, settings } = await composeOwnedUi({
        cwd: process.cwd(),
        profileId,
        ownedSurfaces,
        projectTrustPrompt: createConsoleProjectTrustPrompt(),
        sessionForkPrompt: createConsoleSessionForkPrompt(),
        ...(sessionSelection === undefined ? {} : { sessionSelection }),
      });
      runningApplication = application;
      return await runOwnedUi({ application, ...(settings === null ? {} : { settings }) });
    },
  });
}).then(
  code => { fatal?.remove(); process.exitCode = code; },
  error => {
    if (fatal && error?.name !== "PiSessionSelectionError") { fatal.fail(error); return; }
    fatal?.remove();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error?.name === "PiSessionSelectionError" ? error.exitCode : 1;
  },
);
