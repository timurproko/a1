#!/usr/bin/env node

const packageRoot = new URL("..", import.meta.url);

if (process.argv[2] === "version") {
  if (process.argv.length > 3) {
    process.stderr.write("Usage: addone version\n");
    process.exitCode = 2;
  } else {
    const [{ fileURLToPath }, { runVersionStats }] = await Promise.all([
      import("node:url"),
      import("../dist/src/version-stats.js"),
    ]);
    process.exitCode = await runVersionStats({ packageRoot: fileURLToPath(packageRoot) });
  }
} else if (process.argv[2] === "update" || process.argv[2] === "update:next") {
  if (process.argv.length > 3) {
    process.stderr.write("Usage: addone update | addone update:next\n");
    process.exitCode = 2;
  } else {
    const [{ fileURLToPath }, { runSelfUpdate }] = await Promise.all([
      import("node:url"),
      import("../dist/src/update.js"),
    ]);
    process.exitCode = await runSelfUpdate({
      packageRoot: fileURLToPath(packageRoot),
      channel: process.argv[2] === "update:next" ? "next" : "stable",
    });
  }
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
