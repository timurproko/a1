import { prepareAcceptanceRequest, inspectAcceptanceCandidate, validateAcceptanceCandidate } from "./openspec-acceptance-github.mjs";
import { publishAcceptanceRequest } from "./openspec-acceptance-publication.mjs";
import { archivedAcceptanceMatches } from "./openspec-acceptance-policy.mjs";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createArchiveReader, loadArchiveEvidence } from "./openspec-archive-github.mjs";
import { loadArchiveTool, prepareArchive, snapshotOpenSpec } from "./openspec-archive-staging.mjs";
import { createArchivePublisher, publishArchive, readArchiveMarker } from "./openspec-archive-publication.mjs";
import { newArchiveCheckpoint, validateArchiveCheckpoint, scanArchiveCandidates, advanceArchiveCheckpoint } from "./openspec-archive-scan.mjs";
import { archiveFailure, assertArchiveDiff, SHA } from "./openspec-archive-policy.mjs";

export async function discoverArchiveCheckpoint(reader) {
  const response = await reader.get(`${reader.prefix}/actions/workflows/openspec-archive.yml/runs?status=success&per_page=100&page=1`);
  if (!Array.isArray(response.workflow_runs)) throw archiveFailure("checkpoint-runs");
  // Performance: this is a bounded recent-checkpoint lookup, not an exhaustive run-history assertion.
  for (const run of response.workflow_runs.slice(0, 100)) {
    if (run.head_branch !== "develop" || run.head_repository?.full_name !== reader.repository
      || !["schedule", "workflow_dispatch", "pull_request_target"].includes(run.event)
      || run.path !== ".github/workflows/openspec-archive.yml") continue;
    const artifacts = await reader.pages(`/actions/runs/${run.id}/artifacts`, 100, "artifacts");
    if (artifacts.some(item => item.name === "openspec-archive-checkpoint" && !item.expired && item.size_in_bytes < 64 * 1024)) return run.id;
  }
  return null;
}

