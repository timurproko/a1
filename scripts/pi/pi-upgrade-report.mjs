/**
 * The pure parts of a proposed Pi upgrade: the pull-request body that lists what the upgrade
 * script did and what a reviewer must decide, the marker-bounded report inside it that a re-run
 * refreshes without touching the reviewer's sections, the comment a re-run posts when it may not
 * push, and the OpenSpec scaffold that lets the proposal be finalized like any other change.
 * `propose-pi-upgrade.mjs` runs the steps and feeds their outcomes in; nothing here touches the
 * filesystem or the network.
 */

// Invariant: steps run in this order; each records passed, failed, blocked, or skipped with a bounded detail.
export const UPGRADE_STEPS = Object.freeze([
  "bump", "evaluator", "install", "build", "merge", "ledger", "inventories", "public-api", "matrix", "startup-graph", "parity", "typecheck", "architecture", "engine-conformance", "parity-suites",
]);

/** The steps a refresh re-runs on an existing proposal branch: everything derived, nothing that bumps, evaluates, or merges. */
export const REFRESH_STEPS = Object.freeze(UPGRADE_STEPS.filter(name => !["bump", "evaluator", "install", "merge"].includes(name)));

/** The gates that compile the tree and are therefore blocked while conflict markers remain in a copy. */
export const MARKER_BLOCKED_STEPS = Object.freeze(["startup-graph", "parity", "typecheck", "architecture", "parity-suites"]);

export const REPORT_START = "<!-- pi-upgrade-report -->";
export const REPORT_END = "<!-- /pi-upgrade-report -->";

export function changeId(version) {
  return `pi-upgrade-${version.replace(/[^0-9A-Za-z]+/g, "-")}`;
}

export function branchName(version) {
  return `chore/pi-${version}`;
}

