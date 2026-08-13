#!/usr/bin/env node
import { runTransparentForeground } from "../dist/src/foundation/transparent-terminal/main.js";

runTransparentForeground().then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  },
);
