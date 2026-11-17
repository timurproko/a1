import { readFile } from "node:fs/promises";
import { stripVTControlCharacters } from "node:util";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { describePublicationFailure, dispatchPublication, dispatchStableValidation, resolveDevelopPreview, waitForStableValidation } from "../../scripts/release/publication-client.mjs";
import { replayTerminalCheckpoints, replayTerminalPaint } from "../support/rendering/terminal-paint-evidence.js";

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

function developmentRunner(snapshots: Array<{ status: string; conclusion: string | null; jobs: unknown[] }>, annotations = annotationsResponse) {
  let index = -1;
  return fakeRunner(({ args }) => {
    if (args[0] === "auth" || args[0] === "workflow") return "";
    if (args[0] === "run" && args[1] === "list") return JSON.stringify([{ databaseId: 42, displayTitle: "develop publication fixture-request" }]);
    if (args[1] === "repos/owner/app/actions/runs/42") return JSON.stringify(snapshots[Math.min(++index, snapshots.length - 1)]);
    if (args[1]?.includes("/jobs?")) return JSON.stringify([{ jobs: snapshots[Math.min(index, snapshots.length - 1)]!.jobs }]);
    if (args[1]?.includes("/annotations")) return annotations;
    throw new Error(`unexpected call ${args.join(" ")}`);
  });
}

