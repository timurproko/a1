#!/usr/bin/env node
import { runSupervisor } from "../dist/foundation/supervision/index.js";

runSupervisor(process.argv.slice(2)).catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
