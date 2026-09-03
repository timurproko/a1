import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PRODUCT_PACKAGE,
  runSelfUpdate,
  UPDATE_JOURNAL_SCHEMA,
  type ProcessRequest,
  type ProcessResult,
  type UpdateFileSystem,
  type UpdateLifecycleCoordinator,
  type UpdateOutput,
  type UpdateProcessRunner,
  type UpdateTransactionJournal,
  type UpdateTransactionPhase,
} from "../../../src/foundation/release/index.js";

interface Invocation {
  command: string;
  arguments: readonly string[];
  request: ProcessRequest;
}

const NEWLINE = String.fromCharCode(10);
const RETURN = String.fromCharCode(13);

/**
 * What a terminal would be showing: a carriage return rewrites the row, so only
 * what follows the last one survives on each line.
 */
function rendered(text: string): string[] {
  return text
    .split(NEWLINE)
    .map(line => line.slice(line.lastIndexOf(RETURN) + 1).trim())
    .filter(line => line.length > 0);
}

function createHarness(options: {
  current?: string;
  packageRoot?: string;
  globalRoot?: string;
  responses?: Array<ProcessResult | Error>;
  transactionPhase?: UpdateTransactionPhase;
  transactionTarget?: string;
} = {}) {
  const packageRoot = options.packageRoot ?? resolve("fixtures", "global", "@timurproko", "a1");
  const globalRoot = options.globalRoot ?? resolve("fixtures", "global");
  const responses = [...(options.responses ?? [])];
  const invocations: Invocation[] = [];
  const stdout: string[] = [];
  const stderr: string[] = [];
  const fileSystem: UpdateFileSystem = {
    async readFile() {
      return JSON.stringify({ version: options.current ?? "1.2.3" });
    },
    async realpath(path) {
      return resolve(path);
    },
  };
  const output: UpdateOutput = {
    stdout: message => stdout.push(message),
    stderr: message => stderr.push(message),
  };
  const lifecycleCalls: string[] = [];
  const lifecycle: UpdateLifecycleCoordinator = {
    async targetIsActive() { return false; },
    async shutdownVerifiedOwners(targetVersion) { lifecycleCalls.push(`shutdown:${targetVersion}`); return { priorActiveVersion: null }; },
    async verifyPackageUnlocked(path) { lifecycleCalls.push(`unlock:${path}`); },
    async activateInstalled(path, targetVersion, phase) {
      lifecycleCalls.push(`activate:${path}:${targetVersion}`);
      for (const value of ["materialized", "certified", "active-reference-committed"] as const) await phase(value);
    },
  };
  let transaction: Awaited<ReturnType<UpdateTransactionJournal["read"]>> = options.transactionPhase ? {
    schema: UPDATE_JOURNAL_SCHEMA,
    transactionId: "interrupted-update",
    channel: "stable",
    targetVersion: options.transactionTarget ?? "1.3.0",
    packageRoot,
    priorActiveReleaseId: "prior-release",
    phase: options.transactionPhase,
    status: "active",
    error: null,
    startedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  } : null;
  const transactionStore: UpdateTransactionJournal = {
    path: resolve("fixtures", "update-transaction.json"),
    async read() { return transaction; },
    async begin(input) {
      const now = new Date(0).toISOString();
      transaction = transaction ?? { schema: UPDATE_JOURNAL_SCHEMA, transactionId: "test-update", ...input, priorActiveReleaseId: null, phase: "shutdown-intent", status: "active", error: null, startedAt: now, updatedAt: now };
      return transaction;
    },
    async advance(phase) { if (!transaction) throw new Error("missing test transaction"); transaction = { ...transaction, phase }; return transaction; },
    async finish(status, error = null) { if (!transaction) throw new Error("missing test transaction"); transaction = { ...transaction, status, error }; return transaction; },
    async clearCompleted() { if (transaction?.status !== "active") transaction = null; },
  };
  const runner: UpdateProcessRunner = async (command, arguments_, request) => {
    invocations.push({ command, arguments: arguments_, request });
    const response = responses.shift();
    if (response === undefined) throw new Error("Unexpected process invocation");
    if (response instanceof Error) throw response;
    return response;
  };

  return {
    fileSystem,
    globalRoot,
    invocations,
    lifecycle,
    lifecycleCalls,
    output,
    packageRoot,
    runner,
    stderr,
    stdout,
    transactionStore,
  };
}

