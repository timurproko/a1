#!/usr/bin/env node

import("../dist/foundation/release/automatic-update.js").then(async ({ runAutomaticUpdateWorker }) => {
  process.exitCode = await runAutomaticUpdateWorker(process.argv.slice(2));
}).catch(() => {
  process.exitCode = 1;
});