/** The version a proposal branch names, or null when the branch is not a proposal. */
export function branchVersion(branch) {
  const match = /^chore\/pi-(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(branch ?? "");
  return match === null ? null : match[1];
}

/** Render the draft pull-request body in the repository's OpenSpec layout; nothing may follow the details block. */
export function renderUpgradeBody(report) {
  const { previous, version, commit, changelog } = report;
  const lines = [
    "## Proposal",
    "",
    proposalSentence(report),
    "",
    "## Implementation",
    "",
    `- Version delta: \`@earendil-works/pi-coding-agent\` and \`@earendil-works/pi-tui\` ${previous.version} -> ${version}; upstream commit ${commit ?? "unresolved (pass --commit to the sync)"}.`,
    ...(changelog ? ["- Upstream changelog excerpt:", "", ...changelog.split("\n").map(line => `  > ${line}`), ""] : []),
    ...renderUpgradeReport(report).split("\n"),
    "",
    "## Automation",
    "",
    "<details>",
    "<summary>Used by CI to link this PR to its OpenSpec change</summary>",
    "",
    "```openspec-implementation",
    JSON.stringify({ version: 3, change: changeId(version) }, null, 2),
    "```",
    "",
    "</details>",
  ];
  return `${lines.join("\n")}\n`;
}

/** The marker-bounded report: every derived verdict and review item, and nothing a reviewer writes by hand. */
export function renderUpgradeReport(report) {
  const { steps, merge, inventories, publicApi, features, compile, reviewItems, mode, refreshedAt } = report;
  const kept = merge.kept ?? [];
  const lines = [
    REPORT_START,
    ...(mode === "refresh" ? [`- Refreshed ${refreshedAt ?? "by a re-run"} on the proposal branch head; the merge and evaluation verdicts are from the original proposal.`] : []),
    `- Vendored copies: ${merge.clean.length} merged cleanly${merge.clean.length === 0 ? "" : ` (${merge.clean.join(", ")})`}; ${merge.conflicted.length} with conflict markers to resolve${merge.conflicted.length === 0 ? "" : ` (${merge.conflicted.join(", ")})`}; ${merge.unchanged.length} unchanged upstream; ${kept.length} kept as A1's version${kept.length === 0 ? "" : ` (${kept.map(copy => `${copy.path}: upstream changed, A1 version kept, ${copy.lines} delta lines`).join("; ")})`}.`,
    `- Inventories: ${inventories.reanchored.length} anchors rewritten, ${inventories.moved.length} behavior ranges moved, ${inventories.orphaned.length} entries orphaned${inventories.orphaned.length === 0 ? "" : ` (${inventories.orphaned.join(", ")})`}, ${inventories.unmapped.length} components unmapped${inventories.unmapped.length === 0 ? "" : ` (${inventories.unmapped.join(", ")})`}.`,
    ...renderPublicApi(publicApi),
    ...renderFeatures(features),
    ...renderCompile(compile),
    "- Automated gates:",
    ...steps.map(step => `  - ${gateLabel(step.status)} ${step.name}${step.detail ? `: ${step.detail}` : ""}`),
    ...(reviewItems.length === 0 ? [] : ["- Review items:", ...reviewItems.map(item => `  - ${item}`)]),
    REPORT_END,
  ];
  return lines.join("\n");
}

/**
 * Rewrite only the report between the markers of an existing body; a body without markers (one
 * written before the markers existed, or rewritten by hand) is replaced whole.
 */
export function refreshUpgradeBody(existingBody, report) {
  const body = String(existingBody ?? "");
  const start = body.indexOf(REPORT_START);
  const end = body.indexOf(REPORT_END, start + REPORT_START.length);
  if (start === -1 || end === -1) return renderUpgradeBody(report);
  return `${body.slice(0, start)}${renderUpgradeReport(report)}${body.slice(end + REPORT_END.length)}`;
}

/** The comment a re-run posts when the branch carries commits the sync did not author. */
export function renderUpgradeComment(report, { date }) {
  const { version, previous } = report;
  return [
    `### Pi ${version} sync report (${date})`,
    "",
    `The nightly sync re-ran against Pi ${version} (pin ${previous.version}) and did not push: this branch carries commits the sync did not author. Fresh verdicts follow; the report in the description was refreshed between its markers.`,
    "",
    renderUpgradeReport(report),
    "",
  ].join("\n");
}

function proposalSentence(report) {
  const { previous, version, commit, steps } = report;
  const failed = steps.filter(step => step.status === "failed");
  const blocked = steps.filter(step => step.status === "blocked");
  const verdict = failed.length === 0 && blocked.length === 0
    ? "Every automated gate passed; review the diff and the items below."
    : `${failed.length} automated ${failed.length === 1 ? "gate" : "gates"} failed${failed.length === 0 ? "" : ` (${failed.map(step => step.name).join(", ")})`}${blocked.length === 0 ? "" : ` and ${blocked.length} ${blocked.length === 1 ? "is" : "are"} blocked by conflict markers (${blocked.map(step => step.name).join(", ")})`}; this upgrade needs design work before it can be accepted.`;
  return `Upgrade the pinned Pi packages from ${previous.version} (${previous.commit.slice(0, 7)}) to ${version} (${commit ? commit.slice(0, 7) : "commit unresolved"}), with the vendored copies, the source ledger, the inventories, the public API and feature baselines, and the parity evidence refreshed by the nightly upstream sync. ${verdict}`;
}

function renderPublicApi(publicApi) {
  if (!publicApi) return ["- Public API: not compared (the public-api step did not run)."];
  const consumed = records => records.filter(record => record.consumers.length > 0);
  const lines = [
    `- Public API: ${publicApi.added.length} exports added, ${publicApi.removed.length} removed (${consumed(publicApi.removed).length} consumed by A1), ${publicApi.changed.length} changed (${consumed(publicApi.changed).length} consumed by A1).`,
  ];
  for (const record of consumed(publicApi.removed)) lines.push(`  - removed ${record.kind} \`${record.name}\` (${record.package}); consumers: ${record.consumers.join(", ")}`);
  for (const record of consumed(publicApi.changed)) lines.push(`  - changed ${record.kind} \`${record.name}\` (${record.package}); consumers: ${record.consumers.join(", ")}`);
  const unconsumed = [...publicApi.removed, ...publicApi.changed].filter(record => record.consumers.length === 0);
  if (unconsumed.length > 0) lines.push(`  - not consumed by A1: ${unconsumed.map(record => record.name).join(", ")}`);
  return lines;
}

function renderFeatures(features) {
  if (!features) return ["- New upstream features: not compared (the matrix step did not run)."];
  const lines = [`- New upstream features awaiting an A1 disposition: ${features.created.length}; rows retired upstream: ${features.retired.length}; rows still pending: ${features.pending.length}.`];
  for (const row of features.created) lines.push(`  - ${row.id}: ${row.feature}${row.summary ? ` — ${row.summary}` : ""}`);
  return lines;
}

function renderCompile(compile) {
  if (!compile || compile.length === 0) return [];
  const total = compile.reduce((sum, file) => sum + file.errors, 0);
  return [
    `- Candidate compile: ${total} ${total === 1 ? "error" : "errors"} in ${compile.length} ${compile.length === 1 ? "file" : "files"} (complete output in the proposal artifact):`,
    ...compile.map(file => `  - ${file.path}: ${file.errors} ${file.errors === 1 ? "error" : "errors"} (${file.codes.join(", ")}) ${file.first}`),
  ];
}

function gateLabel(status) {
  switch (status) {
    case "passed": return "pass";
    case "failed": return "FAIL";
    case "blocked": return "BLOCKED";
    case "skipped": return "skip";
    default: return String(status);
  }
}

/**
 * The OpenSpec change files for the upgrade. The spec delta rewrites the pinned version and commit
 * in the requirement that names them and repeats its scenarios unchanged, as the delivery rules require.
 */
export function renderUpgradeChange({ previous, version, commit, foundationSpec, date }) {
  const requirement = "### Requirement: The owned shell presents the complete pinned Pi interactive UI";
  const start = foundationSpec.indexOf(requirement);
  if (start === -1) throw new Error("owned-pi-ui-foundation requirement naming the pin is missing");
  const next = foundationSpec.indexOf("\n### Requirement:", start + requirement.length);
  const block = foundationSpec.slice(start, next === -1 ? foundationSpec.length : next).trimEnd()
    .split(previous.version).join(version)
    .split(previous.commit).join(commit);
  const id = changeId(version);
  return {
    [`openspec/changes/${id}/.openspec.yaml`]: `schema: spec-driven\ncreated: ${date}\n`,
    [`openspec/changes/${id}/proposal.md`]: [
      "## Why",
      "",
      `Pi ${version} is published and A1 pins ${previous.version}. The nightly upstream sync proposed this upgrade with every derived artifact refreshed so the reviewer evaluates a diff, not a migration.`,
      "",
      "## What Changes",
      "",
      `- Pin \`@earendil-works/pi-coding-agent\` and \`@earendil-works/pi-tui\` at ${version} (upstream commit ${commit}).`,
      "- Re-merge the vendored copies that follow upstream with A1's recorded deviations, regenerate the source ledger and provenance headers, re-resolve the inventories, refresh the public API and feature adoption baselines, and refresh parity evidence.",
      "",
      "## Capabilities",
      "",
      "### New Capabilities",
      "",
      "None.",
      "",
      "### Modified Capabilities",
      "",
      `- \`owned-pi-ui-foundation\`: the pinned Pi identity moves to ${version}.`,
      "",
      "## Impact",
      "",
      "Recorded in the pull-request body: merge conflicts, kept copies with an upstream delta, orphaned or unmapped inventory entries, public API adoption items, pending feature rows, and failed or blocked gates are the review items; user-visible Pi behavior changes go to the changelog's breaking-changes section when this merges.",
      "",
    ].join("\n"),
    [`openspec/changes/${id}/design.md`]: [
      "# Design",
      "",
      "## Proposed by the sync, decided by a reviewer",
      "",
      "The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the pull-request body.",
      "",
    ].join("\n"),
    [`openspec/changes/${id}/tasks.md`]: [
      "## 1. Upgrade",
      "",
      `- [x] 1.1 Pin both Pi packages at ${version} and refresh the lockfile.`,
      "- [x] 1.2 Re-merge the vendored copies and regenerate the ledger, headers, inventories, baselines, and parity evidence.",
      "- [ ] 1.3 Resolve every conflict marker, orphaned entry, unmapped component, public API adoption item, and pending feature row listed in the pull request.",
      "",
      "## 2. Proof",
      "",
      "- [ ] 2.1 Every automated gate passes on the resolved head; record user-visible Pi behavior changes.",
      "",
    ].join("\n"),
    [`openspec/changes/${id}/specs/owned-pi-ui-foundation/spec.md`]: `## MODIFIED Requirements\n\n${block}\n`,
  };
}