const success = (stdout = ""): ProcessResult => ({ code: 0, stdout });
const syncProxyInvocation = (packageRoot: string): Invocation => ({
  command: process.execPath,
  arguments: [resolve(packageRoot, "bin", "sync-pi-tui-proxy.js")],
  request: { captureStdout: true },
});
const installArguments = (version: string) => [
  "install",
  "--global",
  "--loglevel=error",
  "--no-fund",
  "--no-audit",
  `${PRODUCT_PACKAGE}@${version}`,
];

describe("A1 self-update orchestration", () => {
  it.each([
    ["the current version", "1.2.3"],
    ["a newer running version", "1.2.2"],
  ])("skips installation for %s", async (_label, latest) => {
    const harness = createHarness({ responses: [success(`${latest}\n`), success(`${resolve("fixtures", "global")}\n`), success(), success()] });

    await expect(runSelfUpdate(harness)).resolves.toBe(0);

    expect(harness.invocations).toEqual([
      { command: "npm", arguments: ["view", `${PRODUCT_PACKAGE}@latest`, "version"], request: { captureStdout: true } },
      { command: "npm", arguments: ["root", "--global"], request: { captureStdout: true } },
      { command: "npm", arguments: installArguments(latest), request: { captureStdout: true } },
      syncProxyInvocation(harness.packageRoot),
    ]);
    expect(harness.stdout.join("")).toContain(`a1 updated successfully: ${latest}`);
  });

  it("installs an exact newer version for a canonical managed global package", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), success(), success()] });
    harness.fileSystem.realpath = async path => path;
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_[0] === "view") return success("1.3.0\n");
      if (arguments_[0] === "root") return success(`${harness.globalRoot}\n`);
      return success();
    };

    await expect(runSelfUpdate(harness)).resolves.toBe(0);

    expect(harness.invocations).toEqual([
      { command: "npm", arguments: ["view", `${PRODUCT_PACKAGE}@latest`, "version"], request: { captureStdout: true } },
      { command: "npm", arguments: ["root", "--global"], request: { captureStdout: true } },
      { command: "npm", arguments: installArguments("1.3.0"), request: { captureStdout: true } },
      syncProxyInvocation(harness.packageRoot),
    ]);
    expect(harness.stdout.join("")).toBe("a1 update: 1.2.3 → 1.3.0\na1 updated successfully: 1.3.0\n");
    expect(harness.stderr).toEqual([]);
  });

  it("resolves the internal npm tag and presents it as the develop channel", async () => {
    const harness = createHarness({ current: "1.3.0-dev.0" });
    harness.fileSystem.realpath = async path => path;
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_[0] === "view") return success("1.3.0-dev.1\n");
      if (arguments_[0] === "root") return success(`${harness.globalRoot}\n`);
      return success();
    };

    await expect(runSelfUpdate({ ...harness, channel: "next" })).resolves.toBe(0);

    expect(harness.invocations).toEqual([
      { command: "npm", arguments: ["view", `${PRODUCT_PACKAGE}@next`, "version"], request: { captureStdout: true } },
      { command: "npm", arguments: ["root", "--global"], request: { captureStdout: true } },
      { command: "npm", arguments: installArguments("1.3.0-dev.1"), request: { captureStdout: true } },
      syncProxyInvocation(harness.packageRoot),
    ]);
    expect(harness.stdout.join("")).toBe("a1 update: 1.3.0-dev.0 → 1.3.0-dev.1\na1 updated successfully: 1.3.0-dev.1\n");
  });

  it("installs the preview a development number names", async () => {
    const harness = createHarness({ current: "1.3.0-dev.106" });
    harness.fileSystem.realpath = async path => path;
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_.includes("versions")) return success(JSON.stringify(["1.2.9-dev.106", "1.3.0-dev.107", "1.3.0"]));
      if (arguments_[0] === "root") return success(harness.globalRoot + NEWLINE);
      return success();
    };

    await expect(runSelfUpdate({ ...harness, channel: "next", target: "107" })).resolves.toBe(0);

    // Invariant: the published list is consulted rather than constructing a version from the
    // currently installed base.
    expect(harness.invocations[0]).toEqual({ command: "npm", arguments: ["view", PRODUCT_PACKAGE, "versions", "--json"], request: { captureStdout: true } });
    expect(harness.stdout.join("")).toContain("1.3.0-dev.106 → 1.3.0-dev.107");
  });

  it("accepts a full preview version as well as a development number", async () => {
    const harness = createHarness({ current: "1.3.0-dev.106" });
    harness.fileSystem.realpath = async path => path;
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_.includes("versions")) return success(JSON.stringify(["1.3.0-dev.107"]));
      if (arguments_[0] === "root") return success(harness.globalRoot + NEWLINE);
      return success();
    };

    await expect(runSelfUpdate({ ...harness, channel: "next", target: "1.3.0-dev.107" })).resolves.toBe(0);
    expect(harness.stdout.join("")).toContain("→ 1.3.0-dev.107");
  });

  it("refuses a release named after the colon, pointing at the release command", async () => {
    const harness = createHarness({ current: "1.3.0-dev.0" });
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_.includes("versions")) return success(JSON.stringify(["1.3.0", "1.3.0-dev.7eabe9e"]));
      return success();
    };

    await expect(runSelfUpdate({ ...harness, channel: "next", target: "1.3.0" })).resolves.toBe(1);

    expect(harness.stderr.join("")).toContain("1.3.0 is a release, not a preview");
    expect(harness.stderr.join("")).toContain("a1 update");
    expect(harness.invocations.some(call => call.arguments[0] === "install")).toBe(false);
  });
  it("refuses a development number that was never published, naming it", async () => {
    const harness = createHarness({ current: "1.3.0-dev.106" });
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_.includes("versions")) return success(JSON.stringify(["1.3.0-dev.106"]));
      return success();
    };

    await expect(runSelfUpdate({ ...harness, channel: "next", target: "107" })).resolves.toBe(1);

    expect(harness.stderr.join("")).toContain("published no preview for 107");
    // Invariant: nothing is installed when the target cannot be resolved.
    expect(harness.invocations.some(call => call.arguments[0] === "install")).toBe(false);
  });

  it("refuses a development number that names more than one preview", async () => {
    const harness = createHarness({ current: "1.3.0-dev.106" });
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_.includes("versions")) return success(JSON.stringify(["1.2.9-dev.107", "1.3.0-dev.107"]));
      return success();
    };

    await expect(runSelfUpdate({ ...harness, channel: "next", target: "107" })).resolves.toBe(1);
    expect(harness.stderr.join("")).toContain("more than one preview");
  });
  it("prints the shortened no-change message when the target is already active", async () => {
    const harness = createHarness({ responses: [success("1.2.3\n"), success(`${resolve("fixtures", "global")}\n`)] });
    harness.lifecycle.targetIsActive = async () => true;

    await expect(runSelfUpdate({ ...harness, progress: true })).resolves.toBe(0);

    expect(harness.stdout.join("")).toBe("a1 update: 1.2.3 → 1.2.3\na1 is up to date — no update needed.\n");
    expect(harness.stderr).toEqual([]);
  });

  it("commits cleanup maintenance before reporting update success", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), success(`${resolve("fixtures", "global")}\n`), success(), success()] });
    const observations: string[] = [];

    await expect(runSelfUpdate({
      ...harness,
      maintenance: async () => { observations.push(`maintenance:${harness.stdout.join("").includes("updated successfully")}`); },
    })).resolves.toBe(0);

    expect(observations).toEqual(["maintenance:false"]);
    expect(harness.stdout.join("")).toContain("a1 updated successfully: 1.3.0");
  });

  it("fails safely when the activated startup graph cannot warm", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), success(`${resolve("fixtures", "global")}\n`), success(), success()] });
    harness.lifecycle.activateInstalled = async (_path, _version, phase) => {
      for (const value of ["materialized", "certified", "active-reference-committed"] as const) await phase(value);
      throw new Error("immutable startup warmup failed");
    };

    await expect(runSelfUpdate(harness)).resolves.toBe(1);

    expect(harness.stdout.join("")).not.toContain("updated successfully");
    expect(harness.stderr.join("")).toContain("immutable startup warmup failed");
    expect(harness.stderr.join("")).toContain("previous test lifecycle retained");
  });

  it("represents bounded warmup as a measured monotonic update phase", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), success(`${resolve("fixtures", "global")}\n`), success(), success()] });
    harness.lifecycle.activateInstalled = async (_path, _version, phase, _onMaterializing, onWarmup) => {
      for (const value of ["materialized", "certified", "active-reference-committed"] as const) await phase(value);
      onWarmup?.("started");
      onWarmup?.("completed");
    };
    let tick = 0;
    const phases: string[] = [];

    await expect(runSelfUpdate({
      ...harness,
      progress: true,
      now: () => { tick += 5; return tick; },
      onPhaseTiming: event => phases.push(event.phase),
    })).resolves.toBe(0);

    expect(phases).toContain("warmup");
    const percents = harness.stdout.join("").split("\r")
      .map(frame => /(\d+)%/.exec(frame)?.[1]).filter((value): value is string => value !== undefined).map(Number);
    expect(percents).toEqual([...percents].sort((left, right) => left - right));
  });

  it("gives the progress row back to the line that says what was installed", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), success(`${resolve("fixtures", "global")}\n`), success(), success()] });

    await expect(runSelfUpdate({ ...harness, progress: true })).resolves.toBe(0);

    const text = harness.stdout.join("");
    expect(text).toContain("░");
    // Invariant: the bar is erased rather than left completed, so what remains is the two
    // lines a reader keeps: what is being installed, and what now is.
    expect(text).not.toContain("100%");
    expect(rendered(text)).toEqual([
      "a1 update: 1.2.3 → 1.3.0",
      "a1 updated successfully: 1.3.0",
    ]);
  });

  it("creeps the progress bar between milestones while npm install runs", async () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness();
      let installStarted!: () => void;
      let releaseInstall!: () => void;
      const started = new Promise<void>(resolvePromise => { installStarted = resolvePromise; });
      const gate = new Promise<void>(resolvePromise => { releaseInstall = resolvePromise; });
      harness.runner = async (command, arguments_, request) => {
        harness.invocations.push({ command, arguments: arguments_, request });
        if (arguments_[0] === "view") return success("1.3.0\n");
        if (arguments_[0] === "root") return success(`${harness.globalRoot}\n`);
        installStarted();
        await gate;
        return success();
      };

      const run = runSelfUpdate({ ...harness, progress: true });
      await started;
      await vi.advanceTimersByTimeAsync(10_000);
      releaseInstall();
      await expect(run).resolves.toBe(0);

      const percents = harness.stdout.join("").split("\r")
        .map(frame => /(\d+)%/.exec(frame)?.[1])
        .filter((value): value is string => value !== undefined)
        .map(Number);
      expect(percents.some(percent => percent > 15 && percent < 70)).toBe(true);
      expect(percents.at(-1)).toBeLessThan(100);
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves the bar with the files being copied rather than parking until they are done", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), success(`${resolve("fixtures", "global")}\n`), success(), success()] });
    harness.lifecycle.activateInstalled = async (_path, _targetVersion, phase, onMaterializing) => {
      for (let file = 1; file <= 20; file += 1) onMaterializing?.({ completed: file, total: 20 });
      for (const value of ["materialized", "certified", "active-reference-committed"] as const) await phase(value);
    };

    await expect(runSelfUpdate({ ...harness, progress: true })).resolves.toBe(0);

    const percents = harness.stdout.join("").split("\r")
      .map(frame => /(\d+)%/.exec(frame)?.[1])
      .filter((value): value is string => value !== undefined)
      .map(Number);
    const copying = percents.filter(percent => percent > 78 && percent < 92);
    // Performance: several distinct readings across the copy span, not one jump over it.
    expect(new Set(copying).size).toBeGreaterThan(4);
    expect(percents).toEqual([...percents].sort((left, right) => left - right));
    expect(percents.at(-1)).toBeLessThan(100);
  });

  it("never settles on a milestone it has not reached, so arriving at one is visible", async () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness();
      let installStarted!: () => void;
      let releaseInstall!: () => void;
      const started = new Promise<void>(resolvePromise => { installStarted = resolvePromise; });
      const gate = new Promise<void>(resolvePromise => { releaseInstall = resolvePromise; });
      harness.runner = async (command, arguments_, request) => {
        harness.invocations.push({ command, arguments: arguments_, request });
        if (arguments_[0] === "view") return success("1.3.0\n");
        if (arguments_[0] === "root") return success(`${harness.globalRoot}\n`);
        installStarted();
        await gate;
        return success();
      };

      const run = runSelfUpdate({ ...harness, progress: true });
      await started;
      await vi.advanceTimersByTimeAsync(600_000);
      const duringInstall = harness.stdout.join("").split("\r")
        .map(frame => /(\d+)%/.exec(frame)?.[1])
        .filter((value): value is string => value !== undefined)
        .map(Number);
      expect(Math.max(...duringInstall)).toBeLessThan(70);

      releaseInstall();
      await expect(run).resolves.toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rechecks ownership before activating an installation resumed after interruption", async () => {
    const harness = createHarness({
      responses: [success("1.3.0\n"), success(`${resolve("fixtures", "global")}\n`), success()],
      transactionPhase: "package-installed",
    });

    await expect(runSelfUpdate(harness)).resolves.toBe(0);

    expect(harness.invocations).toEqual([
      { command: "npm", arguments: ["view", `${PRODUCT_PACKAGE}@latest`, "version"], request: { captureStdout: true } },
      { command: "npm", arguments: ["root", "--global"], request: { captureStdout: true } },
      syncProxyInvocation(harness.packageRoot),
    ]);
    expect(harness.lifecycleCalls).toEqual([
      "shutdown:1.3.0",
      `activate:${harness.packageRoot}:1.3.0`,
    ]);
    expect(harness.stdout.join("")).toBe("a1 update: 1.2.3 → 1.3.0\na1 updated successfully: 1.3.0\n");
  });

  it("records deterministic timing for every completed update phase", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), success(`${resolve("fixtures", "global")}\n`), success(), success()] });
    let tick = 0;
    const timings: Array<{ phase: string; durationMs: number }> = [];

    await expect(runSelfUpdate({
      ...harness,
      now: () => { tick += 5; return tick; },
      onPhaseTiming: event => timings.push(event),
    })).resolves.toBe(0);

    expect(timings.map(event => event.phase)).toEqual([
      "package-version",
      "target-resolution",
      "global-root",
      "ownership-release",
      "npm-install",
      "ownership-release",
      "materialized",
      "certified",
      "active-reference-committed",
      "supervisor-verified",
      "transaction-complete",
    ]);
    expect(timings.every(event => event.durationMs === 5)).toBe(true);
  });

  it("refuses an unmanaged checkout and prints the pinned fallback", async () => {
    const harness = createHarness({
      packageRoot: resolve("fixtures", "checkout"),
      globalRoot: resolve("fixtures", "global"),
    });
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      return arguments_[0] === "view" ? success("2.0.0\n") : success(`${harness.globalRoot}\n`);
    };

    await expect(runSelfUpdate(harness)).resolves.toBe(1);

    expect(harness.invocations).toHaveLength(2);
    expect(harness.stderr.join("")).toContain("not managed beneath npm's global package root");
    expect(harness.stderr.join("")).not.toContain("taskkill");
  });

  it("rejects a malformed running package version before invoking npm", async () => {
    const harness = createHarness({ current: "not-semver" });

    await expect(runSelfUpdate(harness)).resolves.toBe(1);

    expect(harness.invocations).toEqual([]);
    expect(harness.stderr.join("")).toContain("could not read its running package version");
  });

  it("rejects malformed npm version output", async () => {
    const harness = createHarness({ responses: [success("definitely-latest\n")] });

    await expect(runSelfUpdate(harness)).resolves.toBe(1);

    expect(harness.stderr.join("")).toContain("malformed release channel version");
    expect(harness.invocations).toHaveLength(1);
  });

  it("propagates registry lookup failure status", async () => {
    const harness = createHarness({ responses: [{ code: 23, stdout: "" }] });

    await expect(runSelfUpdate(harness)).resolves.toBe(23);

    expect(harness.stderr.join("")).toContain("query the npm release channel");
    expect(harness.stderr.join("")).toContain("status 23");
  });

  it("reports npm startup failures", async () => {
    const harness = createHarness({ responses: [new Error("spawn npm ENOENT")] });

    await expect(runSelfUpdate(harness)).resolves.toBe(1);

    expect(harness.stderr.join("")).toContain("could not execute npm");
    expect(harness.stderr.join("")).toContain("spawn npm ENOENT");
  });

  it("reports global-root lookup failures without attempting installation", async () => {
    const harness = createHarness({ responses: [success("1.3.0\n"), { code: 9, stdout: "" }] });

    await expect(runSelfUpdate(harness)).resolves.toBe(9);

    expect(harness.invocations).toHaveLength(2);
    expect(harness.stderr.join("")).toContain("resolve npm's global package root");
  });

  it("reports canonicalization failures", async () => {
    const harness = createHarness();
    harness.runner = async (_command, arguments_) => arguments_[0] === "view"
      ? success("1.3.0\n")
      : success(`${harness.globalRoot}\n`);
    harness.fileSystem.realpath = async () => { throw new Error("realpath denied"); };

    await expect(runSelfUpdate(harness)).resolves.toBe(1);

    expect(harness.stderr.join("")).toContain("could not canonicalize");
    expect(harness.stderr.join("")).toContain("realpath denied");
  });

  it("propagates installation failure and preserves the exact fallback", async () => {
    const harness = createHarness();
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_[0] === "view") return success("1.3.0\n");
      if (arguments_[0] === "root") return success(`${harness.globalRoot}\n`);
      return { code: 77, stdout: "" };
    };

    await expect(runSelfUpdate(harness)).resolves.toBe(77);

    expect(harness.stderr.join("")).toContain("update failed");
    expect(harness.stderr.join("")).toContain("Diagnostics:");
  });

  it("reports a spawn failure while starting installation", async () => {
    const harness = createHarness();
    harness.runner = async (command, arguments_, request) => {
      harness.invocations.push({ command, arguments: arguments_, request });
      if (arguments_[0] === "view") return success("1.3.0\n");
      if (arguments_[0] === "root") return success(`${harness.globalRoot}\n`);
      throw new Error("permission denied while spawning npm");
    };

    await expect(runSelfUpdate(harness)).resolves.toBe(1);

    expect(harness.stderr.join("")).toContain("start the global npm installation");
    expect(harness.stderr.join("")).toContain("permission denied");
  });
});
