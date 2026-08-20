#!/usr/bin/env node

const packageRoot = new URL("..", import.meta.url);
const { fileURLToPath } = await import("node:url");
const { dispatchCli } = await import("../dist/src/cli/index.js");

process.exitCode = await dispatchCli(process.argv.slice(2), {
  launch: async intent => {
    const [{ prepareInteractiveLaunch }, { runBootstrap }] = await Promise.all([
      import("../dist/src/features/launch/index.js"),
      import("../dist/src/foundation/release/index.js"),
    ]);
    const prepared = await prepareInteractiveLaunch(intent);
    return await runBootstrap({ packageRoot: fileURLToPath(packageRoot), launchIntent: intent, environment: prepared.environment });
  },
  version: async () => {
    const { runVersionStats } = await import("../dist/src/cli/index.js");
    return await runVersionStats({ packageRoot: fileURLToPath(packageRoot) });
  },
  update: async channel => {
    const { runSelfUpdate } = await import("../dist/src/foundation/release/index.js");
    return await runSelfUpdate({ packageRoot: fileURLToPath(packageRoot), channel });
  },
}, {
  stderr: message => process.stderr.write(message),
});
