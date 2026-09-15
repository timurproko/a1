import { createHash } from "node:crypto";
import { archiveFailure } from "./openspec-archive-policy.mjs";

export const MIN_ACCEPTANCE_CHECKS = 1;
export const MAX_ACCEPTANCE_CHECKS = 3;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_CHECK_BYTES = 300;
const genericChecks = [
  /^(?:review|check|verify|confirm)(?: the)?(?: linked)? (?:implementation )?(?:pull request|pr)\.?$/i,
  /^(?:review|check|verify|confirm)(?: that)? (?:the )?(?:required )?(?:ci|continuous integration)(?: checks?)? (?:passes|passed|is green|succeeded)\.?$/i,
  /^(?:confirm )?(?:there are )?no (?:known )?(?:blocking |unresolved )?(?:gaps|issues)\.?$/i,
  /^(?:approve|accept)(?: the)? (?:implementation|change|pull request|pr)?\.?$/i,
  /^(?:manually )?merge(?: this| the)? (?:acceptance )?(?:pull request|pr)?(?: to record acceptance)?\.?$/i,
  /^(?:confirm|verify)(?: the)? (?:openspec )?(?:requirements|specification|spec sync|synchronization)(?: are| is)? correct\.?$/i,
  /^(?:verify|confirm)(?: the)? implementation behaves as intended\.?$/i,
];

const normalizedBody = value => {
  if (typeof value !== "string" || Buffer.byteLength(value) > MAX_BODY_BYTES || value.replaceAll("\r\n", "").includes("\r")) {
    throw archiveFailure("acceptance-checklist-body");
  }
  return value.replaceAll("\r\n", "\n");
};
const normalizedCheck = value => value.normalize("NFKC").toLocaleLowerCase("en-US")
  .replaceAll(/[^\p{L}\p{N}]+/gu, " ").trim();
const checklistHash = checks => createHash("sha256").update(JSON.stringify(checks.map(normalizedCheck))).digest("hex");

export function assertAcceptanceScenarios(values) {
  if (!Array.isArray(values) || values.length < MIN_ACCEPTANCE_CHECKS || values.length > MAX_ACCEPTANCE_CHECKS) {
    throw archiveFailure("acceptance-checklist-count");
  }
  const normalized = new Set();
  for (const value of values) {
    if (typeof value !== "string" || value !== value.trim() || Buffer.byteLength(value) < 20 || Buffer.byteLength(value) > MAX_CHECK_BYTES
      || /[\r\n]/.test(value) || /^\[[ xX]\]\s/.test(value) || /^(?:#|>|```|~~~)/.test(value)
      || /<\/?[A-Za-z][^>]*>|https?:\/\/|@[A-Za-z0-9_-]+/.test(value)) throw archiveFailure("acceptance-checklist-item");
    const identity = normalizedCheck(value);
    if (!identity || normalized.has(identity)) throw archiveFailure("acceptance-checklist-duplicate");
    if (genericChecks.some(pattern => pattern.test(value))) throw archiveFailure("acceptance-checklist-generic");
    normalized.add(identity);
  }
  return [...values];
}

/** Extract the final reviewed handoff rather than deriving a robot list from source tasks. */
function parseAcceptanceSection(body, heading) {
  const lines = normalizedBody(body).split("\n");
  let fence = null;
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`).test(line)) fence = null;
      continue;
    }
    if (marker) { fence = { character: marker[0], length: marker.length }; continue; }
    if (line === `## ${heading}`) headings.push(index);
  }
  if (headings.length !== 1) throw archiveFailure(headings.length ? "acceptance-checklist-duplicate-section" : "acceptance-checklist-missing");
  const start = headings[0] + 1;
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index]) || lines[index] === "<details>") { end = index; break; }
  }
  const checks = [];
  for (const line of lines.slice(start, end)) {
    if (!line.trim()) continue;
    const item = /^- (\S.*)$/.exec(line);
    if (!item) throw archiveFailure("acceptance-checklist-section");
    checks.push(item[1]);
  }
  return assertAcceptanceScenarios(checks);
}

export function parseImplementationAcceptanceChecks(body) {
  return parseAcceptanceSection(body, "Acceptance checks");
}

