#!/usr/bin/env node

const packageRoot = new URL("..", import.meta.url);
const { fileURLToPath } = await import("node:url");
const { readFile } = await import("node:fs/promises");
const { cliCapabilities, dispatchCli } = await import("../dist/cli/index.js");

// Which commands this build exposes follows from the build's own version, so a
// released a1 cannot be argued into offering the development profiles.
const capabilities = cliCapabilities(JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8")).version);

process.exitCode = await dispatchCli(process.argv.slice(2), {
  launch: async intent => {
    const [{ prepareInteractiveLaunch }, { runBootstrap }, { healModuleIdentityAtLaunch, releaseCopyIsLaunchable }] = await Promise.all([
      import("../dist/features/launch/index.js"),
      import("../dist/foundation/release/index.js"),
      import("./module-identity.js"),
    ]);
    // Self-heal the installed tree before the release store copies it: npm 12
    // blocks install scripts by default, so the postinstall that normally
    // repairs module identity may never have run (see bin/module-identity.js).
    const packageRootPath = fileURLToPath(packageRoot);
    await healModuleIdentityAtLaunch(packageRootPath, message => process.stderr.write(message));
    const prepared = await prepareInteractiveLaunch(intent);
    return await runBootstrap({
      packageRoot: packageRootPath,
      launchIntent: intent,
      environment: prepared.environment,
      releaseIsLaunchable: releaseCopyIsLaunchable,
    });
  },
  version: async () => {
    const { runVersionStats } = await import("../dist/cli/index.js");
    return await runVersionStats({ packageRoot: fileURLToPath(packageRoot) });
  },
  update: async (channel, target) => {
    const { runSelfUpdate } = await import("../dist/foundation/release/index.js");
    return await runSelfUpdate({ packageRoot: fileURLToPath(packageRoot), channel, ...(target === undefined ? {} : { target }) });
  },
  packages: async request => {
    const [{ runPackageCommand }, { createPiPackagesPort }] = await Promise.all([
      import("../dist/cli/index.js"),
      import("../dist/integrations/pi/engine/index.js"),
    ]);
    return await runPackageCommand(request, { createPort: createPiPackagesPort });
  },
}, {
  stderr: message => process.stderr.write(message),
}, capabilities);
