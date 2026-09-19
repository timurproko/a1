import { describe, expect, it } from "vitest";
import { proposeRegressionFix } from "../../scripts/release/propose-regression-fix.mjs";

type Executor = (args: string[]) => Promise<{ stdout: string }>;

const head = "30546e1d9c0b4c3f8a2d7e6f5a4b3c2d1e0f9a8b";
const green = "82d76c5a1111111111111111111111111111aaaa";

function tierResult(failed: boolean) {
  return JSON.stringify({
    schema: "a1-validation-outcomes-v1",
    passed: !failed,
    outcomes: [
      { id: "typecheck", command: "npm run typecheck", exitCode: 0, durationMs: 100, scopes: ["typecheck"] },
      { id: "vitest-package-startup", command: "npx vitest run test/foundation/release/package-startup.integration.test.ts", exitCode: failed ? 1 : 0, durationMs: 90000, scopes: ["package-startup"] },
    ],
  });
}

/** An in-memory working tree with the artifacts `gh run download` would have written. */
function memoryFiles(seed: Record<string, string> = {}) {
  const files = new Map(Object.entries(seed).map(([path, content]) => [normalize(path), content]));
  const directories = new Set<string>();
  function normalize(path: string) { return path.replaceAll("\\", "/"); }
  return {
    files,
    mkdir: async (path: string) => { directories.add(normalize(path)); },
    list: async (path: string) => {
      const prefix = `${normalize(path)}/`;
      const names = new Set<string>();
      for (const key of files.keys()) if (key.startsWith(prefix)) names.add(key.slice(prefix.length).split("/")[0]!);
      if (!names.size && !directories.has(normalize(path))) throw new Error(`ENOENT ${path}`);
      return [...names];
    },
    read: async (path: string) => {
      const content = files.get(normalize(path));
      if (content === undefined) throw new Error(`ENOENT ${path}`);
      return content;
    },
    write: async (path: string, content: string) => { files.set(normalize(path), content); },
  };
}

function recorder(answers: (args: string[]) => string | { stdout: string } | Error | undefined) {
  const calls: string[][] = [];
  const executor: Executor = async args => {
    calls.push(args);
    const answer = answers(args);
    if (answer instanceof Error) throw answer;
    return typeof answer === "string" ? { stdout: answer } : answer ?? { stdout: "" };
  };
  return { calls, executor };
}

function runView(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    databaseId: 9001, number: 412, attempt: 1, workflowName: "Full regression", conclusion: "failure", event: "schedule", headBranch: "develop", headSha: head,
    url: "https://github.com/timurproko/a1/actions/runs/9001", createdAt: "2026-09-19T02:47:13Z",
    jobs: [
      { name: "Full documentation review", conclusion: "success" },
      { name: "Complete non-physical regression (windows-2025, node 24)", conclusion: "failure" },
      { name: "Complete non-physical regression (ubuntu-24.04, node 24)", conclusion: "success" },
    ],
    ...overrides,
  });
}

const previousRuns = JSON.stringify([
  { databaseId: 9001, number: 412, headSha: head, url: "https://github.com/timurproko/a1/actions/runs/9001", createdAt: "2026-09-19T02:47:13Z" },
  { databaseId: 8995, number: 411, headSha: green, url: "https://github.com/timurproko/a1/actions/runs/8995", createdAt: "2026-09-18T02:47:00Z" },
  { databaseId: 8990, number: 410, headSha: green, url: "https://github.com/timurproko/a1/actions/runs/8990", createdAt: "2026-09-17T02:47:00Z" },
  { databaseId: 8980, number: 409, headSha: green, url: "https://github.com/timurproko/a1/actions/runs/8980", createdAt: "2026-09-16T02:47:00Z" },
]);

const shell = "a1";
function startupEvidence(...samples: Array<[string, string, number]>) {
  return JSON.stringify({
    schema: "a1-startup-performance-evidence-v1", enforcement: "record", budgetViolations: [],
    measurements: samples.map(([profileId, launchKind, elapsedMs]) => ({ profileId, launchKind, elapsedMs, budgetMs: launchKind === "no-live-supervisor" ? 2500 : 2000 })),
  });
}

function ghAnswers({ view = runView(), openPulls = "[]", lastGreen = JSON.stringify([{ databaseId: 8990, number: 411, headSha: green, url: "https://github.com/timurproko/a1/actions/runs/8990" }]) } = {}) {
  return (args: string[]) => {
    const command = args.slice(0, 2).join(" ");
    if (command === "run view" && args.includes("--json")) return view;
    if (command === "run view" && args.includes("--log-failed")) return "Complete non-physical regression (windows-2025, node 24)\tRun complete non-physical validation\t2026-09-19T03:12:02Z  FAIL  test/foundation/release/package-startup.integration.test.ts > warm launch\n";
    if (command === "run download") return "";
    if (command === "run list" && args.includes("completed")) return previousRuns;
    if (command === "run list") return lastGreen;
    if (command === "pr list") return openPulls;
    if (command === "pr create") return "https://github.com/timurproko/a1/pull/777\n";
    if (command === "pr edit") return "";
    return undefined;
  };
}

