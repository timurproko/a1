#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareSinglePrDelivery } from "./openspec-delivery-finalization.mjs";
import { readCanonicalSpecs } from "./openspec-delivery-git.mjs";
import { CHANGE, parseImplementation, SHA } from "./openspec-archive-policy.mjs";

const execute = promisify(execFile);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function argumentsFrom(values) {
  const options = { write: false, gaps: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--write") options.write = true;
    else if (value === "--known-gap") options.gaps.push(values[++index]);
    else if (["--change", "--repository", "--pr", "--date", "--body-file", "--target"].includes(value)) options[value.slice(2)] = values[++index];
    else throw new Error(`unknown argument: ${value}`);
  }
  if (!CHANGE.test(options.change ?? "") || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(options.repository ?? "")
    || !/^[1-9]\d*$/.test(options.pr ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(options.date ?? "")
    || !SHA.test(options.target ?? "") || typeof options["body-file"] !== "string") throw new Error("required arguments: --change --repository --pr --date --target --body-file");
  return options;
}

export async function main(args = process.argv.slice(2), { cwd = process.cwd() } = {}) {
  const options = argumentsFrom(args);
  const root = resolve(cwd);
  const bodyPath = resolve(options["body-file"]);
  const body = await readFile(bodyPath, "utf8");
  const head = (await execute("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  await execute("git", ["merge-base", "--is-ancestor", options.target, head], { cwd: root });
  const finalized = Boolean(parseImplementation(body)?.archive);
  const specDiff = await execute("git", ["diff", "--name-only", options.target, "--", "openspec/specs"], { cwd: root });
  // Rationale: a finalized head legitimately carries synchronized specs; re-finalization rebuilds them from the target.
  if (specDiff.stdout.trim() && !finalized) throw new Error("canonical specs already differ from the target; reconcile before finalization");
  const result = await prepareSinglePrDelivery({ root, change: options.change, repository: options.repository,
    sourcePr: Number(options.pr), body, specBaseSha: options.target, date: options.date, knownGaps: options.gaps,
    write: options.write, bodyPath: options.write ? bodyPath : null,
    targetSpecs: await readCanonicalSpecs({ cwd: root, sha: options.target }) });
  process.stdout.write(`${JSON.stringify({ disposition: result.disposition, archive: result.paths?.archive ?? result.implementation?.archive,
    acceptanceManifest: result.paths ? `${result.paths.archive}acceptance.md` : result.implementation?.acceptanceManifest,
    changedPaths: result.changes.map(change => change.filename), bodyFile: bodyPath }, null, 2)}\n`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => fail(error.archiveCode ? `${error.archiveCode}${error.archiveDetail ? `: ${error.archiveDetail}` : ""}` : error.message));
}