function assertVersion3BodyLayout(body) {
  const lines = normalizedBody(body).split("\n");
  if (lines.find(line => line.trim()) !== "> Phase: Acceptance") throw archiveFailure("acceptance-layout-phase");
  const headings = [];
  let fence = null;
  let comment = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (comment) { if (line.includes("-->")) comment = false; continue; }
    if (line.includes("<!--")) { if (!line.includes("-->")) comment = true; continue; }
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`).test(line)) fence = null;
      continue;
    }
    if (marker) { fence = { character: marker[0], length: marker.length }; continue; }
    const heading = /^## (\S.*)$/.exec(line);
    if (heading) headings.push({ name: heading[1], index });
  }
  if (JSON.stringify(headings.map(({ name }) => name)) !== JSON.stringify(["Proposal", "Implementation", "Acceptance", "Automation"])) {
    throw archiveFailure("acceptance-layout-sections");
  }
  const proposalLines = lines.slice(headings[0].index + 1, headings[1].index).filter(line => line.trim());
  const proposal = proposalLines.join(" ").trim();
  const sentenceCount = proposal.match(/[.!?](?=\s|$)/g)?.length ?? 0;
  if (!proposal || Buffer.byteLength(proposal) > 600 || proposalLines.some(line => /^(?:[-*+] |#|>|<)/.test(line))
    || sentenceCount < 1 || sentenceCount > 2 || !/[.!?]$/.test(proposal)) throw archiveFailure("acceptance-layout-proposal");
  const automation = lines.slice(headings[3].index + 1);
  const visible = automation.filter(line => line.trim());
  if (visible[0] !== "<details>" || visible[1] !== "<summary>Used by CI to link this PR to its OpenSpec change</summary>"
    || visible.at(-1) !== "</details>" || !automation.some(line => line === "```openspec-implementation")) {
    throw archiveFailure("acceptance-layout-automation");
  }
}

export function parseImplementationAcceptanceScenarios(body, version) {
  if (version === 2) return parseImplementationAcceptanceChecks(body);
  if (version === 3) {
    assertVersion3BodyLayout(body);
    return parseAcceptanceSection(body, "Acceptance");
  }
  throw archiveFailure("acceptance-version");
}

export function acceptanceChecklistDigest(checks) {
  return checklistHash(assertAcceptanceScenarios(checks));
}

const display = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("`", "\\`");
const conventionalTitle = /^(?:feature|fix|refactor|docs|test|chore|style)(?:\([^\r\n)]*\))?!?:\s*/i;
function sourceSubject(sourceTitle, fallback) {
  const title = typeof sourceTitle === "string" ? sourceTitle.trim() : "";
  return (title.replace(conventionalTitle, "").trim() || fallback).replaceAll(/\s+/g, " ");
}
export function acceptancePullTitle(record, sourceTitle) {
  return `#${record.sourcePr}(accept): ${sourceSubject(sourceTitle, record.change)}`;
}
function legacyItems(record, sourceTitle) {
  const base = `https://github.com/${record.repository}`;
  const subject = display(sourceSubject(sourceTitle, record.change));
  const items = [
    `Review [#${record.sourcePr}: ${subject}](${base}/pull/${record.sourcePr}) and verify the implementation behaves as intended.`,
    "Confirm the implementation's required CI and recorded evidence match the reviewed result.",
    ...record.tasks.filter(task => task.completion === "pending")
      .map(task => `Verify task ${task.id}: ${display(task.text).replaceAll("\n", "<br>")}`),
    ...(record.review.gaps.length
      ? record.review.gaps.map(gap => `Resolve or explicitly disposition this known gap: ${display(gap)}`)
      : ["Confirm there are no unresolved known gaps."]),
    "Confirm the OpenSpec requirements and synchronization outcome are correct.",
    "Manually merge this PR to record acceptance; do not enable auto-merge.",
  ];
  if (!record.validation) items.splice(1, 0, "Obtain successful required CI for the exact implementation head.");
  return items;
}

export function acceptancePullBody(record, sourceTitle) {
  if (record.version === 1) return legacyItems(record, sourceTitle).map(item => `- [ ] ${item}`).join("\n");
  const subject = display(sourceSubject(sourceTitle, record.change));
  const reference = `Implementation: [#${record.sourcePr}: ${subject}](https://github.com/${record.repository}/pull/${record.sourcePr})`;
  return `${reference}\n\n${assertAcceptanceScenarios(record.acceptanceChecks).map(item => `- [ ] ${display(item)}`).join("\n")}`;
}

/** Permit checkbox-state edits only; post-merge callers additionally require every item checked. */
export function verifyAcceptancePullBody(record, sourceTitle, actualBody, { requireComplete = false } = {}) {
  const expected = acceptancePullBody(record, sourceTitle).split("\n");
  const actual = normalizedBody(actualBody).split("\n");
  if (actual.length !== expected.length) throw archiveFailure("acceptance-checklist-mismatch");
  let complete = true;
  const checks = [];
  for (let index = 0; index < expected.length; index += 1) {
    const expectedItem = /^- \[ \] (.+)$/.exec(expected[index]);
    if (!expectedItem) {
      if (actual[index] !== expected[index]) throw archiveFailure("acceptance-checklist-mismatch");
      continue;
    }
    const actualItem = /^- \[([ x])\] (.+)$/.exec(actual[index]);
    if (!actualItem || actualItem[2] !== expectedItem[1]) throw archiveFailure("acceptance-checklist-mismatch");
    if (actualItem[1] !== "x") complete = false;
    checks.push(record.version === 2 ? record.acceptanceChecks[checks.length] : expectedItem[1]);
  }
  if (requireComplete && !complete) throw archiveFailure("acceptance-checklist-incomplete");
  return { complete, checks, bodyDigest: createHash("sha256").update(normalizedBody(actualBody)).digest("hex") };
}
