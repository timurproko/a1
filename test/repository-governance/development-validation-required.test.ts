import { describe, expect, it } from "vitest";
import { requireDevelopmentValidation } from "../../scripts/release/require-development-validation.mjs";

const head = "a".repeat(40);
const valid = {
  acceptanceOnly: "false", acceptanceCandidate: "false", acceptanceResult: "success",
  changesResult: "success", docsResult: "skipped", namingRequired: "false", namingResult: "skipped", namingHead: head,
  documentationResult: "skipped", modularResult: "success", renderingResult: "skipped", docsOnly: "false", versionOnly: "false",
  openspecTouched: "false", documentationRequired: "false", renderingTier: "none", selectedHead: head, expectedHead: head,
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
      modularResult: "skipped",
      renderingResult: "skipped",
    };
    expect(requireDevelopmentValidation(acceptance)).toEqual({ mode: "acceptance" });
    for (const override of [
      { acceptanceCandidate: "false" },
      { acceptanceResult: "failure" },
      { docsResult: "success" },
      { namingResult: "success" },
      { documentationResult: "success" },
      { modularResult: "success" },
      { renderingResult: "success" },
      { selectedHead: "b".repeat(40) },
    ]) expect(() => requireDevelopmentValidation({ ...acceptance, ...override })).toThrow();
  });

  it("accepts exact docs, version, code, smoke, and full selections", () => {
    expect(requireDevelopmentValidation({ ...valid, docsOnly: "true", docsResult: "success", modularResult: "skipped" })).toMatchObject({ mode: "docs" });
    expect(requireDevelopmentValidation({ ...valid, versionOnly: "true", modularResult: "skipped" })).toMatchObject({ mode: "version" });
    expect(requireDevelopmentValidation({ ...valid, namingRequired: "true", namingResult: "success" })).toMatchObject({ mode: "code" });
    expect(requireDevelopmentValidation(valid)).toMatchObject({ mode: "code", renderingTier: "none" });
    expect(requireDevelopmentValidation({ ...valid, documentationRequired: "true", documentationResult: "success", renderingTier: "smoke", renderingResult: "success" })).toMatchObject({ mode: "code", renderingTier: "smoke" });
    expect(requireDevelopmentValidation({ ...valid, renderingTier: "full", renderingResult: "success" })).toMatchObject({ mode: "code", renderingTier: "full" });
  });

  it.each(["failure", "cancelled", "skipped", "neutral", "timed_out", undefined])("rejects a non-success modular matrix: %s", modularResult => {
    const results: any = { ...valid, modularResult };
    if (modularResult === undefined) delete results.modularResult;
    expect(() => requireDevelopmentValidation(results)).toThrow("modular validation must succeed");
  });

  it.each(["docs", "version"])("only accepts an intentional modular skip for %s", mode => {
    const exempt = { ...valid, modularResult: "skipped", docsOnly: mode === "docs" ? "true" : "false", docsResult: mode === "docs" ? "success" : "skipped", versionOnly: mode === "version" ? "true" : "false" };
    expect(requireDevelopmentValidation(exempt)).toMatchObject({ mode });
    for (const result of ["success", "failure", "cancelled", undefined]) {
      const candidate: any = { ...exempt, modularResult: result };
      if (result === undefined) delete candidate.modularResult;
      expect(() => requireDevelopmentValidation(candidate)).toThrow("modular validation must be skipped");
    }
  });

  it.each([
    ["stale head", { selectedHead: "b".repeat(40) }], ["missing acceptance route", { acceptanceOnly: undefined }],
    ["missing classification", { changesResult: "failure" }],
    ["missing changed documentation", { documentationRequired: "true", documentationResult: "skipped" }],
    ["unexpected changed documentation", { documentationRequired: "false", documentationResult: "success" }],
    ["missing smoke", { renderingTier: "smoke", renderingResult: "skipped" }], ["failed full", { renderingTier: "full", renderingResult: "failure" }],
    ["unexpected rendering", { renderingTier: "none", renderingResult: "success" }], ["unknown rendering tier", { renderingTier: "partial" }],
    ["missing naming selection", { namingRequired: undefined }], ["skipped naming", { namingRequired: "true", namingResult: "skipped" }],
    ["failed naming", { namingRequired: "true", namingResult: "failure" }],
    ["stale naming", { namingRequired: "true", namingResult: "success", namingHead: "b".repeat(40) }],
    ["unexpected naming", { namingRequired: "false", namingResult: "success" }],
  ])("rejects %s", (_label, override) => { expect(() => requireDevelopmentValidation({ ...valid, ...override })).toThrow(); });
});
