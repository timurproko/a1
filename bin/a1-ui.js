#!/usr/bin/env node

const { runSelectedInteractiveRuntime } = await import("../dist/src/features/launch/index.js");

runSelectedInteractiveRuntime(process.env.A1_LAUNCH_PROFILE ?? "a1", {
  ownedUi: async () => {
    const [{ runOwnedUi }, { composeOwnedUiApplication }] = await Promise.all([
      import("../dist/src/features/owned-ui/index.js"),
      import("../dist/src/composition/index.js"),
    ]);
    const application = await composeOwnedUiApplication({ cwd: process.cwd() });
    return await runOwnedUi({ application });
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
