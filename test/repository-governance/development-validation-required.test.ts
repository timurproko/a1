import { describe, expect, it } from "vitest";
import { requireDevelopmentValidation } from "../../scripts/release/require-development-validation.mjs";

const head = "a".repeat(40);
const valid = {
  acceptanceOnly: "false",
  acceptanceCandidate: "false",
  acceptanceResult: "success",
  changesResult: "success",
  docsResult: "skipped",
  namingRequired: "false",
  namingResult: "skipped",
  namingHead: head,
  documentationResult: "skipped",
  validateResult: "success",
  renderingResult: "skipped",
  containmentResult: "success",
  startupResult: "success",
  docsOnly: "false",
  versionOnly: "false",
  openspecTouched: "false",
  documentationRequired: "false",
  renderingTier: "none",
  selectedHead: head,
  expectedHead: head,
};

describe("development validation aggregate", () => {
  it("accepts only a current trusted acceptance candidate when every generic lane is skipped", () => {
    const acceptance = {
      ...valid,
      acceptanceOnly: "true",
      acceptanceCandidate: "true",
      docsResult: "skipped",
      namingResult: "skipped",
      documentationResult: "skipped",
      validateResult: "skipped",
      renderingResult: "skipped",
      containmentResult: "skipped",
      startupResult: "skipped",
    };
    expect(requireDevelopmentValidation(acceptance)).toEqual({ mode: "acceptance" });
    for (const override of [
      { acceptanceCandidate: "false" },
      { acceptanceResult: "failure" },
      { docsResult: "success" },
      { namingResult: "success" },
      { documentationResult: "success" },
      { validateResult: "success" },
      { renderingResult: "success" },
      { containmentResult: "success" },
      { startupResult: "success" },
      { selectedHead: "b".repeat(40) },
    ]) expect(() => requireDevelopmentValidation({ ...acceptance, ...override })).toThrow();
  });

  it("accepts exact docs, version, ordinary, smoke, and full selections", () => {
    expect(requireDevelopmentValidation({ ...valid, docsOnly: "true", docsResult: "success", validateResult: "skipped", startupResult: "skipped" })).toMatchObject({ mode: "docs" });
    expect(requireDevelopmentValidation({ ...valid, versionOnly: "true", validateResult: "skipped", startupResult: "skipped" })).toMatchObject({ mode: "version" });
    expect(requireDevelopmentValidation({ ...valid, namingRequired: "true", namingResult: "success" })).toMatchObject({ mode: "code" });
    expect(requireDevelopmentValidation(valid)).toMatchObject({ mode: "code", renderingTier: "none" });
    expect(requireDevelopmentValidation({ ...valid, documentationRequired: "true", documentationResult: "success", renderingTier: "smoke", renderingResult: "success" })).toMatchObject({ mode: "code", renderingTier: "smoke" });
    expect(requireDevelopmentValidation({ ...valid, renderingTier: "full", renderingResult: "success" })).toMatchObject({ mode: "code", renderingTier: "full" });
  });

  it("accepts current-head startup success without a deferred Node 24 PR result", () => {
    expect(requireDevelopmentValidation(valid)).toMatchObject({ mode: "code" });
    expect(() => requireDevelopmentValidation({ ...valid, expectedHead: "b".repeat(40) })).toThrow("stale");
  });

  it.each(["failure", "cancelled", "skipped", "neutral", "timed_out", undefined])("rejects a non-success required Node 22 startup result: %s", startupResult => {
    const results: Omit<typeof valid, "startupResult"> & { startupResult?: string } = { ...valid };
    if (startupResult === undefined) delete results.startupResult;
    else results.startupResult = startupResult;
    expect(() => requireDevelopmentValidation(results)).toThrow("startup budget validation must succeed");
  });

  it.each(["docs", "version"])("only accepts an intentional startup skip for %s", mode => {
    const exempt = { ...valid, validateResult: "skipped", docsOnly: mode === "docs" ? "true" : "false", docsResult: mode === "docs" ? "success" : "skipped", versionOnly: mode === "version" ? "true" : "false" };
    expect(requireDevelopmentValidation({ ...exempt, startupResult: "skipped" })).toMatchObject({ mode });
    for (const startupResult of ["success", "failure", "cancelled", undefined]) {
      const results: Omit<typeof exempt, "startupResult"> & { startupResult?: string } = { ...exempt };
      if (startupResult === undefined) delete results.startupResult;
      else results.startupResult = startupResult;
      expect(() => requireDevelopmentValidation(results)).toThrow("startup budget validation must be skipped");
    }
  });

  it.each([
    ["stale head", { selectedHead: "b".repeat(40) }],
    ["missing acceptance route", { acceptanceOnly: undefined }],
    ["missing classification", { changesResult: "failure" }],
    ["failed ordinary", { validateResult: "failure" }],
    ["failed containment", { containmentResult: "failure" }],
    ["failed startup budget", { startupResult: "failure" }],
    ["missing changed documentation", { documentationRequired: "true", documentationResult: "skipped" }],
    ["unexpected changed documentation", { documentationRequired: "false", documentationResult: "success" }],
    ["missing smoke", { renderingTier: "smoke", renderingResult: "skipped" }],
    ["failed full", { renderingTier: "full", renderingResult: "failure" }],
    ["unexpected rendering", { renderingTier: "none", renderingResult: "success" }],
    ["unknown rendering tier", { renderingTier: "partial" }],
    ["missing naming selection", { namingRequired: undefined }],
    ["skipped naming", { namingRequired: "true", namingResult: "skipped" }],
    ["failed naming", { namingRequired: "true", namingResult: "failure" }],
    ["stale naming", { namingRequired: "true", namingResult: "success", namingHead: "b".repeat(40) }],
    ["unexpected naming", { namingRequired: "false", namingResult: "success" }],
  ])("rejects %s", (_label, override) => {
    expect(() => requireDevelopmentValidation({ ...valid, ...override })).toThrow();
  });
});
