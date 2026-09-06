import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function requireDevelopmentValidation(value) {
  requireResult(value.changesResult, "change classification");
  if (!/^[0-9a-f]{40}$/u.test(value.selectedHead ?? "") || value.selectedHead !== value.expectedHead) throw new Error("validation selection is stale or has an invalid head");
  if (value.docsOnly === "true") {
    requireResult(value.docsResult, "documentation governance");
    requireSkipped(value.documentationResult, "changed-file documentation");
    requireSkipped(value.validateResult, "ordinary validation");
    requireSkipped(value.renderingResult, "rendering validation");
    requireSkipped(value.startupResult, "startup budget validation");
    return { mode: "docs", openspec: value.openspecTouched === "true" };
  }
  if (value.versionOnly === "true") {
    requireSkipped(value.documentationResult, "changed-file documentation");
    requireSkipped(value.validateResult, "ordinary validation");
    requireSkipped(value.renderingResult, "rendering validation");
    requireSkipped(value.startupResult, "startup budget validation");
    return { mode: "version" };
  }
  requireResult(value.validateResult, "ordinary validation");
  requireResult(value.containmentResult, "process containment");
  requireResult(value.startupResult, "startup budget validation");
  if (value.documentationRequired === "true") requireResult(value.documentationResult, "changed-file documentation");
  else requireSkipped(value.documentationResult, "changed-file documentation");
  if (value.renderingTier === "none") requireSkipped(value.renderingResult, "rendering validation");
  else if (value.renderingTier === "smoke" || value.renderingTier === "full") requireResult(value.renderingResult, "rendering validation");
  else throw new Error(`unknown rendering tier: ${value.renderingTier}`);
  return { mode: "code", renderingTier: value.renderingTier, documentationRequired: value.documentationRequired === "true" };
}

function requireResult(result, label) {
  if (result !== "success") throw new Error(`${label} must succeed, received ${result ?? "missing"}`);
}

function requireSkipped(result, label) {
  if (result !== "skipped") throw new Error(`${label} must be skipped, received ${result ?? "missing"}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = Object.fromEntries(Object.entries({
    changesResult: "CHANGES_RESULT",
    docsResult: "DOCS_RESULT",
    documentationResult: "DOCUMENTATION_RESULT",
    validateResult: "VALIDATE_RESULT",
    renderingResult: "RENDERING_RESULT",
    containmentResult: "CONTAINMENT_RESULT",
    startupResult: "STARTUP_RESULT",
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