const developmentOptions = { repository: "owner/app", requestId: "fixture-request", sleep: async () => {}, isTTY: false };
const publicationSteps = (...statuses: string[]) => statuses.map((status, index) => ({
  name: index === 0 ? "Set up job" : `Step ${index + 1}`, number: index * 3 + 1, status,
  conclusion: status === "completed" ? "success" : null,
}));

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
      "Full log: https://github.com/owner/app/actions/runs/42",
      "",
      "  * Windows validation (Node 24) [failure]",
      "  * startup budget failed for pi warm: 2438ms exceeds 2000ms; dominant phases: ui-entry 741ms",
      "  * Publication blocked before npm staging.",
      "  * Next: inspect the full log and fix the failure before retrying.",
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
    expect(message.split("\n").slice(3).every(line => line.startsWith("  * "))).toBe(true);
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
    expect(message).toContain("macOS validation (Node 24) [failure]\n  * Error: recovery guardian timed out");
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
    expect(message.split("\n").slice(0, 3)).toEqual(["Publication failed (run 42)", "Full log: https://github.com/owner/app/actions/runs/42", ""]);
    expect(message.split("\n").slice(3).every(line => line.startsWith("  * "))).toBe(true);
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
    })).rejects.toThrow(/Stopped watching.*GitHub status unavailable\.\nRemote outcome unknown/u);
  });

  it("interrupts compact watching without cancelling or misreporting the remote run", async () => {
    const controller = new AbortController();
    const before = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
    const { run, calls } = developmentRunner([{ status: "in_progress", conclusion: null, jobs: [] }]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      ...developmentOptions, run, signal: controller.signal, write: () => {}, sleep: async () => { controller.abort(); },
    })).rejects.toThrow(/Stopped watching.*interrupted\.\nRemote outcome unknown/u);
    expect(calls.some(call => call.args.includes("cancel"))).toBe(false);
    expect([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")]).toEqual(before);
  });

  it("renders the development transcript with failure bullets aligned to status dots", async () => {
    const windows = { id: 1, name: "Develop / Published pair (win32-node24, windows-2025, 24)", status: "in_progress", conclusion: null };
    const linux = { id: 2, name: "Develop / Published pair (linux-node24, ubuntu-24.04, 24)", status: "in_progress", conclusion: null };
    const staging = { id: 3, name: "Develop / Stage 0.1.8-dev.9 on npm", status: "completed", conclusion: "success" };
    const output: string[] = [];
    const { run } = developmentRunner([
      { status: "in_progress", conclusion: null, jobs: [staging, windows, linux] },
      { status: "completed", conclusion: "failure", jobs: [
        staging,
        { ...windows, status: "completed", conclusion: "failure" },
        { ...linux, status: "completed", conclusion: "success" },
        { id: 4, name: "Develop / Publication result", status: "completed", conclusion: "failure" },
      ] },
    ], "[]");
    const error = await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      ...developmentOptions, run, write: text => { output.push(text); },
    }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    const transcript = `[develop] requesting 0.1.8-dev.9 for ${"a".repeat(40)}\n${output.join("")}[develop] ${(error as Error).message}\n`;
    expect(transcript).toBe([
      `[develop] requesting 0.1.8-dev.9 for ${"a".repeat(40)}`,
      "",
      "[publication] 0.1.8-dev.9 — run 42",
      "Full log: https://github.com/owner/app/actions/runs/42",
      "",
      "  ● Passed:  npm staging",
      "  ● Running: Published pair (win32-node24, windows-2025, 24)",
      "  ● Running: Published pair (linux-node24, ubuntu-24.04, 24)",
      "  ● Failed:  Published pair (win32-node24, windows-2025, 24)",
      "  ● Passed:  Published pair (linux-node24, ubuntu-24.04, 24)",
      "",
      "[develop] Publication failed: 0.1.8-dev.9 (run 42)",
      "Full log: https://github.com/owner/app/actions/runs/42",
      "",
      "  * Published pair (win32-node24, windows-2025, 24) [failure]",
      "  * Detailed failure evidence unavailable; see the full log.",
      "  * Downstream lane/result checks also failed.",
      "  * npm staging: success. Packages may already exist; inspect the registry before retrying.",
      "  * Next: fix the failure, then rerun npm run develop after checking the run above.",
      "",
    ].join("\n"));
    expect(transcript.match(/\[publication\]/gu)).toHaveLength(1);
    expect(transcript.match(/\[develop\] Publication failed:/gu)).toHaveLength(1);
    expect(transcript.match(/^Full log:/gmu)).toHaveLength(2);
    expect(transcript).not.toContain("\u001b");
  });

  it("uses uniform bullets even when job and diagnostic limits truncate the summary", () => {
    const message = describePublicationFailure(42, { repository: "owner/app", jobs: Array.from({ length: 6 }, (_unused, index) => ({
      id: index + 1, name: `Failed owner ${index + 1}`, conclusion: "failure",
    })), run: () => annotationPages(...Array.from({ length: 12 }, (_unused, index) => `Error ${index + 1}`)) });
    expect(message.split("\n").slice(3).every(line => line.startsWith("  * "))).toBe(true);
    expect(message.match(/^  \* Error /gmu)).toHaveLength(10);
    expect(message).toContain("  * Additional diagnostics in the full log.");
    expect(message).toContain("  * 2 additional failed jobs in the full log.");
    expect(message.match(/^Full log:/gmu)).toHaveLength(1);
    expect(message).not.toContain("●");
  });

  it("keeps unknown-outcome observation log links unindented", async () => {
    const controller = new AbortController();
    const { run } = developmentRunner([{ status: "in_progress", conclusion: null, jobs: [] }]);
    const error = await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      ...developmentOptions, run, signal: controller.signal, sleep: async () => { controller.abort(); }, write: () => {},
    }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Remote outcome unknown.*\nFull log: https:\/\/github.com\/owner\/app\/actions\/runs\/42$/u);
    expect((error as Error).message).not.toContain("Publication failed");
  });

  it("prints the version and log URL, then throws the readable primary failure", async () => {
    const output: string[] = [];
    const { run, calls } = developmentRunner([{ status: "completed", conclusion: "failure", jobs: fixtureJobs }]);
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      ...developmentOptions, run, write: (text: string) => { output.push(text); },
    })).rejects.toThrow(/^Publication failed: 0.1.8-dev.9 \(run 42\)\nFull log: https:\/\/github.com\/owner\/app\/actions\/runs\/42\n\n  \* Windows validation \(Node 24\) \[failure\]\n  \* startup budget failed/);
    expect(output[0]).toBe("\n[publication] 0.1.8-dev.9 — run 42\nFull log: https://github.com/owner/app/actions/runs/42\n\n");
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
      "\n[publication] 0.1.8-dev.10 — run 42\nFull log: https://github.com/owner/app/actions/runs/42\n\n",
      "  ● Running: macOS validation (Node 24)\n",
      "  ● Passed:  macOS validation (Node 24)\n",
      "\n",
      "[workflow] passed; verifying npm packages.\n",
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