export async function reconcileArchives({ reader, tool, publisherFactory, dryRun = true, pr = null, retryClosed = false,
  checkpoint = newArchiveCheckpoint(), now = Date.now, prepare = prepareArchive, publish = publishArchive,
  loadEvidence = loadArchiveEvidence }) {
  const started = now();
  const report = { version: 1, dryRun, coverage: null, results: [], checkpoint: null };
  let publisher;
  let publisherError;
  async function getPublisher() {
    if (publisherError) throw publisherError;
    try { return publisher ??= await publisherFactory(); }
    catch (error) { publisherError = error; throw error; }
  }
  const opens = await reader.pages("/pulls?state=open&base=develop", 1000);
  const queued = opens.filter(pull => pull.head?.ref?.startsWith("docs/archive-") && readArchiveMarker(pull.body));
  if (queued.length > 1) throw archiveFailure("archive-queue-ambiguous");
  let queue = queued[0] ?? null;
  const scan = pr === null ? await scanArchiveCandidates(reader, checkpoint) : null;
  const candidates = scan?.candidates ?? [{ number: pr, mergedAt: null }];
  report.coverage = scan ? { start: checkpoint.start, end: checkpoint.end, windowEnd: scan.windowEnd, scanned: scan.scanned, complete: scan.complete }
    : { targetedPr: pr };
  const processed = [];
  let published = false;
  try {
    for (const candidate of candidates) {
      if (now() - started > 8 * 60 * 1000) break;
      const row = { pr: candidate.number, disposition: "blocked" };
      try {
        let evidence = await loadEvidence(reader, candidate.number, { allowMissing: true });
        if (evidence.disposition === "unlinked" && evidence.pull.head?.ref?.startsWith("docs/accept-")) {
          const acceptance = await inspectAcceptanceCandidate(reader, evidence.pull, { requireComplete: false });
          if (acceptance) {
            row.acceptancePr = candidate.number;
            row.pr = acceptance.record.sourcePr;
            evidence = await loadEvidence(reader, row.pr, { allowMissing: true });
          }
        }
        if (evidence.disposition === "unlinked") {
          row.disposition = "unlinked";
        } else if (["closed", "draft", "needs-finalization", "ready-for-manual-merge"].includes(evidence.disposition)) {
          row.deliveryVersion = 3;
          row.change = evidence.implementation.change;
          row.disposition = evidence.disposition;
        } else if (evidence.disposition === "acceptance-missing") {
          row.change = evidence.implementation.change;
          if (published) {
            Object.assign(row, { disposition: "deferred", reason: "publication-budget" });
            report.results.push(row);
            break;
          }
          const request = await prepareAcceptanceRequest(reader, evidence);
          const result = await publishAcceptanceRequest({ reader, source: evidence, candidate: request, dryRun,
            publisher: dryRun ? null : await getPublisher(), retryClosed });
          Object.assign(row, result);
          published ||= result.published === true;
        } else if (evidence.implementation.version === 3) {
          row.accepted = true;
          row.deliveryVersion = 3;
          row.change = evidence.implementation.change;
          row.disposition = "accepted-and-archived";
          row.phase = "Archived";
          row.mergeCommit = evidence.pull.merge_commit_sha;
          row.archive = evidence.implementation.archive;
          row.validationRunId = evidence.validation.runId;
        } else {
          row.accepted = true;
          if (evidence.acceptance.kind === "pull-request") row.acceptancePr = evidence.acceptance.id;
          row.change = evidence.implementation.change;
          const branch = `docs/archive-${row.change}`;
          const matches = await reader.pages(`/pulls?state=all&base=develop&head=${encodeURIComponent(`${reader.repository.split("/")[0]}:${branch}`)}`, 1000);
          const existing = matches.find(pull => pull.state === "open") ?? matches[0] ?? null;
          let marker = existing ? readArchiveMarker(existing.body) : null;
          if (!existing) {
            let branchRef;
            try { branchRef = await reader.get(`${reader.prefix}/git/ref/heads/${branch}`); }
            catch (error) { if (error.archiveCode !== "github-not-found") throw error; }
            if (branchRef) {
              const commit = await reader.get(`${reader.prefix}/git/commits/${branchRef.object?.sha}`);
              marker = readArchiveMarker(commit.message);
              if (!marker) throw archiveFailure("archive-branch-ownership");
            }
          }
          if ((existing || marker) && (!marker || marker.change !== row.change || marker.sourcePr !== evidence.pull.number
            || marker.sourceHead !== evidence.pull.head.sha || marker.sourceMerge !== evidence.pull.merge_commit_sha)) throw archiveFailure("archive-pr-ownership");
          if (existing?.merged_at) {
            if (!SHA.test(existing.merge_commit_sha ?? "") || marker.generatedHead !== existing.head?.sha) throw archiveFailure("archive-integration-unverified");
            const commit = await reader.get(`${reader.prefix}/git/commits/${existing.head.sha}`);
            const { generatedHead, ...declared } = marker;
            if (JSON.stringify(readArchiveMarker(commit.message)) !== JSON.stringify(declared)) throw archiveFailure("archive-integration-unverified");
            await reader.ancestor(existing.merge_commit_sha, evidence.targetSha);
            const target = await snapshotOpenSpec(reader, evidence.targetSha);
            const record = (await target.blob(`${marker.archive}acceptance.md`))?.toString();
            if (target.entries.has(`openspec/changes/${row.change}/.openspec.yaml`) || !record
              || !archivedAcceptanceMatches(record, evidence, reader.repository)) {
              throw archiveFailure("archive-integration-unverified");
            }
            row.disposition = "already-archived";
            row.archivePr = existing.number;
            row.mergeCommit = existing.merge_commit_sha;
          } else {
            if (existing?.state === "closed" && !retryClosed) throw archiveFailure("archive-pr-closed");
            if (queue && queue.number !== existing?.number || published) {
              row.disposition = "deferred";
              row.reason = published ? "publication-budget" : "archive-queue-pending";
              row.archivePr = queue?.number;
              report.results.push(row);
              if (published) break;
              // Concurrency: a serialized archive queue must not hide other changes' acceptance requests.
              processed.push(candidate);
              continue;
            }
            const date = marker?.archive.match(/\/archive\/(\d{4}-\d{2}-\d{2})-/)?.[1] ?? new Date(now()).toISOString().slice(0, 10);
            const prepared = await prepare({ reader, tool, evidence, date, expectedArchive: marker?.archive ?? null });
            let recoveryCandidate = null;
            if (!existing && marker) {
              await reader.ancestor(marker.targetSha, evidence.targetSha);
              recoveryCandidate = await prepare({ reader, tool, evidence: { ...evidence, targetSha: marker.targetSha,
                validation: { ...evidence.validation, runId: marker.validationRunId } }, date, expectedArchive: marker.archive });
            }
            if (dryRun) {
              row.disposition = existing?.state === "open" ? "pending" : "eligible";
              if (existing) row.archivePr = existing.number;
            } else {
              publisher = await getPublisher();
              const result = await publish({ reader, publisher, evidence, candidate: prepared, recoveryCandidate, existing, retryClosed });
              Object.assign(row, result);
              published = true;
              queue = { number: result.archivePr };
              const runs = await reader.pages(`/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${result.generatedHead ?? existing?.head.sha}`, 100, "workflow_runs");
              const run = runs.filter(item => item.head_sha === (result.generatedHead ?? existing?.head.sha)).sort((a, b) => b.run_number - a.run_number)[0];
              row.validation = !run ? "not-yet-observed" : run.conclusion ?? run.status;
              if (run?.status === "completed" && run.conclusion !== "success") {
                row.disposition = "accepted-archive-blocked";
                row.reason = "archive-validation-failed";
              }
            }
          }
        }
      } catch (error) {
        const provenance = ["acceptance-manual-authority", "acceptance-merge-provenance", "acceptance-not-merged"]
          .includes(error.archiveCode);
        if (provenance && error.archiveChange) row.disposition = "invalid-provenance";
        else if (row.accepted) row.disposition = "accepted-archive-blocked";
        row.reason = error.archiveCode ?? "internal-error";
        if (error.archiveChange) row.change = error.archiveChange;
        if (error.archiveDetail && /^[a-zA-Z0-9,./-]{1,256}$/.test(error.archiveDetail)) row.detail = error.archiveDetail;
      }
      report.results.push(row);
      processed.push(candidate);
      if (!dryRun && row.change && row.deliveryVersion !== 3) {
        try {
          const reporter = await getPublisher();
          await updateArchiveComment(reader, reporter, row);
          if (row.acceptancePr) await updateAcceptanceComment(reader, reporter, row);
        } catch (error) { row.reporting = error.archiveCode ?? "publication-report-failed"; }
      }
    }
    if (scan) {
      report.checkpoint = advanceArchiveCheckpoint(checkpoint, scan, processed);
      report.coverage.complete = scan.complete && processed.length === candidates.length;
    }
    return report;
  } finally { if (publisher) await publisher.close(); }
}

