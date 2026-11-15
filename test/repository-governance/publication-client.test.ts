import { readFile } from "node:fs/promises";
import { stripVTControlCharacters } from "node:util";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { describePublicationFailure, dispatchPublication, dispatchStableValidation, resolveDevelopPreview, waitForStableValidation } from "../../scripts/release/publication-client.mjs";

type Call = { executable: string; args: string[] };

function fakeRunner(responses: (call: Call) => string | Error) {
  const calls: Call[] = [];
  const run = (executable: string, args: string[]) => {
    const call = { executable, args };
    calls.push(call);
    const response = responses(call);
    if (response instanceof Error) throw response;
    return response;
  };
  return { run, calls };
}

const fixtureJobs = [
  { id: 1, name: "Validate win32-node24", status: "completed", conclusion: "failure" },
  { id: 2, name: "Validate linux-node24", status: "completed", conclusion: "success" },
  { id: 3, name: "Develop / Stage 0.1.8-dev.9 on npm", status: "completed", conclusion: "skipped" },
];
const jobsResponse = JSON.stringify([{ jobs: fixtureJobs }]);
const annotationPages = (...messages: string[]) => JSON.stringify([messages.map(message => ({ annotation_level: "failure", message }))]);
const annotationsResponse = annotationPages(
  "startup budget failed for pi warm: 2438ms exceeds 2000ms; dominant phases: ui-entry 741ms\nsecond line is dropped",
  "Process completed with exit code 1.",
  "startup budget failed for pi warm: 2438ms exceeds 2000ms; dominant phases: ui-entry 741ms",
);

function developmentRunner(snapshots: Array<{ status: string; conclusion: string | null; jobs: unknown[] }>) {
  let index = -1;
  return fakeRunner(({ args }) => {
    if (args[0] === "auth" || args[0] === "workflow") return "";
    if (args[0] === "run" && args[1] === "list") return JSON.stringify([{ databaseId: 42, displayTitle: "develop publication fixture-request" }]);
    if (args[1] === "repos/owner/app/actions/runs/42") return JSON.stringify(snapshots[Math.min(++index, snapshots.length - 1)]);
    if (args[1]?.includes("/jobs?")) return JSON.stringify([{ jobs: snapshots[Math.min(index, snapshots.length - 1)]!.jobs }]);
    if (args[1]?.includes("/annotations")) return annotationsResponse;
    throw new Error(`unexpected call ${args.join(" ")}`);
  });
}

const developmentOptions = { repository: "owner/app", requestId: "fixture-request", sleep: async () => {}, isTTY: false };

describe("development preview version", () => {
  const source = "b".repeat(40);
  const pulls = (number: number) => JSON.stringify([
    { number: 7, merged_at: null, base: { ref: "develop" }, merge_commit_sha: source },
    { number, merged_at: "2026-10-27T14:00:00Z", base: { ref: "develop" }, merge_commit_sha: source },
  ]);

  it("derives the version from the first-parent commit count and reports the merged pull request beside it", async () => {
    // Invariant: pull request 828 merged after 835, yet its count sorts above; the number is reported,
    // not encoded.
    await expect(resolveDevelopPreview(source, {
      manifestText: JSON.stringify({ name: "@timurproko/a1", version: "0.2.7-dev" }),
      repository: "owner/app",
      pullsText: pulls(828),
      commitCount: "1218\n",
    })).resolves.toEqual({ source, pullRequest: 828, version: "0.2.7-dev.1218", packageName: "@timurproko/a1" });
  });

  it("refuses a count that is not a positive integer", async () => {
    await expect(resolveDevelopPreview(source, {
      manifestText: JSON.stringify({ name: "@timurproko/a1", version: "0.2.7-dev" }),
      repository: "owner/app",
      pullsText: pulls(828),
      commitCount: "fatal: bad revision",
    })).rejects.toThrow(/could not count develop commits/u);
  });
});