describe("publication workflow-step counters", () => {
  it.each([
    [false, { TERM: "xterm" }, "queued"],
    [false, { TERM: "xterm" }, "pending"],
    [true, { TERM: "dumb" }, "queued"],
    [true, { TERM: "dumb" }, "pending"],
  ])("appends only changed counters or states without step dumps (TTY %s, environment %j, future steps %s)", async (isTTY, environment, futureStatus) => {
    const mac = { id: 1, name: "macOS validation (Node 24)", status: "in_progress", conclusion: null,
      steps: publicationSteps("in_progress", futureStatus, futureStatus) };
    const windows = { ...mac, id: 2, name: "Windows validation (Node 24)", steps: publicationSteps("completed", "in_progress") };
    const advanced = { ...mac, steps: publicationSteps("completed", "in_progress", futureStatus) };
    const output: string[] = [];
    const { run, calls } = developmentRunner([
      { status: "in_progress", conclusion: null, jobs: [mac, windows] },
      { status: "in_progress", conclusion: null, jobs: [advanced, windows] },
      { status: "in_progress", conclusion: null, jobs: [windows, advanced] },
      { status: "completed", conclusion: "success", jobs: [advanced, windows].map(job => ({ ...job, status: "completed", conclusion: "success" })) },
    ]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...developmentOptions, run, isTTY, environment, write: text => { output.push(text); },
    });
    expect(output.filter(line => line.includes("●"))).toEqual([
      "  ● Running: macOS validation (Node 24) (1/3)\n",
      "  ● Running: Windows validation (Node 24) (2/2)\n",
      "  ● Running: macOS validation (Node 24) (2/3)\n",
      "  ● Passed:  macOS validation (Node 24) (3/3)\n",
      "  ● Passed:  Windows validation (Node 24) (2/2)\n",
    ]);
    expect(output.join("")).not.toMatch(/Set up job|Step 2|\u001b/u);
    expect(calls.filter(call => call.args[1]?.includes("/jobs?"))).toHaveLength(4);
  });

  it.each([
    ["not started", publicationSteps("queued", "queued"), "in_progress", null, " (0/2)"],
    ["all pending", publicationSteps("pending", "pending"), "in_progress", null, " (0/2)"],
    ["mixed not-started statuses", publicationSteps("completed", "pending", "queued"), "in_progress", null, " (1/3)"],
    ["running before pending steps", publicationSteps("completed", "in_progress", "pending"), "in_progress", null, " (2/3)"],
    ["failed with pending steps", publicationSteps("completed", "pending"), "completed", "failure", " (1/2)"],
    ["skipped step", [{ ...publicationSteps("completed")[0]!, conclusion: "skipped" }, ...publicationSteps("queued")], "in_progress", null, " (1/2)"],
    ["failed before pending steps", publicationSteps("completed", "queued"), "completed", "failure", " (1/2)"],
    ["all steps settled after failure", publicationSteps("completed", "completed"), "completed", "failure", " (2/2)"],
    ["successful", publicationSteps("completed", "completed"), "completed", "success", " (2/2)"],
    ["wholly skipped", publicationSteps("completed"), "completed", "skipped", ""],
    ["absent steps", undefined, "in_progress", null, ""],
    ["empty steps", [], "in_progress", null, ""],
    ["non-array steps", {}, "in_progress", null, ""],
    ["null step", [null], "in_progress", null, ""],
    ["missing step status", [{ name: "Setup" }], "in_progress", null, ""],
    ["unknown step status", publicationSteps("unknown"), "in_progress", null, ""],
    ["unknown status alongside live steps", publicationSteps("completed", "in_progress", "unknown"), "in_progress", null, ""],
  ])("renders %s metadata without inventing passed checks", async (_name, steps, status, conclusion, counter) => {
    const output: string[] = [];
    const { run } = developmentRunner([{ status: "completed", conclusion: conclusion === "failure" ? "failure" : "success", jobs: [
      { id: 1, name: "Build", status, conclusion, steps },
    ] }]);
    const result = dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...developmentOptions, run, write: text => { output.push(text); },
    });
    if (conclusion === "failure") await expect(result).rejects.toThrow("Build [failure]");
    else await result;
    const label = conclusion === "failure" ? "Failed: " : conclusion === "success" ? "Passed: " : conclusion === "skipped" ? "Skipped:" : "Running:";
    expect(output.filter(line => line.includes("●"))).toEqual([`  ● ${label} Build${counter}\n`]);
  });

  it("refreshes when step metadata becomes available or its total changes", async () => {
    const entry = { id: 1, name: "Build", status: "in_progress", conclusion: null };
    const output: string[] = [];
    const { run } = developmentRunner([
      { status: "in_progress", conclusion: null, jobs: [entry] },
      { status: "in_progress", conclusion: null, jobs: [{ ...entry, steps: publicationSteps("in_progress") }] },
      { status: "completed", conclusion: "success", jobs: [{ ...entry, steps: publicationSteps("in_progress", "queued") }] },
    ]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", { ...developmentOptions, run, write: text => { output.push(text); } });
    expect(output.filter(line => line.includes("●"))).toEqual([
      "  ● Running: Build\n", "  ● Running: Build (1/1)\n", "  ● Running: Build (1/2)\n",
    ]);
  });
});

