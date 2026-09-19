/**
 * The pure parts of a nightly regression triage: which validation commands failed on which lanes,
 * a bounded excerpt of the failing test output, the draft pull-request body in the repository's
 * OpenSpec layout, and the OpenSpec scaffold of the fix change. `propose-regression-fix.mjs`
 * gathers the run's evidence through `gh` and `git` and feeds it in; nothing here touches the
 * filesystem or the network.
 */

// Invariant: only these workflows propose a fix, keyed by the name GitHub reports for the run.
export const TRIAGE_WORKFLOWS = Object.freeze({
  "Full regression": Object.freeze({ file: "full-regression.yml", scheduledOnly: false }),
  Release: Object.freeze({ file: "release.yml", scheduledOnly: true }),
});

export const BRANCH_PREFIX = "fix/nightly-regression-";
/** The only branch whose failed runs open or refresh a candidate; a run on any other branch is that branch's own evidence. */
export const TRIAGED_BRANCH = "develop";
export const TRIAGE_KEY_LABEL = "Triage key:";
/** Bounds of one failure's log excerpt in the body; the run link carries the rest. */
export const EXCERPT_LINE_LIMIT = 40;
export const EXCERPT_BYTE_LIMIT = 2048;

const RESULT_SCHEMA = "a1-validation-outcomes-v1";
// Rationale: Vitest's default reporter, Node's assertion output, npm, and the repository gates name
// what failed and why in these lines. A match also keeps the next few lines, where the detail usually is.
const EXCERPT_PATTERN = /(?:^|\s)(?:FAIL\s|×|✗|\w*Error\b|ERR!|##\[error\]|\bfailed\b|expected|received|Test Files\s|Tests\s+\d|Snapshots\s|Unhandled|timed out|exceeded|budget)/;
const EXCERPT_CONTEXT_LINES = 4;
// Rationale: the tier summary JSON that follows a failure repeats the outcome record, which is evidence already.
const JSON_LINE = /^\s*(?:[{}[\]],?|"[^"]+":.*)$/;

export function changeId(date) {
  return `fix-nightly-regression-${date}`;
}

export function branchName(date) {
  return `${BRANCH_PREFIX}${date}`;
}

/** Decide whether a completed run should be triaged; the reason explains a `false` in the workflow summary. */
export function triageDecision(run) {
  const workflow = TRIAGE_WORKFLOWS[run.workflowName];
  if (!workflow) return { triage: false, reason: `workflow ${JSON.stringify(run.workflowName)} is not triaged` };
  // Rationale: a green run is still judged for a persistent startup-budget overrun; only a run that never
  // finished its measurements is ignored.
  if (!["failure", "success"].includes(run.conclusion)) return { triage: false, reason: `run ${run.id} concluded ${run.conclusion}, not failure or success` };
  if (workflow.scheduledOnly && run.event !== "schedule") return { triage: false, reason: `${run.workflowName} triages scheduled runs only; this run was ${run.event}` };
  // Rationale: a Full regression dispatched on a fix candidate's branch proves that candidate; opening
  // another candidate from its failures would fork the same work into a second pull request.
  if (run.headBranch !== TRIAGED_BRANCH) return { triage: false, reason: `run ${run.id} ran on ${JSON.stringify(run.headBranch)}, not ${TRIAGED_BRANCH}; its evidence belongs to that branch's own pull request` };
  return { triage: true, failed: run.conclusion === "failure", workflow: { name: run.workflowName, ...workflow } };
}

/** The scope and test the startup gate owns; a persistent overrun is proposed as this owner's failure. */
export const STARTUP_BUDGET_FAILURE = Object.freeze({ id: "startup-budget", scope: "package-startup", test: "test/foundation/release/package-startup.integration.test.ts" });

/** Turn a persistent trend into the failure shape the body and key already understand, with the trend table as its excerpt. */
export function startupBudgetFailure(trend, tableLines) {
  if (!trend.persistent.length) return null;
  const lanes = [...new Set(trend.persistent.map(entry => entry.lane))].map(lane => ({ id: lane, exitCode: 1, durationMs: 0, excerpt: tableLines }));
  return { id: STARTUP_BUDGET_FAILURE.id, command: `persistent startup-budget overrun across ${trend.window} consecutive develop runs`, scopes: [STARTUP_BUDGET_FAILURE.scope], tests: [STARTUP_BUDGET_FAILURE.test], lanes, preparation: null };
}

/** True when the JSON is a tier result written by `run-validation-tier.mjs --result`. */
export function isTierResult(value) {
  return value !== null && typeof value === "object" && value.schema === RESULT_SCHEMA && Array.isArray(value.outcomes);
}

/** The test paths a validation command names positively; `--exclude` operands are not what it runs. */
export function commandTests(command) {
  const tokens = String(command ?? "").split(/\s+/);
  const tests = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === "--exclude") { index += 1; continue; }
    if (/^test\/\S+\.tsx?$/.test(tokens[index])) tests.push(tokens[index]);
  }
  return tests;
}

