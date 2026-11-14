#!/usr/bin/env node

const { fileURLToPath } = await import("node:url");
const packageRoot = new URL("..", import.meta.url);
const { installPinnedPiTuiResolver } = await import("./module-resolver.js");
installPinnedPiTuiResolver(fileURLToPath(packageRoot));
const { dispatchPiCompatibleCommand, parsePiCompatibleCommand } = await import("../dist/cli/pi-compatible.js");
const { createCommandHandlers } = await import("./command-handlers.js");
const output = { stdout: (/** @type {string} */ text) => { process.stdout.write(text); }, stderr: (/** @type {string} */ text) => { process.stderr.write(text); } };
try {
  const handlers = createCommandHandlers(packageRoot);
  process.exitCode = await dispatchPiCompatibleCommand(parsePiCompatibleCommand(process.argv.slice(2)), {
    ...handlers,
    version: async () => {
      const { readFile } = await import("node:fs/promises");
      const manifest = JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8"));
      process.stdout.write(`A1 ${manifest.version} (Pi engine ${manifest.dependencies["@earendil-works/pi-coding-agent"]}; normal owned runtime)\n`);
      return 0;
    },
    control: async arguments_ => {
      const [{ dispatchCli }, { cliCapabilities }, { readFile }] = await Promise.all([
        import("../dist/cli/dispatch.js"), import("../dist/cli/capabilities.js"), import("node:fs/promises"),
      ]);
      const manifest = JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8"));
      return dispatchCli(arguments_, handlers, output, cliCapabilities(manifest.version));
    },
  }, output);
} catch (error) {
  console.error(`A1: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
