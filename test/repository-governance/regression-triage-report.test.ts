import { describe, expect, it } from "vitest";
import {
  appendRunToDesign,
  branchName,
  changeId,
  commandTests,
  extractLogExcerpts,
  parseTriageKey,
  renderRunComment,
  renderTriageBody,
  renderTriageChange,
  summarizeLanes,
  triageDecision,
  triageKey,
  TRIAGE_IMPLEMENTATION_ITEMS,
  type TriageEvidence,
  type TriageLane,
} from "../../scripts/release/regression-triage-report.mjs";
import { parseImplementationAcceptanceScenarios, parseImplementationProgress } from "../../scripts/governance/openspec-acceptance-checklist.mjs";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";

const workflow = { name: "Full regression", file: "full-regression.yml", scheduledOnly: false };
const run = { id: 9001, number: 412, attempt: 1, workflowName: "Full regression", conclusion: "failure", headBranch: "develop", url: "https://github.com/timurproko/a1/actions/runs/9001", headSha: "30546e1d9c0b4c3f8a2d7e6f5a4b3c2d1e0f9a8b", event: "schedule", createdAt: "2026-09-19T02:47:13Z" };
const lastGreen = { id: 8990, number: 411, url: "https://github.com/timurproko/a1/actions/runs/8990", headSha: "82d76c5a1111111111111111111111111111aaaa" };
const commits = [
  { sha: "30546e1d9c0b4c3f8a2d7e6f5a4b3c2d1e0f9a8b", subject: "refactor(settings): consolidate the settings path (#500)", pr: 500 },
  { sha: "ccbf5d11aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", subject: "chore(pi): upgrade pinned Pi to 0.85.1 (#493)", pr: 493 },
];

function result(outcomes: Array<Partial<{ id: string; command: string; exitCode: number; scopes: string[]; skipped: string }>>) {
  return { schema: "a1-validation-outcomes-v1", passed: outcomes.every(outcome => !outcome.exitCode), outcomes: outcomes.map((outcome, index) => ({ id: `command-${index}`, command: "npx vitest run test/a.test.ts", exitCode: 0, durationMs: 1000 * (index + 1), scopes: [], ...outcome })) };
}

function lanes(): TriageLane[] {
  return [
    { id: "windows-2025-node24", job: "Complete non-physical regression (windows-2025, node 24)", conclusion: "failure", result: result([
      { id: "vitest-package-startup", command: "npx vitest run test/foundation/release/package-startup.integration.test.ts --no-file-parallelism", exitCode: 1, scopes: ["package-startup"] },
      { id: "vitest-fast", command: "npx vitest run test --exclude test/repository-governance/release-command.test.ts --exclude test/cli/update-cli.test.ts", exitCode: 1, scopes: ["fast-remainder"] },
      { id: "candidate-build", exitCode: 0, skipped: "verified-existing-build" },
    ]), excerpt: [" FAIL  test/foundation/release/package-startup.integration.test.ts > warm launch", "AssertionError: expected 2412 to be less than 2000"] },
    { id: "ubuntu-24.04-node24", job: "Complete non-physical regression (ubuntu-24.04, node 24)", conclusion: "success", result: result([{ id: "vitest-package-startup", exitCode: 0, scopes: ["package-startup"] }]) },
    { id: "windows-2025-node22", job: "Complete non-physical regression (windows-2025, node 22)", conclusion: "failure", result: result([
      { id: "vitest-package-startup", command: "npx vitest run test/foundation/release/package-startup.integration.test.ts", exitCode: 1, scopes: ["package-startup"] },
    ]), excerpt: [] },
    { id: "macos-15-node24", job: "Complete non-physical regression (macos-15, node 24)", conclusion: "failure", result: null, excerpt: ["npm ERR! code E404"] },
  ];
}

function evidence(overrides: Partial<TriageEvidence> = {}): TriageEvidence {
  return { workflow, run, summary: summarizeLanes(lanes()), lastGreen, commits, ...overrides };
}