/**
 * Merge the lanes of one run into failures keyed by command id, each naming every lane it failed
 * on; lanes that failed without producing a tier result become orchestration failures.
 */
export function summarizeLanes(lanes) {
  const byId = new Map();
  const orchestration = [];
  for (const lane of lanes) {
    if (!isTierResult(lane.result)) {
      if (lane.conclusion === "failure") orchestration.push({ lane: lane.id, job: lane.job, excerpt: lane.excerpt ?? [] });
      continue;
    }
    for (const outcome of lane.result.outcomes) {
      if (outcome.exitCode === 0 || outcome.skipped) continue;
      const failure = byId.get(outcome.id) ?? { id: outcome.id, command: outcome.command, scopes: [...new Set(outcome.scopes ?? [])].sort(), tests: commandTests(outcome.command), lanes: [], preparation: outcome.preparation ?? null };
      failure.lanes.push({ id: lane.id, exitCode: outcome.exitCode, durationMs: outcome.durationMs, excerpt: lane.excerpt ?? [] });
      byId.set(outcome.id, failure);
    }
  }
  return { failures: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)), orchestration };
}

/** Same workflow and same failed scope set means the same open candidate is refreshed, not duplicated. */
export function triageKey(workflowFile, summary) {
  const scopes = [...new Set(summary.failures.flatMap(failure => failure.scopes.length ? failure.scopes : [failure.id]))].sort();
  if (summary.orchestration.length) scopes.push("orchestration");
  return `${workflowFile}:${scopes.join(",")}`;
}

export function parseTriageKey(body) {
  const match = new RegExp(`^- ${TRIAGE_KEY_LABEL} \`([^\`\\n]+)\`\\s*$`, "m").exec(String(body ?? "").replaceAll("\r\n", "\n"));
  return match ? match[1] : null;
}

/**
 * Group `gh run view --log-failed` output by job and keep only the lines that say what failed.
 * Each line is `<job>\t<step>\t<timestamp> <message>`; timestamps and step names are dropped.
 */
