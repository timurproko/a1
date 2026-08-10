#!/usr/bin/env node
import { runSupervisor } from "../dist/src/supervisor/main.js";

runSupervisor().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
