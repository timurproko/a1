#!/usr/bin/env node

const { runSelectedInteractiveRuntime } = await import("../dist/src/features/launch/index.js");

runSelectedInteractiveRuntime(process.env.ADDONE_LAUNCH_PROFILE ?? "addone", {
  ownedUi: async () => {
    const { runOwnedUi } = await import("../dist/src/features/owned-ui/index.js");
    return await runOwnedUi({ cwd: process.cwd() });
  },
  transparent: async profileId => {
    const { runTransparentForeground } = await import("../dist/src/foundation/transparent-terminal/main.js");
    return await runTransparentForeground({ profileId });
  },
}).then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  },
);
