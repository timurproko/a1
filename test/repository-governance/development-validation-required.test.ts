import { describe, expect, it } from "vitest";
import {
  requireDevelopmentValidation,
  requirePriorImplementationValidation,
} from "../../scripts/release/require-development-validation.mjs";

const head = "a".repeat(40);
const valid = {
  acceptanceOnly: "false", acceptancePhase: "false", acceptanceCandidate: "false", deliveryCandidate: "false", acceptanceResult: "success",
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

  it("accepts a delivery Acceptance phase only when trusted finalization passes and generic lanes skip", () => {
    const acceptance = {
      ...valid,
      acceptancePhase: "true",
      deliveryCandidate: "true",
      modularResult: "skipped",
    };
    expect(requireDevelopmentValidation(acceptance)).toEqual({ mode: "delivery-acceptance" });
    for (const override of [
      { acceptanceOnly: "true" },
      { deliveryCandidate: "false" },
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

  it("requires the newest prior exact-head Implementation authority from the same pull request", async () => {
    const run = implementationRun();
    const result = await requirePriorImplementationValidation(priorFixture([run], new Map([[run.id, [implementationJob()]]])));
    expect(result).toEqual({ runId: 700, attempt: 1, jobId: 900, head });
  });

  it("rejects missing, stale, differently associated, current-run, and failed Implementation evidence", async () => {
    const cases = [
      { runs: [], jobs: new Map<number, any[]>() },
      { runs: [implementationRun({ head_sha: "b".repeat(40) })], jobs: new Map([[700, [implementationJob()]]]) },
      { runs: [implementationRun({ pull_requests: [{ number: 43, head: { sha: head } }] })], jobs: new Map([[700, [implementationJob()]]]) },
      { runs: [implementationRun({ id: 800 })], jobs: new Map([[800, [implementationJob()]]]) },
      { runs: [implementationRun({ conclusion: "failure" })], jobs: new Map([[700, [implementationJob({ conclusion: "failure" })]]]) },
    ];
    for (const value of cases) {
      await expect(requirePriorImplementationValidation(priorFixture(value.runs, value.jobs))).rejects.toThrow();
    }
  });

  it("does not fall back to an older success after the newest exact-head Implementation run fails", async () => {
    const newest = implementationRun({ id: 701, run_number: 11, conclusion: "failure" });
    const older = implementationRun({ id: 700, run_number: 10 });
    await expect(requirePriorImplementationValidation(priorFixture([older, newest], new Map([
      [701, [implementationJob({ id: 901, conclusion: "failure" })]],
      [700, [implementationJob()]],
    ])))).rejects.toThrow("latest exact-head Implementation validation did not succeed");
  });
});

function implementationRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 700, run_number: 10, run_attempt: 1, head_sha: head, event: "pull_request", path: ".github/workflows/ci.yml",
    status: "completed", conclusion: "success", head_repository: { full_name: "timurproko/a1" },
    pull_requests: [{ number: 42, head: { sha: head } }], ...overrides,
  };
}

function implementationJob(overrides: Record<string, unknown> = {}) {
  return { id: 900, name: "Implementation validation complete", status: "completed", conclusion: "success", ...overrides };
}

function priorFixture(runs: any[], jobs: Map<number, any[]>) {
  return {
    repository: "timurproko/a1", pullNumber: 42, head, currentRunId: 800,
    request: async (path: string) => {
      if (path.includes("/actions/workflows/ci.yml/runs?")) return { total_count: runs.length, workflow_runs: runs };
      const match = /\/actions\/runs\/(\d+)\/jobs/u.exec(path);
      if (match) return { total_count: (jobs.get(Number(match[1])) ?? []).length, jobs: jobs.get(Number(match[1])) ?? [] };
      throw new Error(`unexpected path: ${path}`);
    },
  };
}