export function extractLogExcerpts(log, { lineLimit = EXCERPT_LINE_LIMIT, byteLimit = EXCERPT_BYTE_LIMIT } = {}) {
  const byJob = new Map();
  const context = new Map();
  for (const raw of String(log ?? "").replaceAll("\r\n", "\n").split("\n")) {
    const parts = raw.split("\t");
    if (parts.length < 3) continue;
    const job = parts[0];
    const message = parts.slice(2).join("\t").replace(/^\S+T\S+Z\s?/, "").replace(/\u001b\[[0-9;]*m/g, "").trimEnd();
    if (!message.trim() || JSON_LINE.test(message)) continue;
    const matched = EXCERPT_PATTERN.test(message);
    const remaining = context.get(job) ?? 0;
    if (!matched && remaining === 0) continue;
    context.set(job, matched ? EXCERPT_CONTEXT_LINES : remaining - 1);
    const lines = byJob.get(job) ?? [];
    lines.push(message.length > 300 ? `${message.slice(0, 297)}...` : message);
    byJob.set(job, lines);
  }
  for (const [job, lines] of byJob) byJob.set(job, bound(lines, lineLimit, byteLimit));
  return byJob;
}

function bound(lines, lineLimit, byteLimit) {
  const kept = [];
  let bytes = 0;
  for (const line of lines) {
    const size = Buffer.byteLength(line) + 1;
    if (kept.length >= lineLimit || bytes + size > byteLimit) { kept.push(`... ${lines.length - kept.length} more lines in the run log`); break; }
    kept.push(line);
    bytes += size;
  }
  return kept;
}

function laneList(lanes) {
  return lanes.map(lane => lane.id).join(", ");
}

function excerptBlock(lines, indent = "  ") {
  if (!lines.length) return [`${indent}- Log excerpt: none matched; read the run log.`];
  return [`${indent}- Log excerpt:`, "", `${indent}  \`\`\`text`, ...lines.map(line => `${indent}  ${line}`), `${indent}  \`\`\``, ""];
}

/** The evidence bullets of one run; a refresh appends the same shape under the existing ones. */
export function renderRunEvidence({ workflow, run, summary, lastGreen, commits }) {
  const lines = [
    `- Run [${workflow.name} #${run.number ?? run.id}](${run.url}) (attempt ${run.attempt}, ${run.event}) on \`${run.headSha.slice(0, 7)}\` at ${run.createdAt}:`,
  ];
  for (const failure of summary.failures) {
    const scopes = failure.scopes.length ? failure.scopes.map(scope => `\`${scope}\``).join(", ") : "no declared scope";
    lines.push(`  - \`${failure.id}\` (${scopes}) failed on ${laneList(failure.lanes)} with exit ${[...new Set(failure.lanes.map(lane => lane.exitCode))].join("/")}${failure.preparation ? `; preparation: ${failure.preparation}` : ""}.`);
    if (failure.tests.length) lines.push(`    - Tests: ${failure.tests.slice(0, 12).map(test => `\`${test}\``).join(", ")}${failure.tests.length > 12 ? `, and ${failure.tests.length - 12} more` : ""}`);
    else lines.push(`    - Command: \`${failure.command.length > 200 ? `${failure.command.slice(0, 197)}...` : failure.command}\``);
    const excerpt = failure.lanes.find(lane => lane.excerpt.length)?.excerpt ?? [];
    lines.push(...excerptBlock(excerpt, "    "));
  }
  for (const item of summary.orchestration) {
    lines.push(`  - Lane ${item.lane} failed in job \`${item.job}\` before producing owner outcomes (orchestration failure).`);
    lines.push(...excerptBlock(item.excerpt, "    "));
  }
  if (lastGreen) {
    lines.push(`  - Last successful ${workflow.name} run: [#${lastGreen.number ?? lastGreen.id}](${lastGreen.url}) on \`${lastGreen.headSha.slice(0, 7)}\`; ${commits.length} \`develop\` ${commits.length === 1 ? "commit" : "commits"} since:`);
    for (const commit of commits.slice(0, 30)) lines.push(`    - \`${commit.sha.slice(0, 7)}\` ${commit.subject}`);
    if (commits.length > 30) lines.push(`    - ... ${commits.length - 30} more`);
  } else {
    lines.push(`  - No successful ${workflow.name} run is retained on \`develop\`; the suspect range is unbounded, start from the failed head.`);
  }
  return lines;
}

/** Render the draft pull-request body in the repository's OpenSpec layout; nothing may follow the details block. */
export function renderTriageBody({ workflow, run, date, summary, lastGreen, commits, key }) {
  const scopes = [...new Set(summary.failures.flatMap(failure => failure.scopes))];
  const what = summary.failures.length
    ? `${summary.failures.length} validation ${summary.failures.length === 1 ? "command" : "commands"} (${scopes.slice(0, 6).map(scope => `\`${scope}\``).join(", ")}${scopes.length > 6 ? ", ..." : ""})`
    : `${summary.orchestration.length} ${summary.orchestration.length === 1 ? "lane" : "lanes"} before any owner ran`;
  const lines = [
    "## Proposal",
    "",
    `Fix the ${workflow.name} failure of ${date} on \`develop\` at \`${run.headSha.slice(0, 7)}\`, where ${what} failed; this draft was opened by the nightly triage with the evidence below so the fix starts scoped.`,
    "",
    "## Implementation",
    "",
    `- ${TRIAGE_KEY_LABEL} \`${key}\``,
    "- Reproduce the failure from the listed tests or commands on the failed lane, fix the cause without weakening assertions, budgets, or coverage, and prove it with a dispatched Full regression of the fix head recorded in the change's design evidence.",
    ...renderRunEvidence({ workflow, run, summary, lastGreen, commits }),
    "",
    "## Automation",
    "",
    "<details>",
    "<summary>Used by CI to link this PR to its OpenSpec change</summary>",
    "",
    "```openspec-implementation",
    JSON.stringify({ version: 3, change: changeId(date) }, null, 2),
    "```",
    "",
    "</details>",
  ];
  return `${lines.join("\n")}\n`;
}

