#!/usr/bin/env node

const packageRoot = new URL("..", import.meta.url);

if (process.argv[2] === "update") {
  const [{ fileURLToPath }, { runSelfUpdate }] = await Promise.all([
    import("node:url"),
    import("../dist/src/update.js"),
  ]);
  process.exitCode = await runSelfUpdate({ packageRoot: fileURLToPath(packageRoot) });
} else {
  // The mutable npm entry point imports only the dependency-light coordinator.
  // UI, supervisor, PTY, TUI, and native-addon code is loaded by a verified
  // child entry point inside the selected immutable release.
  const [{ fileURLToPath }, { runBootstrap }] = await Promise.all([
    import("node:url"),
    import("../dist/src/bootstrap.js"),
  ]);
  process.exitCode = await runBootstrap({ packageRoot: fileURLToPath(packageRoot) });
}
