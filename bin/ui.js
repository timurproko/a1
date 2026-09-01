#!/usr/bin/env node

const { assertSinglePiTuiModuleAtLaunch } = await import("./module-identity.js");
const { fileURLToPath } = await import("node:url");

// Compatibility: before the composition loads pinned Pi's terminal stack: confirm A1 and Pi
// resolve it to the same copy, so extensions and the owned UI share one module
// identity (see bin/module-identity.js for the full story). Nothing is repaired
// here — A1's package manifest decides which copy wins, and this only reports
// when that stopped being true.
assertSinglePiTuiModuleAtLaunch(fileURLToPath(new URL("..", import.meta.url)), message => process.stderr.write(message));

const { runSelectedInteractiveRuntime } = await import("../dist/features/launch/index.js");

const launchArgs = process.argv.slice(2);
let sessionPath;
if (launchArgs.length > 0) {
  if (launchArgs.length !== 2 || launchArgs[0] !== "--session" || launchArgs[1].trim().length === 0) {
    throw new Error("Usage: a1 [--session <session-file>]");
  }
  sessionPath = launchArgs[1];
}

runSelectedInteractiveRuntime(process.env.A1_LAUNCH_PROFILE ?? "a1", {
  ownedUi: async (profileId, ownedSurfaces) => {
    const [{ createConsoleProjectTrustPrompt, runOwnedUi }, { composeOwnedUi }] = await Promise.all([
      import("../dist/features/owned-ui/index.js"),
      import("../dist/composition/index.js"),
    ]);
    const { application, settings } = await composeOwnedUi({
      cwd: process.cwd(),
      profileId,
      ownedSurfaces,
      projectTrustPrompt: createConsoleProjectTrustPrompt(),
      ...(sessionPath === undefined ? {} : { sessionPath }),
    });
    return await runOwnedUi({ application, ...(settings === null ? {} : { settings }) });
  },
}).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  },
);
