#!/usr/bin/env node
/** Request the authoritative numbered preview for the current origin/develop. */

import { readFile } from "node:fs/promises";
import {
  authoritativeDevelopHead,
  publishDevelopmentPreview,
  resolveDevelopPreview,
} from "../release/publication-client.mjs";

function log(message) { process.stdout.write(`[develop] ${message}\n`); }

async function main() {
  const source = await authoritativeDevelopHead();
  const preview = await resolveDevelopPreview(source);
  const installer = JSON.parse(await readFile(new URL("../../packages/a1-install/package.json", import.meta.url), "utf8"));
  await publishDevelopmentPreview(preview, installer.name);
}

try {
  await main();
} catch (error) {
  log(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
