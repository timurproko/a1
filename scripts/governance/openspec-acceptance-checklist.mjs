import { createHash } from "node:crypto";
import { archiveFailure, metadataBlock } from "./openspec-archive-policy.mjs";

export const MIN_ACCEPTANCE_CHECKS = 1;
/** Compatibility export: meaningful scenarios no longer have a repository item-count ceiling. */
export const MAX_ACCEPTANCE_CHECKS = Number.POSITIVE_INFINITY;
export const MIN_IMPLEMENTATION_PROGRESS_ITEMS = 1;
export const PHASE_FREE_VERSION3_BODY_POLICY = true;
const genericChecks = [
  /^(?:review|check|verify|confirm)(?: the)?(?: linked)? (?:implementation )?(?:pull request|pr)\.?$/i,
  /^(?:review|check|verify|confirm)(?: that)? (?:the )?(?:required )?(?:ci|continuous integration)(?: checks?)? (?:passes|passed|is green|succeeded)\.?$/i,
  /^(?:confirm )?(?:there are )?no (?:known )?(?:blocking |unresolved )?(?:gaps|issues)\.?$/i,
  /^(?:approve|accept)(?: the)? (?:implementation|change|pull request|pr)?\.?$/i,
  /^(?:manually )?merge(?: this| the)? (?:acceptance )?(?:pull request|pr)?(?: to record acceptance)?\.?$/i,
  /^(?:confirm|verify)(?: the)? (?:openspec )?(?:requirements|specification|spec sync|synchronization)(?: are| is)? correct\.?$/i,
  /^(?:verify|confirm)(?: the)? implementation behaves as intended\.?$/i,
];
const genericImplementationItems = [
  /^(?:run|wait for|check|verify|confirm)(?: the)? (?:required )?(?:ci|continuous integration|tests?|validation)(?: checks?)?(?: passes| passed| is green| succeeded)?\.?$/i,
  /^(?:review|approve|accept)(?: the)? (?:implementation|change|pull request|pr)?\.?$/i,
  /^(?:merge|archive|finalize)(?: this| the)? (?:implementation|change|pull request|pr)?\.?$/i,
  /^(?:confirm )?(?:there are )?no (?:known )?(?:blocking |unresolved )?(?:gaps|issues)\.?$/i,
];
const normalizedBody = value => {
  if (typeof value !== "string" || value.replaceAll("\r\n", "").includes("\r")) {
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
  for (const original of values) {
    const value = typeof original === "string" ? original.trim() : original;
    if (typeof value !== "string" || !value
      || /[\r\n]/.test(value) || /^\[[ xX]\]\s/.test(value) || /^(?:#|>|```|~~~)/.test(value)) throw archiveFailure("acceptance-checklist-item");
    const identity = normalizedCheck(value);
    if (!identity || normalized.has(identity)) throw archiveFailure("acceptance-checklist-duplicate");
    if (genericChecks.some(pattern => pattern.test(value))) throw archiveFailure("acceptance-checklist-generic");
    normalized.add(identity);
  }
  return values.map(value => value.trim());
}

function markdownHeadings(lines) {
  const headings = [];
  let fence = null, comment = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (fence) { if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`).test(line)) fence = null; continue; }
    if (comment) { if (line.includes("-->")) comment = false; continue; }
    if (line.includes("<!--")) { if (!line.includes("-->")) comment = true; continue; }
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) { fence = { character: marker[0], length: marker.length }; continue; }
    const heading = /^ {0,3}##[ \t]+(\S.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    if (heading) headings.push({ name: heading[1], index });
  }
  return headings;
}

/** Declared completion is observable even when another body input is malformed; it never authorizes promotion. */
export function declaredImplementationComplete(body) {
  if (typeof body !== "string") return false;
  const lines = body.replaceAll("\r\n", "\n").split("\n"), headings = markdownHeadings(lines);
  const section = headings.filter(heading => heading.name === "Implementation");
  if (section.length !== 1) return false;
  const start = section[0].index + 1, end = headings.find(heading => heading.index >= start)?.index ?? lines.length;
  const items = lines.slice(start, end).filter(line => line.trim());
  return items.length > 0 && items.every(line => /^ {0,3}[-*+]\s+\[[xX]\]\s+\S/.test(line));
}

/** Local final-form preview only: no task file, PR body or authoritative progress is written. */
export function checkedImplementationPreview(body) {
  const lines = normalizedBody(body).split("\n"), headings = markdownHeadings(lines);
  const sections = headings.filter(heading => heading.name === "Implementation");
  if (sections.length !== 1) return body;
  const start = sections[0].index + 1, end = headings.find(heading => heading.index >= start)?.index ?? lines.length;
  for (let index = start; index < end; index++) lines[index] = lines[index].replace(/^( {0,3}[-*+]\s+)\[ \](\s+)/, "$1[x]$2");
  return lines.join("\n");
}

/** Extract the final reviewed handoff rather than deriving a robot list from source tasks. */
function parseAcceptanceSection(body, heading) {
  const lines = normalizedBody(body).split("\n");
  const headingIndices = new Set(markdownHeadings(lines).map(item => item.index));
  const headings = markdownHeadings(lines).filter(item => item.name === heading).map(item => item.index);
  if (headings.length !== 1) throw archiveFailure(headings.length ? "acceptance-checklist-duplicate-section" : "acceptance-checklist-missing");
  const start = headings[0] + 1;
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (headingIndices.has(index) || lines[index].trim() === "<details>") { end = index; break; }
  }
  const checks = [];
  for (const line of lines.slice(start, end)) {
    if (!line.trim()) continue;
    const item = /^ {0,3}[-*+]\s+(\S.*)$/.exec(line);
    if (!item) throw archiveFailure("acceptance-checklist-section");
    checks.push(item[1]);
  }
  return assertAcceptanceScenarios(checks);
}

export function parseImplementationAcceptanceChecks(body) {
  return parseAcceptanceSection(body, "Acceptance checks");
}

export function parseImplementationProgress(body, { requireComplete = false } = {}) {
  const lines = normalizedBody(body).split("\n");
  const headingIndices = new Set(markdownHeadings(lines).map(item => item.index));
  const headings = markdownHeadings(lines).filter(heading => heading.name === "Implementation").map(heading => heading.index);
  if (headings.length !== 1) throw archiveFailure(headings.length ? "implementation-progress-duplicate-section" : "implementation-progress-missing");
  const start = headings[0] + 1;
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (headingIndices.has(index) || lines[index].trim() === "<details>") { end = index; break; }
  }
  const content = lines.slice(start, end).filter(line => line.trim());
  const taskSyntax = content.some(line => /^\s*[-*+]\s+\[/.test(line));
  if (!taskSyntax) return { format: "legacy", complete: true, items: content };
  if (content.length < MIN_IMPLEMENTATION_PROGRESS_ITEMS) {
    throw archiveFailure("implementation-progress-count");
  }
  const identities = new Set();
  const items = content.map(line => {
    const item = /^ {0,3}[-*+]\s+\[([ xX])\]\s+(\S.*)$/.exec(line);
    if (!item) throw archiveFailure("implementation-progress-item");
    const text = item[2].trim();
    if (!text
      || /[\r\n]/.test(text) || /^(?:#|>|```|~~~)/.test(text)) throw archiveFailure("implementation-progress-item");
    const identity = normalizedCheck(text);
    if (!identity || identities.has(identity)) throw archiveFailure("implementation-progress-duplicate");
    if (genericImplementationItems.some(pattern => pattern.test(text))) throw archiveFailure("implementation-progress-generic");
    identities.add(identity);
    return { checked: item[1] !== " ", text };
  });
  const complete = items.every(item => item.checked);
  if (requireComplete && !complete) throw archiveFailure("implementation-progress-incomplete");
  return { format: "checklist", complete, items };
}