function gitAnswers(remoteBranches: string[] = []) {
  return (args: string[]) => {
    if (args[0] === "log") return `${head}\u001frefactor(settings): consolidate the settings path (#500)\n`;
    if (args[0] === "ls-remote") return remoteBranches.includes(args.at(-1)!) ? `${head}\trefs/heads/${args.at(-1)}\n` : "";
    return "";
  };
}

const today = new Date("2026-09-19T05:00:00Z");
const repository = "D:/repo";
const output = "D:/repo/.artifacts/regression-triage";
const artifact = `${output}/artifacts/full-regression-${head}-9001-1-windows-2025-node24/.artifacts/validation/full-regression.json`;
const passedArtifact = `${output}/artifacts/full-regression-${head}-9001-1-ubuntu-24.04-node24/.artifacts/validation/full-regression.json`;
const startupArtifact = (runId: number, lane: string) => `${runId === 9001 ? `${output}/artifacts` : `${output}/history/${runId}`}/full-regression-${head}-${runId}-1-${lane}/.artifacts/validation/startup-${lane}.json`;

describe("nightly regression fix proposal", () => {
  it("opens a new draft candidate from the failed head with the scaffold committed and the body written", async () => {
    const gh = recorder(ghAnswers());
    const git = recorder(gitAnswers());
    const files = memoryFiles({ [artifact]: tierResult(true), [passedArtifact]: tierResult(false) });
    const result = await proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files, today });
    expect(result).toMatchObject({ changed: true, mode: "new", branch: "fix/nightly-regression-2026-09-19", pr: 777, change: "fix-nightly-regression-2026-09-19", key: "full-regression.yml:package-startup" });
    expect(result.summary!.failures).toEqual([expect.objectContaining({ id: "vitest-package-startup", lanes: [expect.objectContaining({ id: "windows-2025-node24", excerpt: [" FAIL  test/foundation/release/package-startup.integration.test.ts > warm launch"] })] })]);
    expect(result.commits).toEqual([{ sha: head, subject: "refactor(settings): consolidate the settings path (#500)", pr: 500 }]);
    expect(git.calls.map(call => call.slice(0, 2).join(" "))).toEqual(["log --first-parent", "ls-remote --heads", "checkout -B", "add -A", "commit -m", "push --force-with-lease"]);
    expect(gh.calls.filter(call => call[1] === "download").map(call => call[2])).toEqual(["9001", "8995", "8990"]);
    expect(result.startup).toMatchObject({ window: 3, summary: "startup: no measurements", persistent: [] });
    expect(git.calls.find(call => call[0] === "checkout")).toEqual(["checkout", "-B", "fix/nightly-regression-2026-09-19", head]);
    expect(gh.calls.find(call => call[1] === "create")).toEqual(["pr", "create", "--draft", "--base", "develop", "--head", "fix/nightly-regression-2026-09-19", "--title", "fix(regression): repair the 2026-09-19 full regression failure", "--body-file", `${output}/body.md`.replaceAll("/", process.platform === "win32" ? "\\" : "/")]);
    expect([...files.files.keys()].filter(path => path.includes("openspec/changes/"))).toEqual([
      "D:/repo/openspec/changes/fix-nightly-regression-2026-09-19/.openspec.yaml",
      "D:/repo/openspec/changes/fix-nightly-regression-2026-09-19/proposal.md",
      "D:/repo/openspec/changes/fix-nightly-regression-2026-09-19/design.md",
      "D:/repo/openspec/changes/fix-nightly-regression-2026-09-19/tasks.md",
    ]);
    expect(files.files.get(`${output}/body.md`)).toContain("- Triage key: `full-regression.yml:package-startup`");
    expect(JSON.parse(files.files.get(`${output}/report.json`)!)).toMatchObject({ schema: "a1-regression-triage-proposal-v1", mode: "new", pr: 777 });
  });

  it("refreshes the open candidate with the same failed scope set instead of opening another", async () => {
    const existingBody = "## Proposal\n\nFix it.\n\n## Implementation\n\n- Triage key: `full-regression.yml:package-startup`\n- Run [Full regression #411](x) (attempt 1, schedule) on `82d76c5` at 2026-09-18T02:47:00Z:\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n```openspec-implementation\n{\n  \"version\": 3,\n  \"change\": \"fix-nightly-regression-2026-09-18\"\n}\n```\n\n</details>\n";
    const gh = recorder(ghAnswers({ openPulls: JSON.stringify([
      { number: 700, headRefName: "fix/nightly-regression-2026-09-18", body: existingBody, url: "https://github.com/timurproko/a1/pull/700" },
      { number: 701, headRefName: "fix/nightly-regression-2026-09-10", body: existingBody.replace("package-startup", "typecheck"), url: "https://github.com/timurproko/a1/pull/701" },
      { number: 702, headRefName: "feature/other", body: existingBody, url: "https://github.com/timurproko/a1/pull/702" },
    ]) }));
    const git = recorder(gitAnswers());
    const files = memoryFiles({ [artifact]: tierResult(true), "D:/repo/openspec/changes/fix-nightly-regression-2026-09-18/design.md": "## Context\n\nOpened.\n\n## Evidence\n\n- Run [Full regression #411](x) (attempt 1, schedule) on `82d76c5` at 2026-09-18T02:47:00Z:\n" });
    const result = await proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files, today });
    expect(result).toMatchObject({ changed: true, mode: "refresh", branch: "fix/nightly-regression-2026-09-18", pr: 700 });
    expect(git.calls.map(call => call.slice(0, 2).join(" "))).toEqual(["log --first-parent", "fetch origin", "checkout -B", "add -A", "commit --allow-empty", "push origin"]);
    expect(git.calls.find(call => call[0] === "push")).toEqual(["push", "origin", "fix/nightly-regression-2026-09-18"]);
    expect(gh.calls.find(call => call[1] === "edit")?.slice(0, 3)).toEqual(["pr", "edit", "700"]);
    expect(gh.calls.some(call => call[1] === "create")).toBe(false);
    const body = files.files.get(`${output}/body.md`)!;
    expect(body.indexOf("Full regression #412")).toBeGreaterThan(body.indexOf("Full regression #411"));
    expect(body.indexOf("Full regression #412")).toBeLessThan(body.indexOf("## Automation"));
    expect(files.files.get("D:/repo/openspec/changes/fix-nightly-regression-2026-09-18/design.md")).toContain("- Run [Full regression #412]");
  });

  it("proposes nothing for a cancelled run or a manual publication and records why", async () => {
    for (const [view, reason] of [
      [runView({ conclusion: "cancelled" }), "run 9001 concluded cancelled, not failure or success"],
      [runView({ workflowName: "Release", event: "workflow_dispatch" }), "Release triages scheduled runs only; this run was workflow_dispatch"],
      [runView({ headBranch: "fix/nightly-regression-2026-09-18" }), 'run 9001 ran on "fix/nightly-regression-2026-09-18", not develop; its evidence belongs to that branch\'s own pull request'],
    ] as const) {
      const gh = recorder(ghAnswers({ view }));
      const git = recorder(gitAnswers());
      const files = memoryFiles();
      const result = await proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files, today });
      expect(result).toMatchObject({ changed: false, message: reason });
      expect(gh.calls).toHaveLength(1);
      expect(git.calls).toHaveLength(0);
      expect(JSON.parse(files.files.get(`${output}/report.json`)!)).toMatchObject({ changed: false, message: reason });
    }
  });

  it("treats a run with no artifacts as an orchestration failure of its failed jobs and keeps a dry run read-only", async () => {
    const gh = recorder(args => {
      if (args[1] === "download") return Object.assign(new Error("no valid artifacts found to download"), { stderr: "no valid artifacts found to download" });
      return ghAnswers({ lastGreen: "[]" })(args);
    });
    const git = recorder(gitAnswers(["fix/nightly-regression-2026-09-19"]));
    const files = memoryFiles();
    const result = await proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files, today, dryRun: true });
    expect(result).toMatchObject({ changed: false, mode: "new", branch: "fix/nightly-regression-2026-09-19-412", pr: null, key: "full-regression.yml:orchestration", lastGreen: null, commits: [] });
    expect(result.summary).toEqual({ failures: [], orchestration: [{ lane: "windows-2025-node24", job: "Complete non-physical regression (windows-2025, node 24)", excerpt: [" FAIL  test/foundation/release/package-startup.integration.test.ts > warm launch"] }] });
    expect(git.calls.map(call => call[0])).toEqual(["ls-remote", "ls-remote"]);
    expect(gh.calls.some(call => call[0] === "pr" && call[1] !== "list")).toBe(false);
    expect(files.files.get(`${output}/body.md`)).toContain("No successful Full regression run is retained");
    expect([...files.files.keys()].some(path => path.includes("openspec/changes/"))).toBe(false);
  });

  it("rethrows a download failure that is not the absence of artifacts", async () => {
    const gh = recorder(args => args[1] === "download" ? Object.assign(new Error("HTTP 403"), { stderr: "HTTP 403: Resource not accessible" }) : ghAnswers()(args));
    const git = recorder(gitAnswers());
    await expect(proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files: memoryFiles(), today })).rejects.toThrow("HTTP 403");
  });

  it("opens a candidate for a persistent startup overrun on a green run, keyed by the startup owner", async () => {
    const gh = recorder(ghAnswers({ view: runView({ conclusion: "success", jobs: [] }) }));
    const git = recorder(gitAnswers());
    const files = memoryFiles({
      [startupArtifact(9001, "windows-2025-node22")]: startupEvidence([shell, "no-live-supervisor", 2715], [shell, "post-update", 1700]),
      [startupArtifact(8995, "windows-2025-node22")]: startupEvidence([shell, "no-live-supervisor", 2532], [shell, "post-update", 1650]),
      [startupArtifact(8990, "windows-2025-node22")]: startupEvidence([shell, "no-live-supervisor", 2601], [shell, "post-update", 2012]),
      [startupArtifact(9001, "windows-2025-node24")]: startupEvidence([shell, "no-live-supervisor", 1400]),
    });
    const result = await proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files, today });
    expect(result).toMatchObject({ changed: true, mode: "new", key: "full-regression.yml:package-startup", pr: 777 });
    expect(result.summary!.failures).toEqual([expect.objectContaining({ id: "startup-budget", scopes: ["package-startup"], tests: ["test/foundation/release/package-startup.integration.test.ts"], lanes: [expect.objectContaining({ id: "windows-2025-node22" })] })]);
    expect(result.startup).toMatchObject({ persistent: ["windows-2025-node22/a1/no-live-supervisor"] });
    expect(gh.calls.some(call => call.includes("--log-failed"))).toBe(false);
    const body = files.files.get(`${output}/body.md`)!;
    expect(body).toContain("- `startup-budget` (`package-startup`) failed on windows-2025-node22 with exit 1.");
    expect(body).toContain("| windows-2025-node22 | a1 | no-live-supervisor | 2500ms | 2715ms (over) #412 | 2532ms (over) #411 | 2601ms (over) #410 |");
  });

  it("records a single overrun on a green run and proposes nothing", async () => {
    const gh = recorder(ghAnswers({ view: runView({ conclusion: "success", jobs: [] }) }));
    const git = recorder(gitAnswers());
    const files = memoryFiles({
      [startupArtifact(9001, "windows-2025-node22")]: startupEvidence([shell, "no-live-supervisor", 2715]),
      [startupArtifact(8995, "windows-2025-node22")]: startupEvidence([shell, "no-live-supervisor", 1900]),
      [startupArtifact(8990, "windows-2025-node22")]: startupEvidence([shell, "no-live-supervisor", 2601]),
    });
    const result = await proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files, today });
    expect(result).toMatchObject({ changed: false, message: "run 9001 succeeded; startup: single overrun on windows-2025-node22/a1/no-live-supervisor, not persistent" });
    expect(git.calls).toHaveLength(0);
    expect(gh.calls.some(call => call[0] === "pr")).toBe(false);
  });

  it("carries a failed run's owners and a persistent overrun in one candidate, and treats a missing previous run as insufficient", async () => {
    const gh = recorder(ghAnswers());
    const git = recorder(gitAnswers());
    const files = memoryFiles({
      [artifact]: tierResult(true),
      [startupArtifact(9001, "windows-2025-node24")]: startupEvidence(["pi", "warm", 2100]),
      [startupArtifact(8995, "windows-2025-node24")]: startupEvidence(["pi", "warm", 2050]),
      [startupArtifact(8990, "windows-2025-node24")]: startupEvidence(["pi", "warm", 2200]),
      [startupArtifact(9001, "windows-2025-node22")]: startupEvidence(["pi", "warm", 2100]),
      [startupArtifact(8990, "windows-2025-node22")]: startupEvidence(["pi", "warm", 2200]),
    });
    const result = await proposeRegressionFix({ runId: 9001, repository, output, gh: gh.executor, git: git.executor, files, today });
    expect(result).toMatchObject({ changed: true, key: "full-regression.yml:package-startup" });
    expect(result.summary!.failures.map(failure => failure.id)).toEqual(["vitest-package-startup", "startup-budget"]);
    expect(result.startup).toMatchObject({ persistent: ["windows-2025-node24/pi/warm"] });
    expect(result.startup!.entries.find(entry => entry.key === "windows-2025-node22/pi/warm")).toMatchObject({ verdict: "insufficient-overrun" });
  });
});
