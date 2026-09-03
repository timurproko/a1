#!/usr/bin/env node

const { runReleaseCleanupWorker } = await import("../dist/foundation/release/index.js");

runReleaseCleanupWorker().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