/** Keep substantive outcome checks without interpreting ordinary testing, coverage, links or notation as authority. */
export function assertImplementationOnlyProgress(items) {
  if (!Array.isArray(items) || items.length === 0) throw archiveFailure("implementation-progress-count");
  const texts = items.map(item => typeof item === "string" ? item : item?.text);
  if (texts.some(text => typeof text !== "string" || !text.trim())) throw archiveFailure("implementation-progress-item");
  if (texts.some(text => genericImplementationItems.some(pattern => pattern.test(text)))) throw archiveFailure("implementation-progress-generic");
}

export function assertVersion3BodyLayout(body, { allowLegacyPhaseLine = false, acceptanceRequired = true } = {}) {
  const lines = normalizedBody(body).split("\n");
  const firstIndex = lines.findIndex(line => line.trim());
  const firstLine = lines[firstIndex];
  const headings = markdownHeadings(lines);
  const startsWithProposal = headings[0]?.name === "Proposal" && headings[0].index === firstIndex;
  const legacyPhaseLine = ["> Phase: Implementation", "> Phase: Acceptance"].includes(firstLine);
  const phaseLines = lines.filter(line => /^> Phase:/.test(line));
  if (allowLegacyPhaseLine ? !startsWithProposal && !legacyPhaseLine : !startsWithProposal) {
    throw archiveFailure("acceptance-layout-phase");
  }
  if (phaseLines.length !== (allowLegacyPhaseLine && legacyPhaseLine ? 1 : 0)) throw archiveFailure("acceptance-layout-phase");
  const names = headings.map(({ name }) => name);
  const expected = acceptanceRequired || names.includes("Acceptance") ? ["Proposal", "Implementation", "Acceptance", "Automation"] : ["Proposal", "Implementation", "Automation"];
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw archiveFailure("acceptance-layout-sections");
  }
  const proposalLines = lines.slice(headings[0].index + 1, headings[1].index).filter(line => line.trim());
  const proposal = proposalLines.join(" ").trim();
  if (!proposal.replaceAll(/<!--[\s\S]*?-->/g, "").trim()) throw archiveFailure("acceptance-layout-proposal");
  const automation = lines.slice(headings.at(-1).index + 1);
  const visible = automation.filter(line => line.trim());
  if (visible[0] !== "<details>" || !/^<summary>\S(?:.*\S)?<\/summary>$/.test(visible[1] ?? "")
    || visible.at(-1) !== "</details>" || metadataBlock(automation.join("\n"), "openspec-implementation") === null) {
    throw archiveFailure("acceptance-layout-automation");
  }
}

export function parseImplementationAcceptanceScenarios(body, version, { allowLegacyVersion3Phase = false } = {}) {
  if (version === 2) return parseImplementationAcceptanceChecks(body);
  if (version === 3) {
    assertVersion3BodyLayout(body, { allowLegacyPhaseLine: allowLegacyVersion3Phase });
    parseImplementationProgress(body, { requireComplete: true });
    return parseAcceptanceSection(body, "Acceptance");
  }
  throw archiveFailure("acceptance-version");
}

export function acceptanceChecklistDigest(checks) {
  return checklistHash(assertAcceptanceScenarios(checks));
}

const display = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("`", "\\`");
const conventionalTitle = /^(?:feature|fix|refactor|docs|test|chore|style|upgrade)(?:\([^\r\n)]*\))?!?:\s*/i;
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