async function updateArchiveComment(reader, publisher, row) {
  const marker = "<!-- openspec-archive-status-v1 -->";
  const comments = await reader.pages(`/issues/${row.pr}/comments`);
  const owned = comments.filter(comment => comment.user?.login === publisher.actor && comment.body?.startsWith(marker));
  if (owned.length > 1) throw archiveFailure("archive-comment-ambiguous");
  const body = `${marker}\nArchive status: **${row.disposition}**${row.reason ? ` (${row.reason})` : ""}.`
    + `${row.detail ? ` Blocking item: ${row.detail}.` : ""}${row.archivePr ? ` Archive PR: #${row.archivePr}.` : ""}`
    + `${row.acceptancePr ? ` Acceptance PR: #${row.acceptancePr}.` : ""}`
    + `${row.blockers?.length ? ` Pending evidence: ${row.blockers.join(", ")}.` : ""}`
    + (row.disposition === "awaiting-manual-acceptance-merge" ? "\nReview the exact acceptance record and manually merge its PR after current-head CI. Never enable its auto-merge."
      : row.disposition === "awaiting-evidence" ? "\nRecord actual missing outcomes and reconcile those exact tasks in the acceptance PR, then mark it ready. No new proposal is needed."
        : "\nMissing acceptance or unfinished work must be reconciled by a maintainer; automation never invents completion.");
  if (owned[0]?.body === body) return;
  await publisher.mutate(owned[0] ? `${reader.prefix}/issues/comments/${owned[0].id}` : `${reader.prefix}/issues/${row.pr}/comments`,
    owned[0] ? "PATCH" : "POST", { body });
}

