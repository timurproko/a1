#!/usr/bin/env node

const packageRoot = new URL("..", import.meta.url);
const { fileURLToPath } = await import("node:url");
const { dispatchAddOneCli } = await import("../dist/src/cli/index.js");

process.exitCode = await dispatchAddOneCli(process.argv.slice(2), {
  launch: async intent => {
    const { runBootstrap } = await import("../dist/src/foundation/release/index.js");
    return await runBootstrap({ packageRoot: fileURLToPath(packageRoot), launchIntent: intent });
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
