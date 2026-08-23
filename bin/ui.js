#!/usr/bin/env node

const { ensureSinglePiTuiModuleAtLaunch } = await import("./module-identity.js");
const { fileURLToPath } = await import("node:url");

// Before the composition loads pinned Pi's terminal stack: collapse npm's
// duplicated copies of it so extensions and the owned UI share one module
// identity (see bin/module-identity.js for the full story).
ensureSinglePiTuiModuleAtLaunch(fileURLToPath(new URL("..", import.meta.url)), message => process.stderr.write(message));

const { runSelectedInteractiveRuntime } = await import("../dist/src/features/launch/index.js");

runSelectedInteractiveRuntime(process.env.A1_LAUNCH_PROFILE ?? "a1", {
  ownedUi: async (profileId, ownedSurfaces) => {
    const [{ runOwnedUi }, { composeOwnedUi }] = await Promise.all([
      import("../dist/src/features/owned-ui/index.js"),
      import("../dist/src/composition/index.js"),
    ]);
    const { application, settings } = await composeOwnedUi({ cwd: process.cwd(), profileId, ownedSurfaces });
    return await runOwnedUi({ application, ...(settings === null ? {} : { settings }) });
  },
}).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  },
);