describe("interactive development publication rows", () => {
  const size = { columns: 120, rows: 40 };
  const interactiveOptions = { ...developmentOptions, isTTY: true, environment: { TERM: "xterm-256color" }, terminalSize: () => size };
  const terminalWrites = (output: string[]) => output.map((data, atMs) => ({ data: data.replace(/\n/gu, "\r\n"), atMs }));
  const replay = (output: string[], geometry = size) => replayTerminalPaint(terminalWrites(output), {
    ...geometry, synchronizedUpdates: "honor", captureStyles: true,
  });
  const job = (id: number, name: string) => ({ id, name, status: "in_progress", conclusion: null });
  const complete = (entry: ReturnType<typeof job>, conclusion = "success") => ({ ...entry, status: "completed", conclusion });
  const snapshot = (jobs: unknown[], status = "in_progress", conclusion: string | null = null) => ({ jobs, status, conclusion });

  it("replaces yellow Running rows with green Passed rows without duplicates or reordered identities", async () => {
    const resizeListeners = process.stdout.listenerCount("resize");
    const linux = job(1, "Linux validation (Node 24)");
    const mac = job(2, "macOS validation (Node 24)");
    const windows = job(3, "Windows validation (Node 24)");
    const output: string[] = [];
    const pollWrites: number[] = [];
    const { run } = developmentRunner([
      snapshot([linux, mac]),
      snapshot([mac, linux, complete(job(99, "Full documentation review"), "skipped"), complete(job(98, "Publication result"))]),
      snapshot([mac, complete(linux), windows]),
      snapshot([complete(windows), complete(mac), complete(linux)], "completed", "success"),
    ]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, run, write: text => { output.push(text); }, sleep: async () => { pollWrites.push(output.length); },
    });
    expect(process.stdout.listenerCount("resize")).toBe(resizeListeners);
    expect(pollWrites).toEqual([3, 3, 5]);
    const first = await replay(output.slice(0, 3));
    expect(first.final.rows.filter(line => line.includes("●"))).toEqual([
      "  ● Running: Linux validation (Node 24)", "  ● Running: macOS validation (Node 24)",
    ]);
    expect(first.finalStyles?.map(cell => cell.colors[1])).toEqual([3, 3]);
    const final = await replay(output);
    expect(final.final.rows.filter(line => line.includes("●"))).toEqual([
      "  ● Passed:  Linux validation (Node 24)", "  ● Passed:  macOS validation (Node 24)", "  ● Passed:  Windows validation (Node 24)",
    ]);
    expect(final.finalStyles?.map(cell => [cell.column, cell.colors[1]])).toEqual([[3, 2], [3, 2], [3, 2]]);
    expect(final.final.rows.filter(line => line.startsWith("[publication]"))).toHaveLength(1);
    expect(final.final.rows.filter(line => line.startsWith("Full log:"))).toHaveLength(1);
    const lastJob = final.final.rows.findIndex(line => line.includes("Windows validation"));
    expect(final.final.rows[lastJob + 1]).toBe("");
    expect(final.final.rows[lastJob + 2]).toBe("[workflow] passed; verifying npm packages.");
    expect(final.final.cursor).toEqual({ row: lastJob + 4, column: 1 });
  });

  it.each([16, 40, 120].flatMap(columns => ["queued", "pending"].map(futureStatus => ({ columns, futureStatus }))))("updates counters in place at $columns columns with $futureStatus future steps", async ({ columns, futureStatus }) => {
    const geometry = { columns, rows: 40 };
    const mac = { ...job(1, "macOS validation (Node 24)"), steps: publicationSteps("in_progress", futureStatus, futureStatus) };
    const advanced = { ...mac, steps: publicationSteps("completed", "in_progress", futureStatus) };
    const windows = { ...job(2, "Windows validation (Node 24)"), steps: publicationSteps("completed", "in_progress") };
    const output: string[] = [];
    const polls: number[] = [];
    const { run } = developmentRunner([
      snapshot([mac, windows]), snapshot([advanced, windows]), snapshot([windows, advanced]),
      snapshot([{ ...complete(advanced), steps: publicationSteps("completed", "completed", "completed") }, complete(windows)], "completed", "success"),
    ]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, terminalSize: () => geometry, run, write: text => { output.push(text); }, sleep: async () => { polls.push(output.length); },
    });
    expect(polls).toEqual([3, 4, 4]);
    const initial = await replay(output.slice(0, 3), geometry);
    const running = await replay(output.slice(0, 4), geometry);
    const final = await replay(output, geometry);
    const rows = final.final.rows.filter(line => line.includes("●"));
    expect(rows).toHaveLength(2);
    expect(rows.every(line => line.startsWith("  ● Passed:  ") && line.length < columns)).toBe(true);
    if (columns >= 40) {
      expect(initial.final.rows.filter(line => line.includes("●")).map(line => line.slice(-5))).toEqual(["(1/3)", "(2/2)"]);
      expect(running.final.rows.filter(line => line.includes("●")).map(line => line.slice(-5))).toEqual(["(2/3)", "(2/2)"]);
      expect(rows.map(line => line.slice(-5))).toEqual(["(3/3)", "(2/2)"]);
    }
    if (columns === 40) expect(rows.every(line => line.includes("…"))).toBe(true);
    expect(final.finalStyles?.map(cell => [cell.column, cell.colors[1]])).toEqual([[3, 2], [3, 2]]);
    const lastJob = final.final.rows.findLastIndex(line => line.includes("●"));
    // Platform: the success line wraps in tiny terminals; inspect the rows before it is written.
    const beforeFooter = await replay(output.slice(0, -1), geometry);
    expect(beforeFooter.final.rows[lastJob + 1]).toBe("");
  });

  it("keeps jobs with identical names separate by their job IDs", async () => {
    const first = job(1, "Build");
    const second = job(2, "Build");
    const output: string[] = [];
    const { run } = developmentRunner([snapshot([first, second]), snapshot([complete(second), first]), snapshot([complete(first), complete(second)], "completed", "success")]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", { ...interactiveOptions, run, write: text => { output.push(text); } });
    const final = await replay(output);
    expect(final.final.rows.filter(line => line.includes("●"))).toEqual(["  ● Passed:  Build", "  ● Passed:  Build"]);
    expect(output).toContain("\u001b[1A\r\u001b[2K  \u001b[32m●\u001b[39m Passed:  Build\u001b[1B\r");
  });

  it.each([{ NO_COLOR: "" }, { NO_COLOR: "1" }, { FORCE_COLOR: "0" }])("updates neutral rows with color opt-out %j", async environment => {
    const entry = job(1, "Build");
    const output: string[] = [];
    const { run } = developmentRunner([snapshot([entry]), snapshot([complete(entry)], "completed", "success")]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, environment: { TERM: "xterm", ...environment }, run, write: text => { output.push(text); },
    });
    expect(output).toContain("\u001b[1A\r\u001b[2K  ● Passed:  Build\u001b[1B\r");
    expect(output.join("")).not.toMatch(/\u001b\[\d+m/u);
    const final = await replay(output);
    expect(final.final.rows.filter(line => line.includes("●"))).toEqual(["  ● Passed:  Build"]);
    expect(final.finalStyles).toEqual([]);
  });

  it("updates failures and meaningful skips in place before the separate unchanged failure footer", async () => {
    const resizeListeners = process.stdout.listenerCount("resize");
    const conclusions = ["failure", "timed_out", "cancelled", "action_required", "startup_failure", "stale"];
    const jobs = conclusions.map((_conclusion, index) => job(index + 1, `Failed owner ${index + 1}`));
    const optional = job(20, "Full documentation review");
    const staging = job(21, "Develop / Stage 0.1.8-dev.10 on npm");
    const output: string[] = [];
    const { run } = developmentRunner([
      snapshot([...jobs, optional, staging]),
      snapshot([...jobs.map((entry, index) => complete(entry, conclusions[index])), complete(optional, "skipped"), complete(staging, "skipped"),
        complete(job(22, "Snapshot the stable Release note"), "skipped"), complete(job(23, "Publication result"), "failure")], "completed", "failure"),
    ], "[]");
    const error = await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, run, write: text => { output.push(text); },
    }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Publication blocked before npm staging.");
    expect(process.stdout.listenerCount("resize")).toBe(resizeListeners);
    output.push(`[develop] ${(error as Error).message}\n`);
    const final = await replay(output);
    expect(final.final.rows.filter(line => line.includes("●"))).toEqual([
      ...jobs.map(entry => `  ● Failed:  ${entry.name}`), "  ● Skipped: Full documentation review", "  ● Skipped: npm staging",
    ]);
    expect(final.finalStyles?.map(cell => [cell.column, cell.colors[1]])).toEqual([
      ...jobs.map(() => [3, 1]), [3, 8], [3, 8],
    ]);
    const lastJob = final.final.rows.findIndex(line => line === "  ● Skipped: npm staging");
    expect(final.final.rows[lastJob + 1]).toBe("");
    expect(final.final.rows[lastJob + 2]).toBe("[develop] Publication failed: 0.1.8-dev.10 (run 42)");
    expect(final.final.rows[lastJob + 3]).toBe("Full log: https://github.com/owner/app/actions/runs/42");
    expect(final.final.rows.some(line => line.includes("Snapshot the stable Release note"))).toBe(false);
  });

  it.each([16, 24, 40])("contains Unicode job rows within %i columns and erases stale text on update", async columns => {
    const geometry = { columns, rows: 60 };
    const entry = job(1, "漢字🙂e\u0301".repeat(10));
    const output: string[] = [];
    const { run } = developmentRunner([snapshot([entry]), snapshot([{ ...complete(entry), name: "X" }], "completed", "success")]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, terminalSize: () => geometry, run, write: text => { output.push(text); },
    });
    const initial = await replay(output.slice(0, 2), geometry);
    const row = initial.final.rows.findIndex(line => line.includes("●"));
    expect(initial.final.rows[row]).toMatch(/^  ● Running: .*…$/u);
    expect(initial.final.rows[row + 1]).toBe("");
    expect(initial.final.cursor.row).toBe(row + 2);
    const updated = await replay(output.slice(0, 3), geometry);
    expect(updated.final.rows[row]).toBe("  ● Passed:  X");
    expect(updated.final.rows[row + 1]).toBe("");
    expect(updated.final.cursor).toEqual({ row: row + 2, column: 1 });
    expect(updated.final.rows.slice(0, row)).toEqual(initial.final.rows.slice(0, row));
  });

  it.each(["interrupted", "unavailable"])("leaves %s observation messages below the live region", async kind => {
    const resizeListeners = process.stdout.listenerCount("resize");
    const entry = job(1, "Build");
    const controller = new AbortController();
    const output: string[] = [];
    const runner = developmentRunner([snapshot([entry]), snapshot([complete(entry)])]);
    let reads = 0;
    let waits = 0;
    const run = (executable: string, args: string[]) => {
      if (args[1] === "repos/owner/app/actions/runs/42" && ++reads === 3) throw new Error("offline");
      return runner.run(executable, args);
    };
    const error = await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, run, signal: controller.signal, write: text => { output.push(text); },
      sleep: async () => { if (++waits === 2 && kind === "interrupted") controller.abort(); },
    }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    expect(process.stdout.listenerCount("resize")).toBe(resizeListeners);
    expect((error as Error).message).toContain("Remote outcome unknown");
    expect((error as Error).message).toContain(kind === "interrupted" ? "interrupted" : "GitHub status unavailable");
    output.push(`${(error as Error).message}\n`);
    const final = await replay(output);
    const row = final.final.rows.findIndex(line => line === "  ● Passed:  Build");
    expect(row).toBeGreaterThan(0);
    expect(final.final.rows[row + 1]).toBe("");
    expect(final.final.rows[row + 2]).toMatch(/^Stopped watching/u);
    expect(final.final.rows.some(line => line.startsWith("[publication]"))).toBe(true);
    expect(final.final.rows.some(line => line.startsWith("Full log:"))).toBe(true);
    expect(final.final.rows.some(line => line.includes("Publication failed"))).toBe(false);
  });

  it.each([{ columns: 80, rows: 40 }, { columns: 120, rows: 24 }, size])("stops cursor movement after resizing to %j", async resized => {
    const entry = job(1, "Build");
    const output: string[] = [];
    let geometry = size;
    let resizeAt = 0;
    const { run } = developmentRunner([snapshot([entry]), snapshot([complete(entry)], "completed", "success")]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, terminalSize: () => geometry, run, write: text => { output.push(text); },
      sleep: async () => {
        resizeAt = output.length;
        geometry = resized;
        // Platform: a shrink-and-grow between polls can restore dimensions but still reflow prior rows.
        if (resized.columns === size.columns && resized.rows === size.rows) process.stdout.emit("resize");
      },
    });
    expect(output.slice(resizeAt).join("")).not.toMatch(/\u001b\[\d*[ABK]/u);
    const frames = await replayTerminalCheckpoints(terminalWrites(output), [
      { ...size, writeEnd: resizeAt }, { ...resized, writeEnd: output.length },
    ]);
    expect(frames[1]?.rows.filter(line => line.startsWith("[publication]"))).toEqual(frames[0]?.rows.filter(line => line.startsWith("[publication]")));
    expect(frames[1]?.rows.filter(line => line.includes("●"))).toEqual(["  ● Running: Build", "  ● Passed:  Build"]);
  });

  it.each([
    ["redirected output", false, { TERM: "xterm", FORCE_COLOR: "1" }, size],
    ["dumb terminal", true, { TERM: "dumb" }, size],
    ["unknown dimensions", true, { TERM: "xterm", NO_COLOR: "1" }, { columns: NaN, rows: NaN }],
    ["very narrow terminal", true, { TERM: "xterm", NO_COLOR: "1" }, { columns: 12, rows: 40 }],
    ["off-screen rows", true, { TERM: "xterm", NO_COLOR: "1" }, { columns: 120, rows: 2 }],
  ] as const)("keeps %s append-only without terminal controls", async (_name, isTTY, environment, geometry) => {
    const jobs = [job(1, "Build"), job(2, "Validate")];
    const output: string[] = [];
    const { run } = developmentRunner([snapshot(jobs), snapshot(jobs.map(entry => complete(entry)), "completed", "success")]);
    await dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      ...interactiveOptions, isTTY, environment, terminalSize: () => geometry, run, write: text => { output.push(text); },
    });
    expect(output.join("")).not.toContain("\u001b");
    expect(output.slice(1, -2)).toEqual([
      "  ● Running: Build\n", "  ● Running: Validate\n", "  ● Passed:  Build\n", "  ● Passed:  Validate\n",
    ]);
    expect(output.slice(-2)).toEqual(["\n", "[workflow] passed; verifying npm packages.\n"]);
  });
});

