#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";
import {
  assertImplementationOnlyProgress, assertVersion3BodyLayout, checkedImplementationPreview, declaredImplementationComplete, parseImplementationAcceptanceScenarios, parseImplementationProgress,
} from "./openspec-acceptance-checklist.mjs";
import { archiveFailure, parseImplementation } from "./openspec-archive-policy.mjs";

/**
 * Apply the trusted promotion body validators to one delivery body. Reasons match the finalization run's `draft-<code>`
 * so a local failure names exactly what would keep the pull request draft. `final` treats every Implementation item as
 * checked, because the check runs before the author ticks the last one.
 */
export function inspectDeliveryBody(body, { final = false } = {}) {
  let complete = declaredImplementationComplete(body);
  try {
    const implementation = parseImplementation(body);
    if (!implementation) throw archiveFailure("unassociated");
    if (implementation.version !== 3) throw archiveFailure(`legacy-version-${implementation.version}`);
    const progress = parseImplementationProgress(body);
    if (progress.format !== "checklist") throw archiveFailure("implementation-progress-legacy-draft");
    complete = progress.complete;
    assertImplementationOnlyProgress(progress.items);
    assertVersion3BodyLayout(body, { acceptanceRequired: complete || final });
    if (complete || final) parseImplementationAcceptanceScenarios(final ? checkedImplementationPreview(body) : body, 3);
    return { ok: true, complete };
  } catch (error) {
    if (typeof error?.archiveCode !== "string") throw error;
    return { ok: false, complete, reason: `draft-${error.archiveCode}` };
  }
}

export async function main(args = process.argv.slice(2), { readPullBody = defaultReadPullBody } = {}) {
  const { values } = parseArgs({ args, options: { "body-file": { type: "string" }, pr: { type: "string" }, final: { type: "boolean" } } });
  if (Boolean(values["body-file"]) === Boolean(values.pr)) throw new Error("pass exactly one of --body-file <path> or --pr <number>");
  if (values.pr && !/^[1-9]\d*$/.test(values.pr)) throw new Error("--pr must be a pull request number");
  const body = values.pr ? await readPullBody(values.pr) : await readFile(values["body-file"], "utf8");
  return inspectDeliveryBody(body, { final: Boolean(values.final) });
}

async function defaultReadPullBody(number) {
  const { stdout } = await promisify(execFile)("gh", ["pr", "view", number, "--json", "body", "--jq", ".body"], { maxBuffer: 1024 * 1024 });
  return stdout.replace(/\n$/, "");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  }).catch(error => {
    console.error(`delivery body check failed: ${error.message}`);
    process.exitCode = 2;
  });
}
