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
  // Interactive terminal execution is deliberately unavailable while the
  // retired emulation pipeline is removed. Do not materialize or start an old
  // UI/supervisor as a hidden fallback. Dependency-light maintenance commands
  // above remain available throughout the redesign.
  process.stderr.write(
    "AddOne terminal capability is unavailable during redesign. "
      + "Run terminal applications directly; maintenance commands remain available: "
      + "addone version, addone update, addone update:next.\n",
  );
  process.exitCode = 1;
}
