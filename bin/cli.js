#!/usr/bin/env node

const commandStartedAtMs = performance.timeOrigin + performance.now();
const packageRoot = new URL("..", import.meta.url);
// Invariant: one terminal module identity per process, before any A1 or Pi module loads.
const [{ installPinnedPiTuiResolver }, { fileURLToPath }] = await Promise.all([import("./module-resolver.js"), import("node:url")]);
installPinnedPiTuiResolver(fileURLToPath(packageRoot));
const startup = await import("../dist/foundation/startup/startup-runtime.js");
startup.initializeStartupTrace(process.env, process.argv[2] === "pi" ? "pi" : "a1", commandStartedAtMs);
startup.enableEnvironmentCompileCache(process.env);
await startup.markStartupPhase(process.env, "command-invoked");
const { readFile } = await import("node:fs/promises");
const [{ cliCapabilities }, { dispatchCli }, { createCommandHandlers }] = await Promise.all([
  import("../dist/cli/capabilities.js"), import("../dist/cli/dispatch.js"), import("./command-handlers.js"),
]);
const capabilities = cliCapabilities(JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8")).version);
try {
  process.exitCode = await dispatchCli(process.argv.slice(2), createCommandHandlers(packageRoot), {
    stdout: message => process.stdout.write(message), stderr: message => process.stderr.write(message),
  }, capabilities);
} catch (error) {
  console.error(`A1: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
