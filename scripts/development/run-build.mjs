#!/usr/bin/env node
/** Run the normal build under one resolved native environment, before any clean or compilation. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveNativeBuildEnvironment } from "./native-build-environment.mjs";

export function buildStages({ core, npmCli, node = process.execPath }) {
  const stages = [
    { executable: node, arguments: [resolve("scripts/development/check-environment.mjs")] },
    { executable: node, arguments: [npmCli, "run", "build:managed"] },
  ];
  if (!core) stages.push({ executable: node, arguments: [resolve("scripts/development/prepare-local-terminal-host.mjs")] });
  stages.push({ executable: node, arguments: [resolve("scripts/release/generate-runtime-payload-inventory.mjs")] });
  return stages;
}

export function runBuild({
  argv = process.argv.slice(2),
  environment: launchingEnvironment = process.env,
  spawn = spawnSync,
  resolveEnvironment = resolveNativeBuildEnvironment,
} = {}) {
  const resolved = resolveEnvironment({ environment: launchingEnvironment });
  const environment = resolved.environment;
  const npmCli = environment.npm_execpath?.trim();
  if (!npmCli) throw new Error("npm did not provide npm_execpath; run this build through `npm run build`");
  const core = argv.includes("--core");
  for (const stage of buildStages({ core, npmCli })) {
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
