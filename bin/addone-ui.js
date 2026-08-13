#!/usr/bin/env node
import { runTransparentForeground } from "../dist/src/transparent/main.js";

runTransparentForeground().then(
  code => { process.exitCode = code; },
  error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  },
);
