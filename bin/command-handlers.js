import { fileURLToPath } from "node:url";

/**
 * Concrete public-command wiring shared by both naming entries. CLI policy stays engine-neutral.
 * @param {URL} packageRoot
 * @returns {import('../dist/cli/dispatch.js').CliHandlers & Required<Pick<import('../dist/cli/dispatch.js').CliHandlers, 'catalog'>>}
 */
export function createCommandHandlers(packageRoot) {
  const root = fileURLToPath(packageRoot);
  return {
    launch: async intent => {
      const [{ prepareInteractiveLaunch }, { runBootstrap }, { releaseCopyIsLaunchable }] = await Promise.all([
        import("../dist/features/launch/prepare-launch.js"), import("../dist/foundation/release/bootstrap.js"), import("./module-identity.js"),
      ]);
      const prepared = await prepareInteractiveLaunch(intent);
      return runBootstrap({ packageRoot: root, launchIntent: intent, environment: prepared.environment, releaseIsLaunchable: releaseCopyIsLaunchable });
    },
    version: async () => {
      const { runVersionStats } = await import("../dist/cli/version-stats.js");
      return runVersionStats({ packageRoot: root, offline: ["1", "true", "yes"].includes(process.env.PI_OFFLINE?.toLowerCase() ?? "") });
    },
    catalog: async (options, search) => {
      // Security: current Firstmate factories publish live evidence before session_start.
      if (["FM_HOME", "FM_ROOT_OVERRIDE", "FM_STATE_OVERRIDE", "FM_PI_SESSION_PID", "FM_PI_SESSION_START"].some(key => process.env[key])) {
        throw new Error("Catalog discovery is unavailable in a Firstmate-scoped environment: its primary extension factory can replace live loaded markers before session_start. A Firstmate lifecycle correction is required; no extensions were loaded.");
      }
      const { prepareInteractiveLaunch, interactiveLaunchIntent } = await import("../dist/features/launch/index.js");
      const prepared = await prepareInteractiveLaunch(interactiveLaunchIntent("a1"));
      if (prepared.configurationRoot === null) throw new Error("A1 profile is unavailable");
      process.env.PI_CODING_AGENT_DIR = prepared.configurationRoot;
      const { configurePinnedPiPublicPackage } = await import("./module-identity.js");
      configurePinnedPiPublicPackage(root);
      const { listPiCompatibleModels } = await import("../dist/integrations/pi/engine/cli-discovery.js");
      const models = await listPiCompatibleModels(process.cwd(), prepared.configurationRoot, options, search);
      process.stdout.write(`${models.join("\n")}\n`);
      return 0;
    },
    update: async (channel, target) => {
      const { runSelfUpdate } = await import("../dist/foundation/release/update.js");
      return runSelfUpdate({ packageRoot: root, channel, ...(target === undefined ? {} : { target }) });
    },
    packages: async request => {
      const [{ runPackageCommand }, identity] = await Promise.all([import("../dist/cli/packages.js"), import("./module-identity.js")]);
      identity.configurePinnedPiPublicPackage(root);
      const { createPiPackagesPort } = await import("../dist/integrations/pi/engine/package-integration.js");
      return runPackageCommand(request, { createPort: createPiPackagesPort });
    },
    api: async arguments_ => {
      const { runApiCommand } = await import("../dist/cli/api.js");
      return runApiCommand(arguments_);
    },
    sessionContext: async request => {
      const { runSessionContextCommand } = await import("../dist/cli/session-context.js");
      return runSessionContextCommand(request);
    },
    uninstall: async request => {
      const [{ runUninstall }, { createInterface }] = await Promise.all([import("../dist/cli/uninstall.js"), import("node:readline/promises")]);
      const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true;
      return runUninstall(request, {
        packageRoot: root,
        output: { stdout: message => process.stdout.write(message), stderr: message => process.stderr.write(message) },
        ...(interactive ? { confirm: async question => {
          const prompt = createInterface({ input: process.stdin, output: process.stdout });
          try { return /^y(?:es)?$/iu.test((await prompt.question(question)).trim()); } finally { prompt.close(); }
        } } : {}),
      });
    },
  };
}