async function updateAcceptanceComment(reader, publisher, row) {
  const marker = "<!-- openspec-acceptance-status-v1 -->";
  const comments = await reader.pages(`/issues/${row.acceptancePr}/comments`);
  const owned = comments.filter(comment => comment.user?.login === publisher.actor && comment.body?.startsWith(marker));
  if (owned.length > 1) throw archiveFailure("acceptance-comment-ambiguous");
  const body = `${marker}\nAcceptance status for implementation #${row.pr}: **${row.disposition}**${row.reason ? ` (${row.reason})` : ""}.`
    + `${row.blockers?.length ? ` Pending evidence: ${row.blockers.join(", ")}.` : ""}`
    + (row.disposition === "awaiting-manual-acceptance-merge"
      ? "\nReview the current committed record and current-head checks, then merge this PR manually. Merging records acceptance; auto-merge is forbidden."
      : row.disposition === "awaiting-evidence"
        ? "\nUpdate this same PR with actual evidence for the exact pending tasks. Automation does not infer or fabricate completion."
        : row.disposition === "accepted-archive-blocked" ? "\nAcceptance is recorded; follow the linked archive blocker."
          : "\nSee the implementation status for the next archive action.");
  if (owned[0]?.body === body) return;
  await publisher.mutate(owned[0] ? `${reader.prefix}/issues/comments/${owned[0].id}` : `${reader.prefix}/issues/${row.acceptancePr}/comments`,
    owned[0] ? "PATCH" : "POST", { body });
}

