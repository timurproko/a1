#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/index.js");
startup.enableEnvironmentCompileCache(process.env);
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
const profile = process.env.A1_LAUNCH_PROFILE ?? "a1";
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
      return await runOwnedUi({ application, ...(settings === null ? {} : { settings }) });
    },
  });
}).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error?.name === "PiSessionSelectionError" ? error.exitCode : 1;
  },
);