describe("publication failure reporting", () => {
  it("names the failed jobs and their recorded messages once each without the generic exit-code line", () => {
    const { run, calls } = fakeRunner(({ args }) => {
      if (args[1]?.endsWith("/actions/runs/42/jobs?per_page=100")) return jobsResponse;
      if (args[1] === "repos/owner/app/check-runs/1/annotations") return annotationsResponse;
      throw new Error(`unexpected call ${args.join(" ")}`);
    });
    const message = describePublicationFailure(42, { run, repository: "owner/app" });
    expect(message).toBe([
      "Publication failed (run 42)",
      "  Windows validation (Node 24) [failure]",
      "    startup budget failed for pi warm: 2438ms exceeds 2000ms; dominant phases: ui-entry 741ms",
      "  Publication blocked before npm staging.",
      "  Next: inspect the full log and fix the failure before retrying.",
      "  Full log: https://github.com/owner/app/actions/runs/42",
    ].join("\n"));
    expect(calls[0]!.args).toContain("--paginate");
    expect(calls[1]!.args).toContain("--paginate");
    expect(calls.every(call => !(call.args.includes("--slurp") && call.args.includes("--jq")))).toBe(true);
    expect(calls.map(call => call.args[1])).toEqual(["repos/owner/app/actions/runs/42/jobs?per_page=100", "repos/owner/app/check-runs/1/annotations"]);
  });

  it("caps the report at ten lines and survives unreadable annotations", () => {
    const many = annotationPages(...Array.from({ length: 30 }, (_value, index) => `assertion ${index} failed`));
    const jobs = JSON.stringify([{ jobs: [{ id: 7, name: "PR core", conclusion: "failure" }] }, { jobs: [{ id: 8, name: "Rendering", conclusion: "failure" }] }]);
    const { run } = fakeRunner(({ args }) => {
      if (args[1]?.includes("/actions/runs/")) return jobs;
      if (args[1] === "repos/owner/app/check-runs/7/annotations") return many;
      return new Error("annotations unavailable");
    });
    const message = describePublicationFailure(9, { run, repository: "owner/app" });
    expect(message.split("\n").filter(line => line.includes("assertion"))).toHaveLength(10);
    expect(message).toContain("PR core [failure]");
    expect(message).toContain("Rendering [failure]");
    expect(message).toContain("Detailed failure evidence unavailable");
    expect(message).toContain("npm publication state is unknown");
  });

  it("prioritizes the macOS cause over derivative gates and preserves unknown failed jobs", () => {
    const queried: string[] = [];
    const message = describePublicationFailure(42, { repository: "owner/app", version: "0.2.7-dev.1312", jobs: [
      { id: 9, name: "Develop / Validate publication lanes", conclusion: "failure" },
      { id: 10, name: "Develop / Publication result", conclusion: "failure" },
      { id: 1, name: "Develop / Validate sequential (darwin-node24, macos-15, 24)", conclusion: "failure" },
      { id: 11, name: "Unexpected producer", conclusion: "timed_out" },
      { id: 3, name: "Develop / Stage 0.2.7-dev.1312 on npm", conclusion: "skipped" },
    ], run: (_executable, args) => {
      queried.push(args[1]!);
      return args[1]!.includes("/1/") ? annotationPages("Error: recovery guardian timed out", "Process completed with exit code 1.") : "[]";
    } });
    expect(message).toContain("macOS validation (Node 24) [failure]\n    Error: recovery guardian timed out");
    expect(message).toContain("Unexpected producer [timed_out]");
    expect(message).toContain("Downstream lane/result checks also failed.");
    expect(message).toContain("Publication blocked before npm staging.");
    expect(queried).toHaveLength(2);
    expect(queried.some(path => /\/(9|10)\//u.test(path))).toBe(false);
  });

  it.each(["failure", "cancelled", "success"])("does not claim nothing was published after npm staging %s", conclusion => {
    const message = describePublicationFailure(42, { repository: "owner/app", jobs: [
      { id: 3, name: "Develop / Stage 0.2.7-dev.1312 on npm", status: "completed", conclusion },
      { id: 4, name: "Develop / Publication result", conclusion: "failure" },
    ], run: () => "[]" });
    expect(message).toContain(`npm staging: ${conclusion}. Packages may already exist`);
    expect(message).not.toContain("blocked before npm");
    expect(message).not.toContain("nothing was published");
  });

  it.each(["[]", annotationPages("Process completed with exit code 1."), new Error("unavailable")])("retains aggregate-only failures when no primary cause is available", response => {
    const message = describePublicationFailure(42, { repository: "owner/app", jobs: [
      { id: 4, name: "Develop / Publication result", conclusion: "failure" },
    ], run: () => { if (response instanceof Error) throw response; return response; } });
    expect(message).toContain("Publication result [failure]");
    expect(message).toContain("Detailed failure evidence unavailable");
    expect(message).toContain("Full log: https://github.com/owner/app/actions/runs/42");
  });

  it("bounds and sanitizes diagnostic lines without terminal controls", () => {
    const diagnostic = `\u001b[31mrecovery failed\u001b[0m ${"x".repeat(1_000)}\ntrace omitted`;
    const message = describePublicationFailure(42, { repository: "owner/app", jobs: [
      { id: 1, name: "Bad\u001b[31m job\u001b[0m", conclusion: "failure" },
    ], run: () => annotationPages(diagnostic, diagnostic) });
    expect(message).not.toContain("\u001b");
    expect(message).not.toContain("trace omitted");
    expect(message.split("\n").filter(line => line.includes("recovery failed"))).toHaveLength(1);
    expect(message.split("\n").every(line => line.length <= 324)).toBe(true);
  });

  it("keeps a failed-run summary readable when the job API is unavailable", () => {
    const message = describePublicationFailure(42, { repository: "owner/app", run: () => { throw new Error("offline"); } });
    expect(message).toContain("Failed job details unavailable");
    expect(message).toContain("npm publication state is unknown");
    expect(message).toContain("Full log: https://github.com/owner/app/actions/runs/42");
  });

  it.each(["offline", "malformed"])("does not turn %s status observation into a publication failure", async kind => {
    const runner = developmentRunner([{ status: "in_progress", conclusion: null, jobs: [] }]);
    const run = (executable: string, args: string[]) => {
      if (args[1] === "repos/owner/app/actions/runs/42") {
        if (kind === "offline") throw new Error("network error");
        return "{}";
      }
      return runner.run(executable, args);
    };
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      ...developmentOptions, run, write: () => {},
    })).rejects.toThrow(/Stopped watching.*GitHub status unavailable.*Remote outcome unknown/);
  });

  it("interrupts compact watching without cancelling or misreporting the remote run", async () => {
    const controller = new AbortController();
    const before = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
    const { run, calls } = developmentRunner([{ status: "in_progress", conclusion: null, jobs: [] }]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      ...developmentOptions, run, signal: controller.signal, write: () => {}, sleep: async () => { controller.abort(); },
    })).rejects.toThrow(/Stopped watching.*interrupted.*Remote outcome unknown/);
    expect(calls.some(call => call.args.includes("cancel"))).toBe(false);
    expect([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")]).toEqual(before);
  });

  it("prints the version and log URL, then throws the readable primary failure", async () => {
    const output: string[] = [];
    const { run, calls } = developmentRunner([{ status: "completed", conclusion: "failure", jobs: fixtureJobs }]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      ...developmentOptions, run, write: (text: string) => { output.push(text); },
    })).rejects.toThrow(/^Publication failed: 0.1.8-dev.9 \(run 42\)\n  Windows validation \(Node 24\) \[failure\]\n    startup budget failed/);
    expect(output[0]).toBe("[publication] 0.1.8-dev.9 — run 42\n  Full log: https://github.com/owner/app/actions/runs/42\n\n");
    expect(calls.some(call => call.args[0] === "run" && call.args[1] === "watch")).toBe(false);
  });

  it("dispatches development publication only through the dedicated wrapper", async () => {
    const { run, calls } = developmentRunner([{ status: "completed", conclusion: "success", jobs: [] }]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      run, repository: "owner/app", requestId: "fixture-request", write: () => {}, sleep: async () => {},
    })).resolves.toBe(42);
    const dispatch = calls.find(call => call.args[0] === "workflow" && call.args[1] === "run")!;
    expect(dispatch.args).toEqual([
      "workflow", "run", "develop.yml", "--ref", "develop",
      "-f", `source_sha=${"a".repeat(40)}`, "-f", "request_id=fixture-request",
    ]);
  });

  it("refuses stable publication through the development dispatcher", async () => {
    await expect(dispatchPublication("stable" as never, "a".repeat(40), "0.1.8", { run: () => "" }))
      .rejects.toThrow(/publishes the prepared draft Release/i);
  });

  const source = "a".repeat(40);
  const validationRun = (id: number, requestId: string, change: Record<string, unknown> = {}) => ({
    id, path: ".github/workflows/release-candidate.yml", event: "workflow_dispatch", head_branch: "develop", head_sha: source,
    display_title: `Stable candidate v0.1.8 ${requestId}`, status: "in_progress", conclusion: null,
    html_url: `https://github.com/owner/app/actions/runs/${id}`, ...change,
  });
  const validationRunner = (existing: unknown[], started: unknown) => {
    let dispatched = false;
    return fakeRunner(({ args }) => {
      if (args[0] === "auth") return "";
      if (args[0] === "api" && String(args[1]).startsWith("repos/owner/app/actions/workflows/release-candidate.yml/runs?")) {
        return JSON.stringify({ workflow_runs: dispatched ? [...existing, started] : existing });
      }
      if (args[0] === "workflow" && args[1] === "run") { dispatched = true; return ""; }
      throw new Error(`unexpected call ${args.join(" ")}`);
    });
  };

  it("starts candidate validation of the prepared source and returns without watching it", async () => {
    const { run, calls } = validationRunner([], validationRun(51, "fixture-request"));
    await expect(dispatchStableValidation({ repository: "owner/app", source, version: "0.1.8" }, { run, requestId: "fixture-request", sleep: async () => {} }))
      .resolves.toEqual({ runId: 51, url: "https://github.com/owner/app/actions/runs/51", reused: false });
    const dispatch = calls.find(call => call.args[0] === "workflow" && call.args[1] === "run")!;
    expect(dispatch.args).toEqual(["workflow", "run", "release-candidate.yml", "--ref", "develop",
      "-f", `source_sha=${source}`, "-f", "version=0.1.8", "-f", "request_id=fixture-request"]);
    expect(calls.some(call => call.args[0] === "run" && call.args[1] === "watch")).toBe(false);
  });

  it.each([
    ["running", {}],
    ["successful", { status: "completed", conclusion: "success" }],
  ])("reuses a %s validation of the same source and version", async (_name, change) => {
    const { run, calls } = validationRunner([validationRun(50, "earlier", change)], null);
    await expect(dispatchStableValidation({ repository: "owner/app", source, version: "0.1.8" }, { run, sleep: async () => {} }))
      .resolves.toEqual({ runId: 50, url: "https://github.com/owner/app/actions/runs/50", reused: true });
    expect(calls.some(call => call.args[0] === "workflow")).toBe(false);
  });

  it("starts a new validation when the previous one failed", async () => {
    const { run } = validationRunner([validationRun(50, "earlier", { status: "completed", conclusion: "failure" })], validationRun(51, "fixture-request"));
    await expect(dispatchStableValidation({ repository: "owner/app", source, version: "0.1.8" }, { run, requestId: "fixture-request", sleep: async () => {} }))
      .resolves.toMatchObject({ runId: 51, reused: false });
  });

  it("rejects a correlated run that validates another source or branch", async () => {
    const { run } = validationRunner([], validationRun(52, "fixture-request", { head_branch: "feature" }));
    await expect(dispatchStableValidation({ repository: "owner/app", source, version: "0.1.8" }, { run, requestId: "fixture-request", sleep: async () => {} }))
      .rejects.toThrow(/does not match/);
  });

  it("reports changed job states once without setup or teardown step dumps", async () => {
    const job = { id: 1, name: "Develop / Validate sequential (darwin-node24, macos-15, 24)", status: "in_progress", conclusion: null,
      steps: [{ name: "Set up job", conclusion: "success" }] };
    const output: string[] = [];
    const { run, calls } = developmentRunner([
      { status: "queued", conclusion: null, jobs: [] },
      { status: "in_progress", conclusion: null, jobs: [job] },
      { status: "in_progress", conclusion: null, jobs: [job] },
      { status: "completed", conclusion: "success", jobs: [{ ...job, status: "completed", conclusion: "success" }] },
    ]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...developmentOptions, run, write: (text: string) => { output.push(text); },
    })).resolves.toBe(42);
    expect(output).toEqual([
      "[publication] 0.1.8-dev.10 — run 42\n  Full log: https://github.com/owner/app/actions/runs/42\n\n",
      "  ● Running: macOS validation (Node 24)\n",
      "  ● Passed:  macOS validation (Node 24)\n",
      "  Workflow passed; verifying npm packages.\n",
    ]);
    expect(calls.some(call => call.args[1] === "watch")).toBe(false);
    expect(calls.filter(call => call.args[1]?.includes("/jobs?")).every(call => call.args.includes("--paginate"))).toBe(true);
  });

  it("keeps the publication header once and every changed job on its own aligned line", async () => {
    const jobs = Array.from({ length: 6 }, (_unused, index) => ({ id: index + 1, name: `Build fixture ${index + 1}`, status: "in_progress", conclusion: null }));
    const output: string[] = [];
    const { run } = developmentRunner([
      { status: "in_progress", conclusion: null, jobs },
      { status: "completed", conclusion: "success", jobs: jobs.map(job => ({ ...job, status: "completed", conclusion: "success" })) },
    ]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", { ...developmentOptions, run, write: text => { output.push(text); } });
    const text = output.join("");
    expect(text.match(/\[publication\]/gu)).toHaveLength(1);
    expect(text.match(/0\.1\.8-dev\.10/gu)).toHaveLength(1);
    expect(text).not.toContain("more)");
    expect(text).not.toContain("\u001b");
    const progress = text.split("\n").filter(line => line.includes("●"));
    expect(progress).toHaveLength(12);
    expect(progress.every(line => line.indexOf("Build fixture") === 13)).toBe(true);
    expect(progress.filter(line => line.endsWith("Build fixture 6"))).toHaveLength(2);
    expect(progress.every(line => !line.includes(","))).toBe(true);
  });

  it("colors only the single-column dot and leaves aligned labels and job names neutral", async () => {
    const jobs = [
      { id: 1, name: "Running job", status: "in_progress", conclusion: null },
      { id: 2, name: "Passed job", status: "completed", conclusion: "success" },
      { id: 3, name: "Failed job", status: "completed", conclusion: "failure" },
      { id: 4, name: "Develop / Stage 0.1.8-dev.10 on npm", status: "completed", conclusion: "skipped" },
    ];
    const output: string[] = [];
    const { run } = developmentRunner([
      { status: "in_progress", conclusion: null, jobs },
      { status: "completed", conclusion: "failure", jobs: jobs.map(job => job.id === 1 ? { ...job, status: "completed", conclusion: "failure" } : job) },
    ]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...developmentOptions, run, isTTY: true, environment: { TERM: "xterm-256color" }, write: text => { output.push(text); },
    })).rejects.toThrow("Publication failed");
    expect(output.slice(1, 5)).toEqual([
      "  \u001b[33m●\u001b[39m Running: Running job\n",
      "  \u001b[32m●\u001b[39m Passed:  Passed job\n",
      "  \u001b[31m●\u001b[39m Failed:  Failed job\n",
      "  \u001b[90m●\u001b[39m Skipped: npm staging\n",
    ]);
    const text = output.join("");
    expect(text.replace(/\u001b\[(?:31|32|33|39|90)m/gu, "")).toBe(stripVTControlCharacters(text));
    const progress = output.filter(line => line.includes("●")).map(line => stripVTControlCharacters(line));
    expect(progress.every(line => /^  ● (?:Running: |Passed:  |Failed:  |Skipped: )/u.test(line))).toBe(true);
    expect(text.match(/\[publication\]/gu)).toHaveLength(1);
  });

  it.each([
    ["redirected output", false, { TERM: "xterm-256color", FORCE_COLOR: "1" }],
    ["NO_COLOR", true, { TERM: "xterm-256color", NO_COLOR: "1" }],
    ["empty NO_COLOR", true, { TERM: "xterm-256color", NO_COLOR: "" }],
    ["dumb terminal", true, { TERM: "dumb" }],
    ["FORCE_COLOR=0", true, { TERM: "xterm-256color", FORCE_COLOR: "0" }],
  ] as const)("keeps %s readable without ANSI color", async (_name, isTTY, environment) => {
    const output: string[] = [];
    const { run } = developmentRunner([{ status: "completed", conclusion: "success", jobs: [
      { id: 1, name: "Passed job", status: "completed", conclusion: "success" },
    ] }]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", { ...developmentOptions, run, isTTY, environment, write: text => { output.push(text); } });
    expect(output.join("")).not.toContain("\u001b");
    expect(output).toContain("  ● Passed:  Passed job\n");
  });

  it.each(["failure", "timed_out", "cancelled", "action_required", "startup_failure", "stale"])("renders %s as a red failed dot without changing the failure outcome", async conclusion => {
    const output: string[] = [];
    const { run } = developmentRunner([{ status: "completed", conclusion: "failure", jobs: [
      { id: 1, name: "Failed job", status: "completed", conclusion },
    ] }]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...developmentOptions, run, isTTY: true, environment: { TERM: "xterm" }, write: text => { output.push(text); },
    })).rejects.toThrow(`Failed job [${conclusion}]`);
    expect(output).toContain("  \u001b[31m●\u001b[39m Failed:  Failed job\n");
  });

  it("reports meaningful skips once while suppressing inactive optional jobs and derivative gates", async () => {
    const inactive = ["Snapshot the stable Release note", "Full documentation review", "Validate Windows shard (win32-node24)", "Reconstruct Windows lane", "Complete stable release records"].map((name, index) => ({ id: index + 10, name, status: "completed", conclusion: "skipped" }));
    const jobs = [
      ...inactive,
      { id: 1, name: "Full documentation review", status: "in_progress", conclusion: null },
      { id: 2, name: "Develop / Stage 0.1.8-dev.10 on npm", status: "completed", conclusion: "skipped" },
      { id: 3, name: "Develop / Publication result", status: "completed", conclusion: "failure" },
    ];
    const output: string[] = [];
    const { run } = developmentRunner([
      { status: "in_progress", conclusion: null, jobs },
      { status: "in_progress", conclusion: null, jobs },
      { status: "completed", conclusion: "failure", jobs: jobs.map(job => job.id === 1 ? { ...job, status: "completed", conclusion: "skipped" } : job) },
    ]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...developmentOptions, run, write: text => { output.push(text); },
    })).rejects.toThrow("Publication blocked before npm staging.");
    expect(output.filter(line => line.includes("●"))).toEqual([
      "  ● Running: Full documentation review\n",
      "  ● Skipped: npm staging\n",
      "  ● Skipped: Full documentation review\n",
    ]);
  });

  it("summarizes a failed publication in the result job before the unchanged outcome requirement", async () => {
    const workflow = parse(await readFile(".github/workflows/publish.yml", "utf8"));
    const steps = workflow.jobs.result.steps as { name: string; if?: string; uses?: string; with?: Record<string, string>; run?: string }[];
    expect(steps.map(step => step.name)).toEqual(["Download validation evidence for the failure summary", "Summarize the failed outcome", "Require the selected outcome"]);
    const [download, summary, require] = steps as [typeof steps[number], typeof steps[number], typeof steps[number]];
    for (const step of [download, summary]) {
      expect(step.if).toContain("always() && needs.plan.outputs.work == 'true'");
      expect(step.if).toContain("needs.validate.result != 'success'");
      expect(step.if).toContain("needs.package.result != 'success'");
    }
    expect(download.uses).toBe("actions/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131");
    expect(download.with?.pattern).toBe("release-validation-${{ needs.plan.outputs.version }}-*");
    expect(summary.run).toContain("/actions/runs/${process.env.GITHUB_RUN_ID}/jobs");
    expect(summary.run).toContain("a1-validation-outcomes-v1");
    expect(summary.run).toContain("a1-startup-performance-evidence-v1");
    expect(summary.run).toContain("budgetViolations");
    expect(require.if).toBeUndefined();
    expect(require.run).toContain('test "$VALIDATE" = success');
    expect(require.run).toContain('if [ "$MODE" = stable ]; then test "$VALIDATE" = skipped; else test "$VALIDATE" = success; fi');
    expect(require.run).toContain('if [ "$MODE" != candidate ]; then');
    expect(require.run).toContain('test "$PROMOTE" = success');
    expect(require.run).toContain('test "$PUBLISH" = success');
    expect(require.run).toContain('test "$POST_PUBLISH" = success');
    expect(require.run).toContain('test "$COMPLETE" = success');
    expect(require.run).not.toContain("REOPEN");
  });
});

