#!/usr/bin/env node
/** Request the authoritative numbered preview for the current origin/develop. */

import { readFile } from "node:fs/promises";
import {
  authoritativeDevelopHead,
  dispatchPublication,
  registryVersion,
  resolveDevelopPreview,
} from "../release/publication-client.mjs";

function log(message) { process.stdout.write(`[develop] ${message}\n`); }

async function main() {
  const source = await authoritativeDevelopHead();
  const preview = await resolveDevelopPreview(source);
  const installer = JSON.parse(await readFile(new URL("../../packages/a1-install/package.json", import.meta.url), "utf8"));
  const [existing, installerExisting] = await Promise.all([
    registryVersion(preview.packageName, preview.version),
    registryVersion(installer.name, preview.version),
  ]);

  if (existing !== null && installerExisting !== null) {
    log(`${preview.version} already exists for both packages at develop pull request ${preview.pullRequest}; nothing to build or publish`);
    return;
  }

  log(`requesting ${preview.version} for ${source}`);
  await dispatchPublication("develop", source, preview.version);
  const [published, installerPublished] = await Promise.all([
    registryVersion(preview.packageName, preview.version),
    registryVersion(installer.name, preview.version),
  ]);
  if (published === null) throw new Error(`publication succeeded but npm does not serve ${preview.packageName}@${preview.version}`);
  if (installerPublished === null) throw new Error(`publication succeeded but npm does not serve ${installer.name}@${preview.version}`);
  log(`published ${preview.version}`);
}

try {
  await main();
} catch (error) {
  log(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
