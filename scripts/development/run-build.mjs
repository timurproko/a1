#!/usr/bin/env node
/** Run the normal build: environment check, TypeScript and resource generation, then the payload inventory. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** `--core` is the same build; it stays accepted for the `prepare` lifecycle and older callers. */
export function buildStages({ npmCli, node = process.execPath }) {
  return [
    { executable: node, arguments: [resolve("scripts/development/check-environment.mjs")] },
    { executable: node, arguments: [npmCli, "run", "build:managed"] },
    { executable: node, arguments: [resolve("scripts/release/generate-runtime-payload-inventory.mjs")] },
  ];
}

export function runBuild({
  environment = process.env,
  spawn = spawnSync,
} = {}) {
  const npmCli = environment.npm_execpath?.trim();
  if (!npmCli) throw new Error("npm did not provide npm_execpath; run this build through `npm run build`");
  for (const stage of buildStages({ npmCli })) {
    const result = spawn(stage.executable, stage.arguments, {
      cwd: process.cwd(), env: environment, stdio: "inherit", windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runBuild();
}