describe("stable candidate validation waiting", () => {
  const watched = (watch: "success" | Error, status: string, conclusion: string | null) => fakeRunner(({ args }) => {
    if (args[0] === "run" && args[1] === "watch") return watch === "success" ? "" : watch;
    if (args[0] === "api" && args[1] === "repos/owner/app/actions/runs/51") return JSON.stringify({ id: 51, status, conclusion });
    if (args[0] === "api" && String(args[1]).includes("/jobs")) return JSON.stringify([{ jobs: [{ id: 7, name: "Validate linux-node24", conclusion: "failure" }] }]);
    if (args[0] === "api" && String(args[1]).includes("/annotations")) return annotationPages("expected 1 to be 2");
    throw new Error(`unexpected call ${args.join(" ")}`);
  });

  it("keeps the stable candidate live job list through gh run watch and returns the successful run", async () => {
    const { run, calls } = watched("success", "completed", "success");
    await expect(waitForStableValidation({ repository: "owner/app", runId: 51 }, { run })).resolves.toMatchObject({ conclusion: "success" });
    expect(calls[0]).toEqual({
      executable: "gh",
      args: ["run", "watch", "51", "--repo", "owner/app", "--exit-status", "--interval", "10"],
    });
  });

  it("throws the failed jobs and reasons when validation fails", async () => {
    const { run } = watched(new Error("exit status 1"), "completed", "failure");
    await expect(waitForStableValidation({ repository: "owner/app", runId: 51 }, { run }))
      .rejects.toThrow(/Linux validation \(Node 24\) \[failure\]\n    expected 1 to be 2/);
  });

  it("reports that validation keeps running when watching stops early", async () => {
    const { run } = watched(new Error("interrupted"), "in_progress", null);
    await expect(waitForStableValidation({ repository: "owner/app", runId: 51 }, { run }))
      .rejects.toThrow(/stopped watching validation run 51 while it is in progress; it keeps running/);
  });
});
