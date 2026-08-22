#!/usr/bin/env node

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
  transparent: async profileId => {
    const { runSelectedTransparentRuntime } = await import("../dist/src/composition/transparent-runtime.js");
    return await runSelectedTransparentRuntime(profileId);
  },
}).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  },
);
