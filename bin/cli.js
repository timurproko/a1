#!/usr/bin/env node

const packageRoot = new URL("..", import.meta.url);
const { fileURLToPath } = await import("node:url");
const { readFile } = await import("node:fs/promises");
const { cliCapabilities, dispatchCli } = await import("../dist/src/cli/index.js");

// Which commands this build exposes follows from the build's own version, so a
// released a1 cannot be argued into offering the development profiles.
const capabilities = cliCapabilities(JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8")).version);

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
  packages: async request => {
    const [{ runPackageCommand }, { createPiPackagesPort }] = await Promise.all([
      import("../dist/src/cli/index.js"),
      import("../dist/src/foundation/pi-engine-adapter/index.js"),
    ]);
    return await runPackageCommand(request, { createPort: createPiPackagesPort });
  },
}, {
  stderr: message => process.stderr.write(message),
}, capabilities);
