#!/usr/bin/env node
/** Request the authoritative numbered preview for the current origin/develop. */

import {
  authoritativeDevelopHead,
  dispatchPublication,
  registryVersion,
  resolveDevelopPreview,
} from "../release/publication-client.mjs";

function log(message) { process.stdout.write(`[develop] ${message}\n`); }

const source = await authoritativeDevelopHead();
const preview = await resolveDevelopPreview(source);
const existing = await registryVersion(preview.packageName, preview.version);

if (existing !== null) {
  log(`${preview.version} already exists for develop pull request ${preview.pullRequest}; nothing to build or publish`);
  process.exit(0);
}

log(`requesting ${preview.version} for ${source}`);
await dispatchPublication("develop", source, preview.version);
const published = await registryVersion(preview.packageName, preview.version);
if (published === null) throw new Error(`publication succeeded but npm does not serve ${preview.packageName}@${preview.version}`);
log(`published ${preview.version}`);
