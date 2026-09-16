import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function requireDevelopmentValidation(value) {
  requireResult(value.changesResult, "change classification");
  if (!/^[0-9a-f]{40}$/u.test(value.selectedHead ?? "") || value.selectedHead !== value.expectedHead) throw new Error("validation selection is stale or has an invalid head");
  if (value.acceptanceOnly === "true") {
    requireResult(value.acceptanceResult, "acceptance record validation");
    if (value.acceptanceCandidate !== "true") throw new Error("trusted acceptance candidate validation is missing");
    requireGenericLanesSkipped(value);
    return { mode: "acceptance" };
  }
  if (value.acceptanceOnly !== "false") throw new Error("acceptance-only routing result is missing");
  if (value.implementationBound === "true") {
    requireResult(value.deliveryResult, "finalized delivery validation");
    if (value.deliveryCandidate !== "true") throw new Error("finalized delivery candidate validation is missing");
  } else if (value.implementationBound === "false") {
    requireSkipped(value.deliveryResult, "finalized delivery validation");
  } else throw new Error("implementation-bound routing result is missing");
  if (value.namingRequired === "true") {
    requireResult(value.namingResult, "internal naming validation");
    if (value.namingHead !== value.expectedHead) throw new Error("naming validation result is stale or missing its head");
  } else if (value.namingRequired === "false") requireSkipped(value.namingResult, "internal naming validation");
  else throw new Error("naming validation selection is missing");
  if (value.docsOnly === "true") {
    requireResult(value.docsResult, "documentation governance");
    requireSkipped(value.documentationResult, "changed-file documentation");
    requireSkipped(value.modularResult, "modular validation");
    requireSkipped(value.renderingResult, "rendering validation");
    return { mode: "docs", openspec: value.openspecTouched === "true" };
  }
  if (value.versionOnly === "true") {
    requireSkipped(value.documentationResult, "changed-file documentation");
    requireSkipped(value.modularResult, "modular validation");
    requireSkipped(value.renderingResult, "rendering validation");
    return { mode: "version" };
  }
  requireResult(value.modularResult, "modular validation");
  if (value.documentationRequired === "true") requireResult(value.documentationResult, "changed-file documentation");
  else requireSkipped(value.documentationResult, "changed-file documentation");
  if (value.renderingTier === "none") requireSkipped(value.renderingResult, "rendering validation");
  else if (value.renderingTier === "smoke" || value.renderingTier === "full") requireResult(value.renderingResult, "rendering validation");
  else throw new Error(`unknown rendering tier: ${value.renderingTier}`);
  return { mode: "code", renderingTier: value.renderingTier, documentationRequired: value.documentationRequired === "true" };
}

function requireGenericLanesSkipped(value) {
  requireSkipped(value.docsResult, "documentation governance");
  requireSkipped(value.namingResult, "internal naming validation");
  requireSkipped(value.documentationResult, "changed-file documentation");
  requireSkipped(value.modularResult, "modular validation");
  requireSkipped(value.renderingResult, "rendering validation");
}

function requireResult(result, label) {
  if (result !== "success") throw new Error(`${label} must succeed, received ${result ?? "missing"}`);
}

function requireSkipped(result, label) {
  if (result !== "skipped") throw new Error(`${label} must be skipped, received ${result ?? "missing"}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = Object.fromEntries(Object.entries({
    acceptanceOnly: "ACCEPTANCE_ONLY",
    implementationBound: "IMPLEMENTATION_BOUND",
    acceptanceCandidate: "ACCEPTANCE_CANDIDATE",
    deliveryCandidate: "DELIVERY_CANDIDATE",
    acceptanceResult: "ACCEPTANCE_RESULT",
    deliveryResult: "DELIVERY_RESULT",
    changesResult: "CHANGES_RESULT",
    docsResult: "DOCS_RESULT",
    namingResult: "NAMING_RESULT",
    namingRequired: "NAMING_REQUIRED",
    namingHead: "NAMING_HEAD",
    documentationResult: "DOCUMENTATION_RESULT",
    modularResult: "MODULAR_RESULT",
    renderingResult: "RENDERING_RESULT",
    docsOnly: "DOCS_ONLY",
    versionOnly: "VERSION_ONLY",
    openspecTouched: "OPENSPEC_TOUCHED",
    documentationRequired: "DOCUMENTATION_REQUIRED",
    renderingTier: "RENDERING_TIER",
    selectedHead: "SELECTED_HEAD",
    expectedHead: "EXPECTED_HEAD",
  }).map(([key, environment]) => [key, process.env[environment]]));
  process.stdout.write(`${JSON.stringify(requireDevelopmentValidation(value))}\n`);
}
