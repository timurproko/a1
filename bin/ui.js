#!/usr/bin/env node

const startup = await import("../dist/foundation/startup/index.js");
startup.enableEnvironmentCompileCache(process.env);
await startup.markStartupPhase(process.env, "ui-entry");
const { assertSinglePiTuiModuleAtLaunch } = await import("./module-identity.js");
const { fileURLToPath } = await import("node:url");

// Compatibility: before the composition loads pinned Pi's terminal stack: confirm A1 and Pi
// resolve it to the same copy, so extensions and the owned UI share one module
// identity (see bin/module-identity.js for the full story). Nothing is repaired
// here — A1's package manifest decides which copy wins, and this only reports
// when that stopped being true.
assertSinglePiTuiModuleAtLaunch(fileURLToPath(new URL("..", import.meta.url)), message => process.stderr.write(message));

const { runSelectedInteractiveRuntime } = await import("../dist/features/launch/index.js");

const { parseSessionSelection } = await import("../dist/foundation/lifecycle/index.js");
Promise.resolve().then(() => {
  const sessionSelection = parseSessionSelection(process.argv.slice(2));
  const profile = process.env.A1_LAUNCH_PROFILE ?? "a1";
  if (sessionSelection && profile !== "a1") throw new Error("session selection requires the normal A1 profile");
  return runSelectedInteractiveRuntime(profile, {
    ownedUi: async (profileId, ownedSurfaces) => {
      const [{ createConsoleProjectTrustPrompt, createConsoleSessionForkPrompt, runOwnedUi }, { composeOwnedUi }] = await Promise.all([
        import("../dist/features/owned-ui/index.js"),
        import("../dist/composition/index.js"),
      ]);
      await startup.markStartupPhase(process.env, "ui-modules-loaded");
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
