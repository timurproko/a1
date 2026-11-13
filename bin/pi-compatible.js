#!/usr/bin/env node

const { fileURLToPath } = await import("node:url");
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const { installPinnedPiTuiResolver } = await import("./module-resolver.js");
installPinnedPiTuiResolver(packageRoot);
const { dispatchPiCompatibleCommand, parsePiCompatibleCommand } = await import("../dist/cli/pi-compatible.js");
const { prepareInteractiveLaunch, interactiveLaunchIntent } = await import("../dist/features/launch/index.js");

try {
  process.exitCode = await dispatchPiCompatibleCommand(parsePiCompatibleCommand(process.argv.slice(2)), {
    launch: async intent => {
      const [{ runBootstrap }, { releaseCopyIsLaunchable }] = await Promise.all([
        import("../dist/foundation/release/bootstrap.js"), import("./module-identity.js"),
      ]);
      const prepared = await prepareInteractiveLaunch(intent);
      return runBootstrap({ packageRoot, launchIntent: intent, environment: prepared.environment, releaseIsLaunchable: releaseCopyIsLaunchable });
    },
    version: async () => {
      const { readFile } = await import("node:fs/promises");
      const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
      process.stdout.write(`A1 ${manifest.version} (Pi engine ${manifest.dependencies["@earendil-works/pi-coding-agent"]}; Pi-compatible owned runtime)\n`);
      return 0;
    },
    catalog: async (options, search) => {
      // Security: Firstmate's current primary factory publishes a loaded marker even without a session.
      // Refuse shared-state probes until that external lifecycle prerequisite is corrected.
      if (["FM_HOME", "FM_ROOT_OVERRIDE", "FM_STATE_OVERRIDE", "FM_PI_SESSION_PID", "FM_PI_SESSION_START"].some(key => process.env[key])) {
        throw new Error("Catalog discovery is unavailable in a Firstmate-scoped environment: its primary extension factory can replace live loaded markers before session_start. A Firstmate lifecycle correction is required; no extensions were loaded.");
      }
      const prepared = await prepareInteractiveLaunch(interactiveLaunchIntent("a1"));
      if (prepared.configurationRoot === null) throw new Error("A1 profile is unavailable");
      process.env.PI_CODING_AGENT_DIR = prepared.configurationRoot;
      const { configurePinnedPiPublicPackage } = await import("./module-identity.js");
      configurePinnedPiPublicPackage(packageRoot);
      const { listPiCompatibleModels } = await import("../dist/integrations/pi/engine/cli-discovery.js");
      const models = await listPiCompatibleModels(process.cwd(), prepared.configurationRoot, options, search);
      process.stdout.write(`${models.join("\n")}\n`);
      return 0;
    },
  }, { stdout: text => process.stdout.write(text), stderr: text => process.stderr.write(text) });
} catch (error) {
  console.error(`A1 Pi compatibility: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
