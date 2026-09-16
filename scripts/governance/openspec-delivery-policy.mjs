import { createHash } from "node:crypto";
import { archiveFailure, assertRepositoryPath, CHANGE, metadataBlock, SHA } from "./openspec-archive-policy.mjs";
import { acceptanceChecklistDigest, assertAcceptanceScenarios } from "./openspec-acceptance-checklist.mjs";

const HASH = /^[a-f0-9]{64}$/;
const REPOSITORY = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function requireDelivery(value, code) {
  if (!value) throw archiveFailure(code);
}

function exactFields(value, fields) {
  requireDelivery(value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field)), "delivery-manifest-fields");
}

export function deliveryContentDigest(entries) {
  requireDelivery(Array.isArray(entries) && entries.length <= 20_000, "delivery-digest-input");
  const normalized = entries.map(entry => {
    requireDelivery(Array.isArray(entry) && entry.length === 2, "delivery-digest-input");
    const path = assertRepositoryPath(entry[0]);
    const bytes = Buffer.isBuffer(entry[1]) ? entry[1] : Buffer.from(entry[1]);
    requireDelivery(bytes.length <= 8 * 1024 * 1024, "delivery-digest-input");
    return [path, createHash("sha256").update(bytes).digest("hex")];
  }).sort(([left], [right]) => left.localeCompare(right));
  requireDelivery(new Set(normalized.map(([path]) => path)).size === normalized.length, "delivery-digest-input");
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function parseConditionalAcceptance(text) {
  const value = metadataBlock(text, "openspec-delivery");
  requireDelivery(value !== null, "delivery-manifest-missing");
  exactFields(value, ["version", "repository", "change", "sourcePr", "archive", "acceptanceManifest", "finalizedDate",
    "specBaseSha", "acceptanceScenarios", "archiveDigest", "specDigest", "tasksDigest", "evidenceDigest", "knownGaps"]);
  requireDelivery(value.version === 3 && REPOSITORY.test(value.repository ?? "")
    && typeof value.change === "string" && CHANGE.test(value.change)
    && Number.isSafeInteger(value.sourcePr) && value.sourcePr > 0, "delivery-manifest-identity");
  requireDelivery(typeof value.archive === "string" && typeof value.acceptanceManifest === "string", "delivery-manifest-path");
  assertRepositoryPath(value.archive.slice(0, -1));
  assertRepositoryPath(value.acceptanceManifest);
  requireDelivery(value.archive === `openspec/changes/archive/${value.finalizedDate}-${value.change}/`
    && value.acceptanceManifest === `${value.archive}acceptance.md`, "delivery-manifest-path");
  requireDelivery(DATE.test(value.finalizedDate) && new Date(`${value.finalizedDate}T00:00:00.000Z`).toISOString().slice(0, 10) === value.finalizedDate,
    "delivery-manifest-date");
  requireDelivery(typeof value.specBaseSha === "string" && SHA.test(value.specBaseSha)
    && [value.archiveDigest, value.specDigest, value.tasksDigest, value.evidenceDigest]
      .every(digest => typeof digest === "string" && HASH.test(digest)), "delivery-manifest-digest");
  requireDelivery(Array.isArray(value.knownGaps) && value.knownGaps.length <= 40
    && value.knownGaps.every(gap => typeof gap === "string" && gap === gap.trim() && gap.length > 0
      && Buffer.byteLength(gap) <= 1000 && !/[\r\n]/.test(gap)), "delivery-manifest-gaps");
  assertAcceptanceScenarios(value.acceptanceScenarios);
  return value;
}

export function conditionalAcceptanceBytes(manifest) {
  const json = JSON.stringify(manifest, null, 2);
  parseConditionalAcceptance(`\`\`\`openspec-delivery\n${json}\n\`\`\``);
  return `# Conditional implementation acceptance\n\nVerdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.\n\nThe manual merge accepts these scenarios:\n${manifest.acceptanceScenarios.map(item => `- ${item}`).join("\n")}\n\n\`\`\`openspec-delivery\n${json}\n\`\`\`\n`;
}

export function verifyConditionalAcceptance(manifest, { implementation, repository, sourcePr, archiveEntries, specEntries,
  evidenceEntries, tasksBytes, scenarios, knownGaps = [] }) {
  requireDelivery(implementation?.version === 3 && implementation.change === manifest.change
    && implementation.archive === manifest.archive && implementation.acceptanceManifest === manifest.acceptanceManifest,
  "delivery-implementation-drift");
  requireDelivery(repository === manifest.repository && sourcePr === manifest.sourcePr, "delivery-source-drift");
  requireDelivery(JSON.stringify(assertAcceptanceScenarios(scenarios)) === JSON.stringify(manifest.acceptanceScenarios),
    "delivery-acceptance-drift");
  requireDelivery(deliveryContentDigest(archiveEntries) === manifest.archiveDigest
    && deliveryContentDigest(specEntries) === manifest.specDigest
    && deliveryContentDigest(evidenceEntries) === manifest.evidenceDigest
    && createHash("sha256").update(tasksBytes).digest("hex") === manifest.tasksDigest,
  "delivery-content-drift");
  requireDelivery(JSON.stringify(knownGaps) === JSON.stringify(manifest.knownGaps), "delivery-gap-drift");
  return { checklistDigest: acceptanceChecklistDigest(manifest.acceptanceScenarios) };
}

