import { describe, expect, it } from "vitest";
import { requireDevelopmentValidation } from "../../scripts/release/require-development-validation.mjs";

const head = "a".repeat(40);
const valid = {
  changesResult: "success",
  docsResult: "skipped",
  documentationResult: "skipped",
  validateResult: "success",
  renderingResult: "skipped",
  containmentResult: "success",
  docsOnly: "false",
  versionOnly: "false",
  openspecTouched: "false",
  documentationRequired: "false",
  renderingTier: "none",
  selectedHead: head,
  expectedHead: head,
};

describe("development validation aggregate", () => {
  it("accepts exact docs, version, ordinary, smoke, and full selections", () => {
    expect(requireDevelopmentValidation({ ...valid, docsOnly: "true", docsResult: "success", validateResult: "skipped" })).toMatchObject({ mode: "docs" });
    expect(requireDevelopmentValidation({ ...valid, versionOnly: "true", validateResult: "skipped" })).toMatchObject({ mode: "version" });
    expect(requireDevelopmentValidation(valid)).toMatchObject({ mode: "code", renderingTier: "none" });
    expect(requireDevelopmentValidation({ ...valid, documentationRequired: "true", documentationResult: "success", renderingTier: "smoke", renderingResult: "success" })).toMatchObject({ mode: "code", renderingTier: "smoke" });
    expect(requireDevelopmentValidation({ ...valid, renderingTier: "full", renderingResult: "success" })).toMatchObject({ mode: "code", renderingTier: "full" });
  });

  it.each([
    ["stale head", { selectedHead: "b".repeat(40) }],
    ["missing classification", { changesResult: "failure" }],
    ["failed ordinary", { validateResult: "failure" }],
    ["failed containment", { containmentResult: "failure" }],
    ["missing changed documentation", { documentationRequired: "true", documentationResult: "skipped" }],
    ["unexpected changed documentation", { documentationRequired: "false", documentationResult: "success" }],
    ["missing smoke", { renderingTier: "smoke", renderingResult: "skipped" }],
    ["failed full", { renderingTier: "full", renderingResult: "failure" }],
    ["unexpected rendering", { renderingTier: "none", renderingResult: "success" }],
    ["unknown rendering tier", { renderingTier: "partial" }],
  ])("rejects %s", (_label, override) => {
    expect(() => requireDevelopmentValidation({ ...valid, ...override })).toThrow();
  });
});
