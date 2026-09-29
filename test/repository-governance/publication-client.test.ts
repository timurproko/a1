import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { describePublicationFailure, dispatchPublication, dispatchStableValidation } from "../../scripts/release/publication-client.mjs";

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

const jobsResponse = JSON.stringify([
  { id: 1, name: "Validate win32-node24", conclusion: "failure" },
  { id: 2, name: "Validate linux-node24", conclusion: "success" },
  { id: 3, name: "Publish 0.1.8-dev.9 to npm next", conclusion: "skipped" },
]);
const annotationsResponse = JSON.stringify([
  "startup budget failed for pi warm: 2438ms exceeds 2000ms; dominant phases: ui-entry 741ms\nsecond line is dropped",
  "Process completed with exit code 1.",
  "startup budget failed for pi warm: 2438ms exceeds 2000ms; dominant phases: ui-entry 741ms",
]);

describe("publication failure reporting", () => {
  it("names the failed jobs and their recorded messages once each without the generic exit-code line", () => {
    const { run, calls } = fakeRunner(({ args }) => {
      if (args[1]?.endsWith("/actions/runs/42/jobs?per_page=100")) return jobsResponse;
      if (args[1] === "repos/owner/app/check-runs/1/annotations") return annotationsResponse;
      throw new Error(`unexpected call ${args.join(" ")}`);
    });
    const message = describePublicationFailure(42, { run, repository: "owner/app" });
    expect(message).toBe(
      "publication run 42 failed in Validate win32-node24\n"
      + "  Validate win32-node24: startup budget failed for pi warm: 2438ms exceeds 2000ms; dominant phases: ui-entry 741ms",
    );
    expect(calls.map(call => call.args[1])).toEqual(["repos/owner/app/actions/runs/42/jobs?per_page=100", "repos/owner/app/check-runs/1/annotations"]);
  });

  it("caps the report at ten lines and survives unreadable annotations", () => {
    const many = JSON.stringify(Array.from({ length: 30 }, (_value, index) => `assertion ${index} failed`));
    const jobs = JSON.stringify([{ id: 7, name: "PR core", conclusion: "failure" }, { id: 8, name: "Rendering", conclusion: "failure" }]);
    const { run } = fakeRunner(({ args }) => {
      if (args[1]?.includes("/actions/runs/")) return jobs;
      if (args[1] === "repos/owner/app/check-runs/7/annotations") return many;
      return new Error("annotations unavailable");
    });
    const message = describePublicationFailure(9, { run, repository: "owner/app" });
    expect(message.split("\n")).toHaveLength(11);
    expect(message.startsWith("publication run 9 failed in PR core, Rendering")).toBe(true);
  });

  it("prints the run identifier and URL, then throws the readable report when the watch fails", async () => {
    const output: string[] = [];
    const { run, calls } = fakeRunner(({ args }) => {
      if (args[0] === "auth" || args[0] === "workflow") return "";
      if (args[0] === "run" && args[1] === "list") return JSON.stringify([{ databaseId: 42, displayTitle: "develop publication fixture-request" }]);
      if (args[0] === "run" && args[1] === "view") return "https://github.com/owner/app/actions/runs/42";
      if (args[0] === "run" && args[1] === "watch") return new Error("Command failed: gh run watch 42 --exit-status");
      if (args[1]?.includes("/actions/runs/42/jobs")) return jobsResponse;
      if (args[1]?.includes("/check-runs/1/annotations")) return annotationsResponse;
      throw new Error(`unexpected call ${args.join(" ")}`);
    });
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.9", {
      run, repository: "owner/app", requestId: "fixture-request", write: (text: string) => { output.push(text); }, sleep: async () => {},
    })).rejects.toThrow(/^publication run 42 failed in Validate win32-node24\n  Validate win32-node24: startup budget failed/);
    expect(output).toEqual(["[publication] workflow run 42 is responsible for 0.1.8-dev.9\n[publication] https://github.com/owner/app/actions/runs/42\n"]);
    expect(calls.some(call => call.args[0] === "run" && call.args[1] === "watch" && call.args.includes("--exit-status"))).toBe(true);
  });

  it("dispatches development publication only through the dedicated wrapper", async () => {
    const { run, calls } = fakeRunner(({ args }) => {
      if (args[0] === "run" && args[1] === "list") return JSON.stringify([{ databaseId: 44, displayTitle: "develop publication fixture-request" }]);
      if (args[0] === "run" && args[1] === "view") return "https://github.com/owner/app/actions/runs/44";
      return "";
    });
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      run, repository: "owner/app", requestId: "fixture-request", write: () => {}, sleep: async () => {},
    })).resolves.toBe(44);
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

  it("returns the run identifier unchanged when the watch succeeds", async () => {
    const output: string[] = [];
    const { run } = fakeRunner(({ args }) => {
      if (args[0] === "run" && args[1] === "list") return JSON.stringify([{ databaseId: 43, displayTitle: "develop publication fixture-request" }]);
      if (args[0] === "run" && args[1] === "view") return "https://github.com/owner/app/actions/runs/43";
      return "";
    });
    await expect(dispatchPublication("develop", "a".repeat(40), "0.1.8-dev.10", {
      run, repository: "owner/app", requestId: "fixture-request", write: (text: string) => { output.push(text); }, sleep: async () => {},
    })).resolves.toBe(43);
    expect(output.join("")).toContain("[publication] https://github.com/owner/app/actions/runs/43\n");
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
    expect(require.run).toContain('if [ "$MODE" != candidate ] && { [ "$BUILD" = true ] || [ "$INSTALLER_BUILD" = true ]; }; then');
    expect(require.run).toContain('test "$PUBLISH" = success');
    expect(require.run).toContain('test "$POST_PUBLISH" = success');
    expect(require.run).toContain('test "$COMPLETE" = success');
    expect(require.run).not.toContain("REOPEN");
  });
});
