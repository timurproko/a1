#!/usr/bin/env node

const packageRoot = new URL("..", import.meta.url);

if (process.argv[2] === "version") {
  if (process.argv.length > 3) {
    process.stderr.write("Usage: addone version\n");
    process.exitCode = 2;
  } else {
    const [{ fileURLToPath }, { runVersionStats }] = await Promise.all([
      import("node:url"),
      import("../dist/src/cli/index.js"),
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
      import("../dist/src/foundation/release/index.js"),
    ]);
    process.exitCode = await runSelfUpdate({
      packageRoot: fileURLToPath(packageRoot),
      channel: process.argv[2] === "update:next" ? "next" : "stable",
    });
  }
} else if (process.argv.length > 2) {
  process.stderr.write("Usage: addone | addone version | addone update | addone update:next\n");
  process.exitCode = 2;
} else {
  const [{ fileURLToPath }, { runBootstrap }] = await Promise.all([
    import("node:url"),
    import("../dist/src/foundation/release/index.js"),
  ]);
  process.exitCode = await runBootstrap({ packageRoot: fileURLToPath(packageRoot) });
}
