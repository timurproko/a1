import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
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
} from "../../../src/foundation/release/index.js";

interface Invocation {
  command: string;
  arguments: readonly string[];
  request: ProcessRequest;
}

function createHarness(options: {
  current?: string;
  packageRoot?: string;
  globalRoot?: string;
  responses?: Array<ProcessResult | Error>;
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
    async activateInstalled(path, targetVersion) { lifecycleCalls.push(`activate:${path}:${targetVersion}`); },
  };
  let transaction: Awaited<ReturnType<UpdateTransactionJournal["read"]>> = null;
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

describe("A1 self-update orchestration", () => {
  it.each([
    ["the current version", "1.2.3"],
    ["a newer running version", "1.2.2"],
  ])("skips installation for %s", async (_label, latest) => {
    const harness = createHarness({ responses: [success(`${latest}\n`), success(`${resolve("fixtures", "global")}\n`), success()] });

    await expect(runSelfUpdate(harness)).resolves.toBe(0);

    expect(harness.invocations).toEqual([
      { command: "npm", arguments: ["view", `${PRODUCT_PACKAGE}@latest`, "version"], request: { captureStdout: true } },
      { command: "npm", arguments: ["root", "--global"], request: { captureStdout: true } },
      { command: "npm", arguments: ["install", "--global", `${PRODUCT_PACKAGE}@${latest}`], request: { captureStdout: false } },
    ]);
    expect(harness.stdout.join("")).toContain(`A1 updated successfully: ${latest} (stable).`);
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
      { command: "npm", arguments: ["install", "--global", `${PRODUCT_PACKAGE}@1.3.0`], request: { captureStdout: false } },
    ]);
    expect(harness.stdout.join("")).toContain("A1 update (stable): 1.2.3 → 1.3.0.");
    expect(harness.stdout.join("")).toContain("A1 updated successfully: 1.3.0 (stable).");
    expect(harness.stderr).toEqual([]);
  });

  it("resolves and installs the exact npm next version for the preview channel", async () => {
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
      { command: "npm", arguments: ["install", "--global", `${PRODUCT_PACKAGE}@1.3.0-dev.1`], request: { captureStdout: false } },
    ]);
    expect(harness.stdout.join("")).toContain("A1 update (next): 1.3.0-dev.0 → 1.3.0-dev.1.");
    expect(harness.stdout.join("")).toContain(`A1 is installing ${PRODUCT_PACKAGE}@1.3.0-dev.1.\n`);
    expect(harness.stdout.join("")).not.toContain("globally from the next channel");
    expect(harness.stdout.join("")).toContain("A1 updated successfully: 1.3.0-dev.1 (next).");
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

    expect(harness.stderr.join("")).toContain("malformed latest version");
    expect(harness.invocations).toHaveLength(1);
  });

  it("propagates registry lookup failure status", async () => {
    const harness = createHarness({ responses: [{ code: 23, stdout: "" }] });

    await expect(runSelfUpdate(harness)).resolves.toBe(23);

    expect(harness.stderr.join("")).toContain("query the npm latest channel");
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