export async function validateArchiveCandidate(reader, tool, number) {
  const pull = await reader.get(`${reader.prefix}/pulls/${number}`);
  const marker = readArchiveMarker(pull.body);
  const headCommit = await reader.get(`${reader.prefix}/git/commits/${pull.head.sha}`);
  const committedMarker = readArchiveMarker(headCommit.message);
  if (!marker && !committedMarker) return { disposition: "not-generated" };
  if (!marker || !committedMarker) throw archiveFailure("archive-candidate-identity");
  const { generatedHead, ...declaredMarker } = marker;
  if (generatedHead !== pull.head.sha || JSON.stringify(committedMarker) !== JSON.stringify(declaredMarker)) throw archiveFailure("archive-candidate-identity");
  if (pull.base?.ref !== "develop" || pull.head?.repo?.full_name !== reader.repository
    || marker.generatedHead !== pull.head.sha || !SHA.test(pull.merge_commit_sha ?? "")) throw archiveFailure("archive-candidate-identity");
  const evidence = await loadArchiveEvidence(reader, marker.sourcePr);
  if (evidence.disposition !== "eligible" || evidence.pull.head.sha !== marker.sourceHead
    || evidence.pull.merge_commit_sha !== marker.sourceMerge || evidence.targetSha !== marker.targetSha) throw archiveFailure("archive-candidate-stale");
  const merged = await reader.get(`${reader.prefix}/git/commits/${pull.merge_commit_sha}`);
  if (merged.parents?.length !== 2 || merged.parents[0]?.sha !== evidence.targetSha
    || merged.parents[1]?.sha !== pull.head.sha) throw archiveFailure("archive-merge-result-stale");
  const date = marker.archive.match(/\/archive\/(\d{4}-\d{2}-\d{2})-/)?.[1];
  const candidate = await prepareArchive({ reader, evidence, tool, date, expectedArchive: marker.archive });
  const files = await reader.pages(`/pulls/${number}/files`, 3000);
  if (files.length !== pull.changed_files) throw archiveFailure("archive-diff-incomplete");
  assertArchiveDiff(files, candidate.paths);
  const base = await snapshotOpenSpec(reader, evidence.targetSha);
  const result = await snapshotOpenSpec(reader, pull.merge_commit_sha);
  const expected = new Map(base.entries);
  for (const file of candidate.changes) {
    if (file.data === null) expected.delete(file.filename);
    else expected.set(file.filename, createHash("sha1").update(`blob ${file.data.length}\0`).update(file.data).digest("hex"));
  }
  if (expected.size !== result.entries.size || [...expected].some(([path, sha]) => result.entries.get(path) !== sha)) {
    throw archiveFailure("archive-merge-result-mismatch");
  }
  return { disposition: "validated", archivePr: number, headSha: pull.head.sha, baseSha: evidence.targetSha };
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    "dry-run": { type: "boolean" }, publish: { type: "boolean" }, pr: { type: "string" },
    "retry-closed": { type: "boolean" }, "discover-checkpoint": { type: "boolean" }, "validate-candidate": { type: "boolean" },
    "tool-root": { type: "string" }, "validate-acceptance": { type: "boolean" },
  } });
  if (values.publish && values["dry-run"]) throw archiveFailure("mode-conflict");
  if (values["tool-root"] !== undefined && (!values["validate-candidate"] || !values["tool-root"])) throw archiveFailure("tool-root-mode");
  const dryRun = !values.publish;
  const deadline = Date.now() + 9 * 60 * 1000;
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const definition = JSON.parse(await readFile(resolve(root, "config/github-repository-governance.json"), "utf8"));
  const repository = process.env.GITHUB_REPOSITORY ?? definition.repository;
  if (repository !== definition.repository) throw archiveFailure("repository-identity");
  const reader = createArchiveReader({ repository, token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN, deadline });
  if (values["discover-checkpoint"]) {
    let run = null;
    try { run = await discoverArchiveCheckpoint(reader); }
    catch (error) { if (error.archiveCode !== "github-not-found") throw error; }
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `checkpoint_run=${run ?? ""}\n`);
    return { checkpointRun: run };
  }
  const pr = values.pr === undefined ? null : Number(values.pr);
  if (pr !== null && (!/^\d+$/.test(values.pr) || !Number.isSafeInteger(pr) || pr < 1)) throw archiveFailure("implementation-pr");
  if (!dryRun && (process.env.GITHUB_ACTIONS !== "true" || !["pull_request_target", "workflow_dispatch", "schedule"].includes(process.env.GITHUB_EVENT_NAME))) {
    throw archiveFailure("trusted-workflow-required");
  }
  if (values["retry-closed"]) {
    if (process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" || pr === null) throw archiveFailure("retry-authorization");
    const actor = process.env.GITHUB_ACTOR;
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(actor ?? "")) throw archiveFailure("retry-authorization");
    const permission = await reader.get(`${reader.prefix}/collaborators/${actor}/permission`);
    if (!["write", "maintain", "admin"].includes(permission.permission)) throw archiveFailure("retry-authorization");
  }
  if (values["validate-acceptance"]) {
    if (pr === null || values.publish || values["retry-closed"] || values["validate-candidate"] || values["tool-root"]) throw archiveFailure("candidate-validation-mode");
    return await validateAcceptanceCandidate(reader, pr);
  }
  if (values["validate-candidate"]) {
    if (pr === null || values.publish || values["retry-closed"]) throw archiveFailure("candidate-validation-mode");
    const tool = await loadArchiveTool(resolve(values["tool-root"] ?? resolve(root, "node_modules/@fission-ai/openspec")), { deadline });
    return await validateArchiveCandidate(reader, tool, pr);
  }
  const output = resolve(root, ".artifacts/openspec-archive");
  let checkpoint = newArchiveCheckpoint();
  let checkpointSource = "fresh-no-retained-cursor";
  if (pr === null) {
    try {
      checkpoint = validateArchiveCheckpoint(JSON.parse(await readFile(resolve(output, "restored/checkpoint.json"), "utf8")));
      checkpointSource = "restored";
    } catch (error) {
      if (error.code !== "ENOENT" && error.archiveCode !== "scan-checkpoint" && !(error instanceof SyntaxError)) throw error;
      checkpointSource = error.code === "ENOENT" ? "fresh-no-retained-cursor" : "fresh-invalid-cursor";
    }
  }
  const tool = await loadArchiveTool(resolve(root, "node_modules/@fission-ai/openspec"), { deadline });
  const report = await reconcileArchives({ reader, tool, dryRun, pr, retryClosed: Boolean(values["retry-closed"]), checkpoint,
    publisherFactory: () => createArchivePublisher({ repository, appId: process.env.OPENSPEC_ARCHIVE_APP_ID,
      privateKey: process.env.OPENSPEC_ARCHIVE_APP_PRIVATE_KEY, deadline }) });
  report.checkpointSource = pr === null ? checkpointSource : "targeted-no-cursor";
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (!dryRun && pr === null) await writeFile(resolve(output, "checkpoint.json"), `${JSON.stringify(report.checkpoint ?? newArchiveCheckpoint(), null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [`## OpenSpec archive ${dryRun ? "audit" : "reconciliation"}`,
      `Coverage: ${JSON.stringify(report.coverage)}; cursor: ${report.checkpointSource}.`, "", ...report.results.map(row =>
      `- PR #${row.pr}: ${row.disposition}${row.reason ? ` (${row.reason})` : ""}${row.detail ? `: ${row.detail}` : ""}${row.acceptancePr ? `; acceptance #${row.acceptancePr}` : ""}${row.blockers?.length ? `; pending ${row.blockers.join(", ")}` : ""}${row.archivePr ? `; archive #${row.archivePr}` : ""}`)];
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(value => console.log(JSON.stringify(value, null, 2))).catch(error => {
    console.error(`OpenSpec archive blocked: ${error.archiveCode ?? "internal-error"}`);
    process.exitCode = 1;
  });
}