/** Append another run's evidence to an existing candidate body, before its `## Automation` section. */
export function appendRunToBody(body, evidence) {
  const normalized = String(body).replaceAll("\r\n", "\n");
  const marker = "\n## Automation\n";
  const index = normalized.indexOf(marker);
  if (index === -1) throw new Error("existing triage body has no Automation section");
  const head = normalized.slice(0, index).trimEnd();
  return `${head}\n${renderRunEvidence(evidence).join("\n")}\n${normalized.slice(index)}`;
}

/** The OpenSpec change files of the fix; no spec delta, because the automation cannot know which capability the fix touches. */
export function renderTriageChange({ workflow, run, date, summary, lastGreen, commits }) {
  const id = changeId(date);
  const failed = summary.failures.map(failure => `\`${failure.id}\` (${failure.scopes.join(", ") || "no declared scope"}) on ${laneList(failure.lanes)}`);
  const orchestration = summary.orchestration.map(item => `lane ${item.lane} in job \`${item.job}\``);
  return {
    // Rationale: strict validation and finalization both need a delta or an explicit skip; the fixer drops the skip when a delta is added.
    [`openspec/changes/${id}/.openspec.yaml`]: `schema: spec-driven\ncreated: ${date}\nskip_specs: true\n`,
    [`openspec/changes/${id}/proposal.md`]: [
      "## Why",
      "",
      `The ${workflow.name} run of ${date} failed on \`develop\` at \`${run.headSha.slice(0, 7)}\` (${run.url}). ${failed.length ? `Failed: ${failed.join("; ")}.` : ""}${orchestration.length ? ` Orchestration failures: ${orchestration.join("; ")}.` : ""} The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.`,
      "",
      "## What Changes",
      "",
      "- Reproduce the failure on the failed lane from the listed tests or commands and identify the introducing change among the suspect commits.",
      "- Fix the cause without weakening assertions, budgets, timeouts, or coverage, and add regression evidence where the failure exposed a gap.",
      "",
      "## Capabilities",
      "",
      "### New Capabilities",
      "",
      "None.",
      "",
      "### Modified Capabilities",
      "",
      "None identified yet. When the cause is known and the fix changes a requirement, add the delta under `specs/<capability>/spec.md` and remove `skip_specs: true` from `.openspec.yaml`; when the fix changes no requirement, leave both as scaffolded.",
      "",
      "## Impact",
      "",
      `Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the \`develop\` commits since the last successful run${lastGreen ? ` (${commits.length} since \`${lastGreen.headSha.slice(0, 7)}\`)` : " (no retained successful run)"}.`,
      "",
    ].join("\n"),
    [`openspec/changes/${id}/design.md`]: [
      "## Context",
      "",
      "Opened by the nightly regression triage from the failed run's evidence artifacts and logs; the triage re-ran nothing and edited nothing on `develop`. Every later failure with the same failed scope set appends its run below while this change is open.",
      "",
      "## Decisions",
      "",
      "- To be written by the maintainer once the cause is known: what failed, why, and the smallest change that fixes it without reducing validation.",
      "",
      "## Evidence",
      "",
      ...renderRunEvidence({ workflow, run, summary, lastGreen, commits }),
      "",
    ].join("\n"),
    [`openspec/changes/${id}/tasks.md`]: [
      "## 1. Reproduce",
      "",
      "- [ ] 1.1 Reproduce the failure locally or on a dispatched Full regression of the failed head and record the exact failing test or command.",
      "- [ ] 1.2 Identify the introducing commit among the suspect range, or record that the failure is environmental.",
      "",
      "## 2. Fix",
      "",
      "- [ ] 2.1 Fix the cause without weakening assertions, budgets, timeouts, or coverage.",
      "- [ ] 2.2 Add or adjust regression evidence where the failure exposed a gap.",
      "",
      "## 3. Prove",
      "",
      "- [ ] 3.1 Dispatch `gh workflow run full-regression.yml --ref <this branch>` on the completed fix head, wait for it, and record the run number and head under Evidence in design.md; the failed owners pass on the failed lane.",
      "",
    ].join("\n"),
  };
}

/** Append another run's evidence to the scaffold's design document. */
export function appendRunToDesign(design, evidence) {
  return `${String(design).replaceAll("\r\n", "\n").trimEnd()}\n${renderRunEvidence(evidence).join("\n")}\n`;
}
