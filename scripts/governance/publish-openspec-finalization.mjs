#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { inspectUnassociatedPull } from "./openspec-association-policy.mjs";
import { createArchiveReader } from "./openspec-archive-github.mjs";
import { archiveFailure } from "./openspec-archive-policy.mjs";
import { createArchivePublisher } from "./openspec-archive-publication.mjs";
import { classifyFinalizationCandidate, reconcileFinalization } from "./openspec-finalization-publication.mjs";

const TRUSTED_EVENTS = ["pull_request_target", "workflow_dispatch"];

function summaryLine(number, result) {
  const detail = result.reason ? ` (${result.reason})` : "";
  const commits = result.commits?.length ? `; pushed ${result.commits.map(commit => `${commit.kind} ${commit.sha.slice(0, 8)}`).join(", ")}` : "";
  const body = result.bodyUpdated ? "; body fence updated" : "";
  return `- PR #${number}: ${result.disposition}${detail}${commits}${body}${result.archive ? `; archive ${result.archive}` : ""}`;
}

export async function main(args = process.argv.slice(2), environment = process.env) {
  const { values } = parseArgs({ args, options: { pr: { type: "string" }, "dry-run": { type: "boolean" } } });
  if (!/^[1-9]\d*$/.test(values.pr ?? "")) throw archiveFailure("implementation-pr");
  const number = Number(values.pr);
  const dryRun = Boolean(values["dry-run"]);
  if (!dryRun && (environment.GITHUB_ACTIONS !== "true" || !TRUSTED_EVENTS.includes(environment.GITHUB_EVENT_NAME))) {
    throw archiveFailure("trusted-workflow-required");
  }
  const deadline = Date.now() + 9 * 60 * 1000;
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const definition = JSON.parse(await readFile(resolve(root, "config/github-repository-governance.json"), "utf8"));
  const repository = environment.GITHUB_REPOSITORY ?? definition.repository;
  if (repository !== definition.repository) throw archiveFailure("repository-identity");
  const reader = createArchiveReader({ repository, token: environment.GITHUB_TOKEN ?? environment.GH_TOKEN, deadline });
  let result;
  if (dryRun) {
    const pull = await reader.get(`${reader.prefix}/pulls/${number}`);
    const classified = classifyFinalizationCandidate(pull, repository);
    if (classified.skip === "unassociated") {
      const association = await inspectUnassociatedPull(reader, pull);
      if (association.blocked) throw archiveFailure(association.reason, association.changes.join(","));
    }
    result = classified.skip ? { disposition: "skipped", reason: classified.skip, head: pull.head?.sha ?? null }
      : { disposition: "would-reconcile", head: pull.head.sha, change: classified.implementation.change };
  } else {
    const publisher = await createArchivePublisher({ repository, appId: environment.OPENSPEC_ARCHIVE_APP_ID,
      privateKey: environment.OPENSPEC_ARCHIVE_APP_PRIVATE_KEY, deadline });
    try {
      result = await reconcileFinalization({ reader, publisher, number, deadline,
        toolRoot: resolve(root, "node_modules/@fission-ai/openspec") });
    } finally { await publisher.close().catch(() => { /* Security: token expiry remains the final bound. */ }); }
  }
  if (environment.GITHUB_STEP_SUMMARY) {
    await appendFile(environment.GITHUB_STEP_SUMMARY, `## OpenSpec finalization${dryRun ? " audit" : ""}\n${summaryLine(number, result)}\n`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(value => console.log(JSON.stringify(value, null, 2))).catch(async error => {
    const code = error.archiveCode ?? "internal-error";
    const detail = error.archiveDetail ? `: ${error.archiveDetail}` : "";
    console.error(`OpenSpec finalization blocked: ${code}${detail}`);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## OpenSpec finalization\n- blocked: \`${code}${detail}\`; nothing was pushed\n`);
    process.exitCode = 1;
  });
}