describe("nightly regression triage report", () => {
  it("names the branch and change after the date", () => {
    expect(branchName("2026-09-19")).toBe("fix/nightly-regression-2026-09-19");
    expect(changeId("2026-09-19-412")).toBe("fix-nightly-regression-2026-09-19-412");
  });

  it("triages failed Full regression runs and scheduled Publish runs on develop only", () => {
    const develop = { headBranch: "develop" };
    expect(triageDecision({ id: 1, workflowName: "Full regression", conclusion: "failure", event: "workflow_dispatch", ...develop })).toMatchObject({ triage: true, workflow: { file: "full-regression.yml" } });
    expect(triageDecision({ id: 1, workflowName: "Publish", conclusion: "failure", event: "schedule", ...develop })).toMatchObject({ triage: true, workflow: { file: "publish.yml", scheduledOnly: true } });
    expect(triageDecision({ id: 1, workflowName: "Publish", conclusion: "failure", event: "workflow_dispatch", ...develop })).toMatchObject({ triage: false, reason: expect.stringContaining("scheduled runs only") });
    expect(triageDecision({ id: 1, workflowName: "Release", conclusion: "failure", event: "schedule", ...develop })).toMatchObject({ triage: true, workflow: { file: "release.yml", scheduledOnly: true } });
    expect(triageDecision({ id: 1, workflowName: "Publish stable release", conclusion: "failure", event: "release", ...develop })).toMatchObject({ triage: false, reason: 'workflow "Publish stable release" is not triaged' });
    expect(triageDecision({ id: 1, workflowName: "Full regression", conclusion: "cancelled", event: "schedule", ...develop })).toMatchObject({ triage: false, reason: "run 1 concluded cancelled, not failure or success" });
    expect(triageDecision({ id: 1, workflowName: "Development validation", conclusion: "failure", event: "pull_request", ...develop })).toMatchObject({ triage: false });
    expect(triageDecision({ id: 1, workflowName: "Full regression", conclusion: "failure", event: "workflow_dispatch", headBranch: "fix/nightly-regression-2026-09-19" }))
      .toMatchObject({ triage: false, reason: 'run 1 ran on "fix/nightly-regression-2026-09-19", not develop; its evidence belongs to that branch\'s own pull request' });
  });

  it("merges failed commands across lanes, keeps skipped and passed commands out, and reports lanes without a result as orchestration failures", () => {
    const summary = summarizeLanes(lanes());
    expect(summary.failures.map(failure => failure.id)).toEqual(["vitest-fast", "vitest-package-startup"]);
    const startup = summary.failures.find(failure => failure.id === "vitest-package-startup")!;
    expect(startup.lanes.map(lane => lane.id)).toEqual(["windows-2025-node24", "windows-2025-node22"]);
    expect(startup.tests).toEqual(["test/foundation/release/package-startup.integration.test.ts"]);
    expect(startup.scopes).toEqual(["package-startup"]);
    expect(summary.failures.find(failure => failure.id === "vitest-fast")!.tests).toEqual([]);
    expect(summary.orchestration).toEqual([{ lane: "macos-15-node24", job: "Complete non-physical regression (macos-15, node 24)", excerpt: ["npm ERR! code E404"] }]);
    expect(commandTests("npx vitest run test/a.test.ts test/b.test.ts --exclude test/c.test.ts --testTimeout=30000")).toEqual(["test/a.test.ts", "test/b.test.ts"]);
  });

  it("keys a candidate by workflow and sorted failed scopes so the same failure refreshes and a different one opens anew", () => {
    const summary = summarizeLanes(lanes());
    const key = triageKey(workflow.file, summary);
    expect(key).toBe("full-regression.yml:fast-remainder,package-startup,orchestration");
    expect(triageKey(workflow.file, summarizeLanes(lanes().slice(0, 3)))).toBe("full-regression.yml:fast-remainder,package-startup");
    expect(triageKey("publish.yml", { failures: [{ id: "typecheck", command: "npm run typecheck", scopes: [], tests: [], lanes: [], preparation: null }], orchestration: [] })).toBe("publish.yml:typecheck");
    const body = renderTriageBody({ ...evidence(), date: "2026-09-19", key });
    expect(parseTriageKey(body)).toBe(key);
    expect(parseTriageKey("## Proposal\n\nNothing.\n")).toBeNull();
  });

  it("extracts only the lines that say what failed, grouped by job and bounded", () => {
    const log = [
      "Complete non-physical regression (windows-2025, node 24)\tRun complete non-physical validation\t2026-09-19T03:10:01.1234567Z  RUN  v3.2.4 D:/a/a1/a1",
      "Complete non-physical regression (windows-2025, node 24)\tRun complete non-physical validation\t2026-09-19T03:10:02.1234567Z  ✓ test/cli/dispatch.test.ts (12 tests) 340ms",
      "Complete non-physical regression (windows-2025, node 24)\tRun complete non-physical validation\t2026-09-19T03:12:02.1234567Z  FAIL  test/foundation/release/package-startup.integration.test.ts > warm launch",
      "Complete non-physical regression (windows-2025, node 24)\tRun complete non-physical validation\t2026-09-19T03:12:02.1234567Z AssertionError: expected 2412 to be less than 2000",
      "Complete non-physical regression (windows-2025, node 24)\tRun complete non-physical validation\t2026-09-19T03:12:03.1234567Z  Test Files  1 failed | 41 passed (42)",
      "Complete non-physical regression (macos-15, node 24)\tInstall dependencies and build once\t2026-09-19T03:01:00.0000000Z npm ERR! code E404",
      "Complete non-physical regression (macos-15, node 24)\tInstall dependencies and build once\t2026-09-19T03:01:00.0000000Z npm ERR! 404 Not Found - GET https://registry.npmjs.org/x",
      "not a log line",
    ].join("\n");
    const excerpts = extractLogExcerpts(log);
    expect([...excerpts.keys()]).toEqual(["Complete non-physical regression (windows-2025, node 24)", "Complete non-physical regression (macos-15, node 24)"]);
    expect(excerpts.get("Complete non-physical regression (windows-2025, node 24)")).toEqual([
      " FAIL  test/foundation/release/package-startup.integration.test.ts > warm launch",
      "AssertionError: expected 2412 to be less than 2000",
      " Test Files  1 failed | 41 passed (42)",
    ]);
    expect(excerpts.get("Complete non-physical regression (macos-15, node 24)")).toEqual(["npm ERR! code E404", "npm ERR! 404 Not Found - GET https://registry.npmjs.org/x"]);

    const gate = [
      "> node scripts/governance/check-deprecated-dependencies.mjs",
      "Deprecated dependency policy failed (2):",
      "- node-domexception@1.0.0 [registry]",
      "    reason: Use your platform's native DOMException instead",
      "{",
      "  \"passed\": false,",
      "}",
      "unrelated trailing output",
      "more unrelated output",
      "still unrelated",
      "##[error]Process completed with exit code 1.",
    ].map(message => `job\tstep\t2026-09-19T03:12:02Z ${message}`).join("\n");
    expect(extractLogExcerpts(gate).get("job")).toEqual([
      "Deprecated dependency policy failed (2):",
      "- node-domexception@1.0.0 [registry]",
      "    reason: Use your platform's native DOMException instead",
      "unrelated trailing output",
      "more unrelated output",
      "##[error]Process completed with exit code 1.",
    ]);

    const long = Array.from({ length: 200 }, (_, index) => `job\tstep\t2026-09-19T03:12:02Z AssertionError: line ${index} ${"x".repeat(60)}`).join("\n");
    const bounded = extractLogExcerpts(long).get("job")!;
    expect(bounded.length).toBeLessThanOrEqual(41);
    expect(bounded.at(-1)).toMatch(/^\.\.\. \d+ more lines in the run log$/);
    expect(Buffer.byteLength(bounded.slice(0, -1).join("\n"))).toBeLessThanOrEqual(2048);
  });

  it("renders a body in the ordinary delivery layout whose two generated outcomes promote it once checked", () => {
    const body = renderTriageBody({ ...evidence(), date: "2026-09-19", key: "full-regression.yml:fast-remainder,package-startup,orchestration" });
    expect(parseImplementation(body)).toEqual({ version: 3, change: "fix-nightly-regression-2026-09-19" });
    expect(body.startsWith("## Proposal\n\nFix the Full regression failure of 2026-09-19 on `develop` at `30546e1`, where 2 validation commands (`fast-remainder`, `package-startup`) failed;")).toBe(true);
    expect(body).toContain("## Implementation\n\n- [ ] Reproduce the failure on the failed lane from the recorded tests or commands and identify the introducing commit or the environmental cause.\n- [ ] Fix the cause without weakening assertions, budgets, timeouts, or coverage.\n\n## Acceptance\n\n- The 2026-09-19 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.\n\n## Automation\n");
    // Invariant: the triage key stays machine-readable inside the automation block, where the layout policy allows it.
    expect(body.indexOf("- Triage key: `full-regression.yml:fast-remainder,package-startup,orchestration`")).toBeGreaterThan(body.indexOf("<details>"));
    expect(body.indexOf("- Triage key:")).toBeLessThan(body.indexOf("```openspec-implementation"));
    expect(body).not.toContain("Run [Full regression #412]");
    expect(body.trimEnd().endsWith("</details>")).toBe(true);

    // Invariant: the generated draft is incomplete until the fixer checks both outcomes, and then it is an ordinary complete candidate.
    expect(parseImplementationProgress(body)).toEqual({ format: "checklist", complete: false, items: TRIAGE_IMPLEMENTATION_ITEMS.map(text => ({ checked: false, text })) });
    expect(() => parseImplementationAcceptanceScenarios(body, 3)).toThrow();
    const checked = body.replaceAll("- [ ] ", "- [x] ");
    expect(parseImplementationAcceptanceScenarios(checked, 3)).toEqual(["The 2026-09-19 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."]);
    expect(parseTriageKey(checked)).toBe("full-regression.yml:fast-remainder,package-startup,orchestration");
  });

  it("carries the run evidence in the triage comment", () => {
    const comment = renderRunComment(evidence());
    expect(comment.startsWith("The nightly regression triage opened this candidate from the evidence below; the change's design evidence carries the same record.\n\n- Run [Full regression #412](https://github.com/timurproko/a1/actions/runs/9001) (attempt 1, schedule) on `30546e1` at 2026-09-19T02:47:13Z:")).toBe(true);
    expect(comment).toContain("  - `vitest-package-startup` (`package-startup`) failed on windows-2025-node24, windows-2025-node22 with exit 1.");
    expect(comment).toContain("    - Tests: `test/foundation/release/package-startup.integration.test.ts`");
    expect(comment).toContain("      AssertionError: expected 2412 to be less than 2000");
    expect(comment).toContain("  - `vitest-fast` (`fast-remainder`) failed on windows-2025-node24 with exit 1.\n    - Command: `npx vitest run test --exclude");
    expect(comment).toContain("  - Lane macos-15-node24 failed in job `Complete non-physical regression (macos-15, node 24)` before producing owner outcomes (orchestration failure).");
    expect(comment).toContain("  - Last successful Full regression run: [#411](https://github.com/timurproko/a1/actions/runs/8990) on `82d76c5`; 2 `develop` commits since:");
    expect(comment).toContain("    - `30546e1` refactor(settings): consolidate the settings path (#500)");
    expect(comment).not.toContain("## ");
  });

  it("says when no green run bounds the suspect range and when only orchestration failed", () => {
    const orchestration = evidence({ lastGreen: null, commits: [], summary: summarizeLanes([lanes()[3]!]) });
    const body = renderTriageBody({ ...orchestration, date: "2026-09-19", key: "full-regression.yml:orchestration" });
    expect(body).toContain("where 1 lane before any owner ran failed;");
    const comment = renderRunComment(orchestration);
    expect(comment).toContain("No successful Full regression run is retained on `develop`");
    expect(comment).not.toContain("Last successful");
  });

  it("posts a later run as another comment and appends it to the design evidence", () => {
    const later = renderRunComment(evidence({ run: { ...run, id: 9002, number: 413, createdAt: "2026-09-20T02:47:00Z" } }), { refresh: true });
    expect(later.startsWith("The nightly regression triage recorded another Full regression failure with the same failed scope set; the change's design evidence carries the same record.\n\n- Run [Full regression #413]")).toBe(true);

    const files = renderTriageChange({ ...evidence(), date: "2026-09-19" });
    expect(Object.keys(files).sort()).toEqual([
      "openspec/changes/fix-nightly-regression-2026-09-19/.openspec.yaml",
      "openspec/changes/fix-nightly-regression-2026-09-19/design.md",
      "openspec/changes/fix-nightly-regression-2026-09-19/proposal.md",
      "openspec/changes/fix-nightly-regression-2026-09-19/regression-provenance.json",
      "openspec/changes/fix-nightly-regression-2026-09-19/tasks.md",
    ]);
    expect(files["openspec/changes/fix-nightly-regression-2026-09-19/.openspec.yaml"]).toBe("schema: spec-driven\ncreated: 2026-09-19\nskip_specs: true\n");
    expect(JSON.parse(files["openspec/changes/fix-nightly-regression-2026-09-19/regression-provenance.json"]!)).toMatchObject({
      schema: "a1-regression-triage-provenance-v1", candidate: { branch: "fix/nightly-regression-2026-09-19", change: "fix-nightly-regression-2026-09-19" },
      sources: [{ workflowName: "Full regression", workflowFile: "full-regression.yml", runId: 9001, conclusion: "failure", headBranch: "develop" }],
    });
    expect(files["openspec/changes/fix-nightly-regression-2026-09-19/proposal.md"]).toContain("remove `skip_specs: true`");
    expect(files["openspec/changes/fix-nightly-regression-2026-09-19/proposal.md"]).toContain("Failed: `vitest-fast` (fast-remainder) on windows-2025-node24; `vitest-package-startup` (package-startup) on windows-2025-node24, windows-2025-node22.");
    expect(files["openspec/changes/fix-nightly-regression-2026-09-19/tasks.md"]).toContain("- [ ] 1.1 Reproduce the failure");
    expect(files["openspec/changes/fix-nightly-regression-2026-09-19/tasks.md"]).toContain("- [ ] 3.1 Record focused implementation evidence and pre-finalization PR Full regression observations");
    expect(files["openspec/changes/fix-nightly-regression-2026-09-19/tasks.md"]).toContain("Report final run/head/selection in Actions and handoff, not another committed design edit");
    const design = appendRunToDesign(files["openspec/changes/fix-nightly-regression-2026-09-19/design.md"]!, evidence({ run: { ...run, number: 413 } }));
    expect(design).toContain("## Evidence\n\n- Run [Full regression #412]");
    expect(design.trimEnd().split("\n").some(line => line.startsWith("- Run [Full regression #413]"))).toBe(true);

    const sameDay = renderTriageChange({ ...evidence(), date: "2026-09-19-1" });
    expect(sameDay["openspec/changes/fix-nightly-regression-2026-09-19-1/.openspec.yaml"]).toBe("schema: spec-driven\ncreated: 2026-09-19\nskip_specs: true\n");
  });
});
