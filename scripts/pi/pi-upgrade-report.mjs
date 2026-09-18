/**
 * The pure parts of a proposed Pi upgrade: the pull-request body that lists what the upgrade
 * script did and what a reviewer must decide, and the OpenSpec scaffold that lets the proposal be
 * finalized like any other change. `propose-pi-upgrade.mjs` runs the steps and feeds their
 * outcomes in; nothing here touches the filesystem or the network.
 */

// Invariant: steps run in this order; each records passed or failed with a bounded detail.
export const UPGRADE_STEPS = Object.freeze([
  "bump", "evaluator", "install", "build", "merge", "ledger", "inventories", "parity", "typecheck", "architecture", "engine-conformance", "parity-suites",
]);

export function changeId(version) {
  return `pi-upgrade-${version.replace(/[^0-9A-Za-z]+/g, "-")}`;
}

export function branchName(version) {
  return `chore/pi-${version}`;
}

/** Render the draft pull-request body in the repository's OpenSpec layout; nothing may follow the details block. */
export function renderUpgradeBody(report) {
  const { previous, version, commit, steps, merge, inventories, changelog, reviewItems } = report;
  const failed = steps.filter(step => !step.passed);
  const lines = [
    "## Proposal",
    "",
    `Upgrade the pinned Pi packages from ${previous.version} (${previous.commit.slice(0, 7)}) to ${version} (${commit ? commit.slice(0, 7) : "commit unresolved"}), with the vendored copies, the source ledger, the inventories, and the parity evidence refreshed by the nightly upstream sync. ${failed.length === 0 ? "Every automated gate passed; review the diff and the items below." : `${failed.length} automated ${failed.length === 1 ? "gate" : "gates"} failed (${failed.map(step => step.name).join(", ")}); this upgrade needs design work before it can be accepted.`}`,
    "",
    "## Implementation",
    "",
    `- Version delta: \`@earendil-works/pi-coding-agent\` and \`@earendil-works/pi-tui\` ${previous.version} -> ${version}; upstream commit ${commit ?? "unresolved (pass --commit to the sync)"}.`,
    ...(changelog ? ["- Upstream changelog excerpt:", "", ...changelog.split("\n").map(line => `  > ${line}`), ""] : []),
    `- Vendored copies: ${merge.clean.length} merged cleanly${merge.clean.length === 0 ? "" : ` (${merge.clean.join(", ")})`}; ${merge.conflicted.length} with conflict markers to resolve${merge.conflicted.length === 0 ? "" : ` (${merge.conflicted.join(", ")})`}; ${merge.unchanged.length} unchanged upstream.`,
    `- Inventories: ${inventories.reanchored.length} anchors rewritten, ${inventories.moved.length} behavior ranges moved, ${inventories.orphaned.length} entries orphaned${inventories.orphaned.length === 0 ? "" : ` (${inventories.orphaned.join(", ")})`}, ${inventories.unmapped.length} components unmapped${inventories.unmapped.length === 0 ? "" : ` (${inventories.unmapped.join(", ")})`}.`,
    "- Automated gates:",
    ...steps.map(step => `  - ${step.passed ? "pass" : "FAIL"} ${step.name}${step.detail ? `: ${step.detail}` : ""}`),
    ...(reviewItems.length === 0 ? [] : ["- Review items:", ...reviewItems.map(item => `  - ${item}`)]),
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
      "- Re-merge the vendored copies with A1's recorded deviations, regenerate the source ledger and provenance headers, re-resolve the inventories, and refresh parity evidence.",
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
      "Recorded in the pull-request body: merge conflicts, orphaned or unmapped inventory entries, and failed gates are the review items; user-visible Pi behavior changes go to the changelog's breaking-changes section when this merges.",
      "",
    ].join("\n"),
    [`openspec/changes/${id}/design.md`]: [
      "# Design",
      "",
      "## Proposed by the sync, decided by a reviewer",
      "",
      "The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy (old upstream, new upstream, A1 copy), regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, and never merges; each of those is a review item in the pull-request body.",
      "",
    ].join("\n"),
    [`openspec/changes/${id}/tasks.md`]: [
      "## 1. Upgrade",
      "",
      `- [x] 1.1 Pin both Pi packages at ${version} and refresh the lockfile.`,
      "- [x] 1.2 Re-merge the vendored copies and regenerate the ledger, headers, inventories, and parity evidence.",
      "- [ ] 1.3 Resolve every conflict marker, orphaned entry, and unmapped component listed in the pull request.",
      "",
      "## 2. Proof",
      "",
      "- [ ] 2.1 Every automated gate passes on the resolved head; record user-visible Pi behavior changes.",
      "",
    ].join("\n"),
    [`openspec/changes/${id}/specs/owned-pi-ui-foundation/spec.md`]: `## MODIFIED Requirements\n\n${block}\n`,
  };
}