describe("publication progress exit boundary", () => {
  const source = "a".repeat(40);
  const version = "0.1.8-dev.10";
  const size = { columns: 200, rows: 100 };
  const reasonHeading = `[develop] Stopped watching ${version} (run 42): `;
  const guidance = "Remote outcome unknown; it may still be running. Check this run before starting another publication.";
  const url = "Full log: https://github.com/owner/app/actions/runs/42";
  const conclusions = ["success", "failure", "timed_out", "cancelled", "action_required", "startup_failure", "stale", "skipped", "neutral"];
  const observationStops = ["offline run", "malformed run", "offline jobs", "malformed jobs", "wait failure", "aborted wait", "SIGINT", "SIGTERM"];
  const exits = [...conclusions, ...observationStops];

  async function observe(exit: string, visibleJobs: boolean, mode: string) {
    const output: string[] = [];
    const controller = new AbortController();
    const before = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM"), process.stdout.listenerCount("resize")];
    const build = { id: 1, name: "Build", status: "in_progress", conclusion: null, steps: publicationSteps("in_progress", "pending") };
    const staging = { ...build, id: 2, name: `Develop / Stage ${version} on npm` };
    const jobs = visibleJobs ? [build, staging] : [];
    const runner = developmentRunner([
      { status: "in_progress", conclusion: null, jobs },
      { status: "in_progress", conclusion: null, jobs: jobs.map(job => job.id === 1 ? { ...job, status: "completed", conclusion: "success" } : job) },
      { status: "completed", conclusion: exit, jobs: jobs.map(job => ({ ...job, status: "completed", conclusion: job.id === 1 ? "success" : exit })) },
    ], "[]");
    let reads = 0;
    let waits = 0;
    const run = (executable: string, args: string[]) => {
      if (args[1] === "repos/owner/app/actions/runs/42") {
        reads++;
        if (reads === 3 && exit === "offline run") throw new Error("offline");
        if (reads === 3 && exit === "malformed run") return "{}";
      }
      if (reads === 3 && args[1]?.includes("/jobs?")) {
        if (exit === "offline jobs") throw new Error("offline");
        if (exit === "malformed jobs") return "[{}]";
      }
      return runner.run(executable, args);
    };
    let geometry = size;
    const result = await dispatchPublication("develop", source, version, {
      ...developmentOptions, run, signal: controller.signal, write: (text: string) => { output.push(text); },
      isTTY: mode !== "redirected", terminalSize: () => geometry,
      environment: { TERM: mode === "dumb" ? "dumb" : "xterm", ...(mode === "neutral" ? { NO_COLOR: "1" } : {}) },
      sleep: async () => {
        if (++waits !== 2) return;
        if (mode === "resized") {
          geometry = { ...size, rows: 80 };
          process.stdout.emit("resize");
        }
        if (exit === "wait failure") throw new Error("waiting unavailable");
        if (exit === "aborted wait") {
          controller.abort();
          throw new Error("aborted");
        }
        if (exit === "SIGINT" || exit === "SIGTERM") process.emit(exit);
      },
    }).catch((error: unknown) => error);
    expect([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM"), process.stdout.listenerCount("resize")]).toEqual(before);
    expect(runner.calls.some(call => call.args.includes("cancel"))).toBe(false);
    if (exit === "success") expect(result).toBe(42);
    else {
      expect(result).toBeInstanceOf(Error);
      output.push(`[develop] ${(result as Error).message}\n`);
    }
    return output;
  }

  it.each(exits.flatMap(exit => [true, false].flatMap(visibleJobs => ["interactive", "redirected"].map(mode => ({ exit, visibleJobs, mode })))))
  ("separates $exit output (jobs $visibleJobs, $mode)", async ({ exit, visibleJobs, mode }) => {
    const output = await observe(exit, visibleJobs, mode);
    const transcript = output.join("");
    if (mode === "redirected") expect(transcript).not.toContain("\u001b");
    if (!visibleJobs) {
      // Invariant: the header already ends in one blank separator; empty observers add none.
      expect(output[0]).toBe(`\n[publication] ${version} — run 42\n${url}\n\n`);
      expect(output).toHaveLength(2);
    }
    const final = await replayTerminalPaint(output.map((data, atMs) => ({ data: data.replace(/\n/gu, "\r\n"), atMs })), {
      ...size, synchronizedUpdates: "honor", captureStyles: true,
    });
    const rows = final.final.rows;
    const lastJob = rows.findLastIndex(line => line.includes("●"));
    const boundary = visibleJobs ? lastJob : rows.findIndex(line => line === url);
    expect(boundary).toBeGreaterThan(0);
    expect(rows[boundary + 1]).toBe("");
    const following = rows.slice(boundary + 2).filter(Boolean);
    expect(following.length).toBeGreaterThan(0);
    expect(following.every(line => /^(?:\S|  \* )/u.test(line))).toBe(true);
    if (exit === "success") expect(following).toEqual(["[workflow] passed; verifying npm packages."]);
    else if (conclusions.includes(exit)) {
      expect(following[0]).toBe(`[develop] Publication failed: ${version} (run 42)`);
      expect(following[1]).toBe(url);
      expect(following.slice(2).every(line => line.startsWith("  * "))).toBe(true);
    } else {
      const reason = exit === "wait failure" ? "status waiting unavailable"
        : ["aborted wait", "SIGINT", "SIGTERM"].includes(exit) ? "interrupted" : "GitHub status unavailable";
      expect(following).toEqual([`${reasonHeading}${reason}.`, guidance, url]);
    }
    if (visibleJobs && mode === "interactive" && observationStops.includes(exit)) {
      // Invariant: redrawing an earlier row leaves the boundary below the still-running final row.
      expect(rows.filter(line => line.includes("●"))).toEqual(["  ● Passed:  Build (2/2)", "  ● Running: npm staging (1/2)"]);
    }
  });

  it.each(["neutral", "dumb", "resized"].flatMap(mode => ["success", "failure", "offline run", "wait failure", "SIGTERM"].map(exit => ({ mode, exit }))))
  ("retains the boundary for $mode output after $exit", async ({ mode, exit }) => {
    const output = await observe(exit, true, mode);
    const final = await replayTerminalPaint(output.map((data, atMs) => ({ data: data.replace(/\n/gu, "\r\n"), atMs })), {
      ...size, synchronizedUpdates: "honor", captureStyles: true,
    });
    const rows = final.final.rows;
    const lastJob = rows.findLastIndex(line => line.includes("●"));
    expect(rows[lastJob + 1]).toBe("");
    expect(rows[lastJob + 2]).toMatch(/^(?:\[workflow\]|\[develop\])/u);
    expect(rows.slice(lastJob + 2).filter(Boolean).every(line => /^(?:\S|  \* )/u.test(line))).toBe(true);
    if (mode === "neutral") {
      expect(output.join("")).not.toMatch(/\u001b\[\d+m/u);
      expect(final.finalStyles).toEqual([]);
    }
    if (mode === "dumb") expect(output.join("")).not.toContain("\u001b");
  });

  it.each([
    { columns: 12, rows: 40 }, { columns: NaN, rows: NaN }, { columns: 200, rows: 2 },
  ])("separates stopped observation after geometry fallback %j", async geometry => {
    const output: string[] = [];
    const runner = developmentRunner([{ status: "in_progress", conclusion: null, jobs: [
      { id: 1, name: "Build", status: "in_progress", conclusion: null },
      { id: 2, name: `Develop / Stage ${version} on npm`, status: "in_progress", conclusion: null },
    ] }]);
    const error = await dispatchPublication("develop", source, version, {
      ...developmentOptions, run: runner.run, isTTY: true, environment: { TERM: "xterm", NO_COLOR: "1" },
      terminalSize: () => geometry, write: (text: string) => { output.push(text); },
      sleep: async () => { throw new Error("wait failure"); },
    }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    output.push(`[develop] ${(error as Error).message}\n`);
    expect(output.join("")).toBe(`\n[publication] ${version} — run 42\n${url}\n\n  ● Running: Build\n  ● Running: npm staging\n\n${reasonHeading}status waiting unavailable.\n${guidance}\n${url}\n`);
  });

  it("keeps a pre-aborted observer at the header separator without status reads", async () => {
    const controller = new AbortController();
    controller.abort();
    const output: string[] = [];
    const runner = developmentRunner([]);
    const error = await dispatchPublication("develop", source, version, {
      ...developmentOptions, run: runner.run, signal: controller.signal, write: (text: string) => { output.push(text); },
    }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
    output.push(`[develop] ${(error as Error).message}\n`);
    expect(output.join("")).toBe(`\n[publication] ${version} — run 42\n${url}\n\n${reasonHeading}interrupted.\n${guidance}\n${url}\n`);
    expect(runner.calls.some(call => call.args[1]?.includes("/actions/runs/"))).toBe(false);
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
      .rejects.toThrow(/Linux validation \(Node 24\) \[failure\]\n  \* expected 1 to be 2/);
  });

  it("reports that validation keeps running when watching stops early", async () => {
    const { run } = watched(new Error("interrupted"), "in_progress", null);
    await expect(waitForStableValidation({ repository: "owner/app", runId: 51 }, { run }))
      .rejects.toThrow(/stopped watching validation run 51 while it is in progress; it keeps running/);
  });
});
