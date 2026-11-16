import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { smokePublishedInstaller as runSmoke, readWindowsSystemEvents, updateCommandBudgetMs, type SmokeChildOptions, type SmokeChildResult } from "../../scripts/release/smoke-published-installer.mjs";
import { describePublicationFailure } from "../../scripts/release/publication-client.mjs";

function smokePublishedInstaller({ environment, spawnSync }: {
  environment: NodeJS.ProcessEnv;
  spawnSync: (command: string, args: string[], options: SmokeChildOptions) => SmokeChildResult;
}) {
  return runSmoke({ environment, createRunner: () => ({ run: spawnSync, close: async () => {} }), readSystemEvents: async () => ({ events: [], antimalware: null }), writeProgress: () => {} });
}

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const version = "0.2.7-dev.1307";
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-smoke-evidence-"));
  roots.push(root);
  const output = resolve(root, "evidence.json");
  const environment = {
    RELEASE_VERSION: version, RELEASE_CHANNEL: "next", PUBLISHED_INSTALLER_EVIDENCE: output,
    EXPECTED_APPLICATION_INTEGRITY: "sha512-application", EXPECTED_INSTALLER_INTEGRITY: "sha512-installer",
    NODE_AUTH_TOKEN: "super-secret-fixture-token", PATH: process.env.PATH,
  };
  return { output, environment };
}
const ok = { status: 0, stdout: "", stderr: "" };
function writeManifest(options: SmokeChildOptions, selectedVersion = version) {
  const prefix = options.env.npm_config_prefix!;
  const directory = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: selectedVersion }));
}

function successfulCommand(_command: string, args: string[], options: SmokeChildOptions): SmokeChildResult {
  if (args[0] === "view") return { ...ok, stdout: JSON.stringify("0.2.7-dev.1305") };
  if (args[0] === "update") writeManifest(options);
  if (args[0] === "--develop") {
    writeManifest(options, args[1]);
    return { ...ok, stdout: "a1 successfully installed\n" };
  }
  return ok;
}

describe("published installer smoke evidence", () => {
  it("keeps exact target, transcript, manifest, and launch checks on success", async () => {
    const { output, environment } = await fixture();
    const calls: string[][] = [];
    let disposable = "";
    await smokePublishedInstaller({ environment, spawnSync: (_command, args, options) => {
      disposable = options.cwd;
      expect(options.env.npm_config_cache).toBe(resolve(options.cwd, "npm-cache"));
      calls.push(args);
      if (args[0] === "view") return { ...ok, stdout: JSON.stringify("0.2.7-dev.1305") };
      if (args[0] === "update") writeManifest(options);
      if (args[0] === "--develop") {
        writeManifest(options, args[1]);
        return { ...ok, stdout: "a1 successfully installed\n" };
      }
      return ok;
    } });
    expect(calls[0]).toContain(`@timurproko/a1-install@${version}`);
    expect(calls[1]).toEqual(["--develop", version]);
    expect(calls[2]).toEqual(["version"]);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "success", installedVersion: version, launcherVerified: true, updateVerified: true });
    await expect(stat(disposable)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["acquire-installer", "install-application", "verify-manifest", "launch-application"])("preserves %s failure and cleans fixture", async failureStage => {
    const { output, environment } = await fixture();
    let call = 0;
    let disposable = "";
    await expect(smokePublishedInstaller({ environment, spawnSync: (_command, _args, options) => {
      disposable = options.cwd;
      const current = ["acquire-installer", "install-application", "launch-application"][call++];
      const logs = resolve(options.env.npm_config_cache!, "_logs");
      mkdirSync(logs, { recursive: true });
      writeFileSync(resolve(logs, "owned.log"), `npm error E404 missing tarball\nhttps://user:password@example.com/path?token=hidden\n${environment.NODE_AUTH_TOKEN}\n`);
      if (current === failureStage) return { ...ok, status: 1, stderr: `npm failed ${environment.NODE_AUTH_TOKEN}` };
      if (current === "install-application") { writeManifest(options, failureStage === "verify-manifest" ? "wrong" : version); return { ...ok, stdout: "a1 successfully installed\n" }; }
      return ok;
    } })).rejects.toThrow();
    const text = await readFile(output, "utf8");
    expect(text).not.toContain(environment.NODE_AUTH_TOKEN);
    expect(text).not.toContain("user:password");
    expect(text).not.toContain("token=hidden");
    expect(JSON.parse(text)).toMatchObject({ outcome: "failure", stage: failureStage, activationVerified: false });
    expect(text).toContain("E404 missing tarball");
    await expect(stat(disposable)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not relax the installer transcript and bounds diagnostic output", async () => {
    const { output, environment } = await fixture();
    let call = 0;
    await expect(smokePublishedInstaller({ environment, spawnSync: () => ++call === 1 ? ok : { ...ok, stdout: "x".repeat(100_000) } })).rejects.toThrow(/transcript/u);
    const text = await readFile(output, "utf8");
    expect(text.length).toBeLessThan(12_000);
    expect(JSON.parse(text)).toMatchObject({ outcome: "failure", stage: "install-application" });
  });

  it.each(["latest", "next"])("checks a distinct predecessor update before %s promotion", async channel => {
    const { output, environment } = await fixture();
    const calls: string[][] = [];
    await expect(smokePublishedInstaller({ environment: { ...environment, RELEASE_CHANNEL: channel }, spawnSync: (_command, args, options) => {
      calls.push(args);
      if (args[0] === "view") return { ...ok, stdout: JSON.stringify("0.2.6") };
      if (args[0] === "update") return { ...ok, status: 1, stderr: "replacement failed" };
      if (args.length === 0 || args[0] === "--develop") { writeManifest(options); return { ...ok, stdout: "a1 successfully installed\n" }; }
      return ok;
    } })).rejects.toThrow(/replacement failed/u);
    expect(calls.at(-1)).toEqual(channel === "next" ? ["update", "--develop", version] : ["update", "--release"]);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "failure", stage: "update-predecessor" });
  });

  it("allows five-minute installations while retaining two-minute acquisition and updates and short query and launch deadlines", async () => {
    expect(updateCommandBudgetMs()).toBe(2 * 60_000);
    const { environment } = await fixture();
    const budgets = new Map<string, number>();
    await smokePublishedInstaller({ environment, spawnSync: (command, args, options) => {
      budgets.set(args[0] === "--develop" && budgets.has("--develop") ? "install-predecessor" : args[0] ?? command, options.timeout);
      return successfulCommand(command, args, options);
    } });
    expect(budgets.get("install")).toBe(2 * 60_000);
    expect(budgets.get("update")).toBe(2 * 60_000);
    expect(budgets.get("--develop")).toBe(5 * 60_000);
    expect(budgets.get("install-predecessor")).toBe(5 * 60_000);
    expect(budgets.get("view")).toBe(30_000);
    expect(budgets.get("version")).toBe(30_000);
    expect(budgets.get("--help")).toBe(30_000);
  });

  it.each([version, "0.2.7-dev.1305"])("continues exact package and launch checks after a slow installation of %s", async installedVersion => {
    const { output, environment } = await fixture();
    const progress: string[] = [];
    const launches: string[][] = [];
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    try {
      await runSmoke({
        environment, writeProgress: text => { progress.push(text); },
        readSystemEvents: async () => ({ events: [], antimalware: null }),
        createRunner: () => ({
          run: async (command, args, options) => {
            if (args[0] === "--develop" && args[1] === installedVersion) {
              await vi.advanceTimersByTimeAsync(128_000);
              if (options.timeout < 128_000) return { ...ok, status: null, error: new Error("installation deadline exceeded") };
            }
            if (["version", "--help"].includes(args[0]!)) launches.push(args);
            return successfulCommand(command, args, options);
          },
          close: async () => {},
        }),
      });
      const stage = installedVersion === version ? "install-application" : "install-predecessor";
      expect(progress).toContain(`[published installer] ${stage} running (120000ms elapsed; timeout=300000ms)\n`);
      expect(launches).toEqual([["version"], ["--help"], ["--help"]]);
      expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({
        outcome: "success", installedVersion: version, launcherVerified: true, updateVerified: true,
        timings: { [stage]: 128_000 },
      });
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("prints each phase before waiting and reports failed commands without a success message", async () => {
    const { environment } = await fixture();
    const progress: string[] = [];
    await expect(runSmoke({
      environment,
      readSystemEvents: async () => ({ events: [], antimalware: null }),
      writeProgress: text => { progress.push(text); },
      createRunner: () => ({
        run: (command, args, options) => {
          expect(progress.at(-1)).toMatch(/ started \(timeout=\d+ms\)\n$/u);
          expect(progress.at(-1)).toContain(`timeout=${options.timeout}ms`);
          return args[0] === "update" ? { ...ok, status: 1, stderr: "replacement failed" } : successfulCommand(command, args, options);
        },
        close: async () => {},
      }),
    })).rejects.toThrow("replacement failed");
    expect(progress[0]).toBe("[published installer] acquire-installer started (timeout=120000ms)\n");
    expect(progress).toContain("[published installer] install-application started (timeout=300000ms)\n");
    expect(progress).toContain("[published installer] install-predecessor started (timeout=300000ms)\n");
    expect(progress).toContain("[published installer] update-predecessor started (timeout=120000ms)\n");
    expect(progress.at(-1)).toMatch(/^\[published installer\] update-predecessor failed \(\d+ms\)\n$/u);
    expect(progress.join("")).not.toContain("update-predecessor passed");
  });

  it.each([false, true])("prints elapsed progress while a silent command runs and clears its timer after thrown=%s", async thrown => {
    const { output, environment } = await fixture();
    const progress: string[] = [];
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    try {
      const run = runSmoke({
        environment, writeProgress: text => { progress.push(text); }, writeDiagnostic: () => {},
        readSystemEvents: async () => ({ events: [], antimalware: null }),
        createRunner: () => ({
          run: async () => {
            await vi.advanceTimersByTimeAsync(30_000);
            expect(progress.at(-1)).toBe("[published installer] acquire-installer running (30000ms elapsed; timeout=120000ms)\n");
            if (thrown) throw new Error("runner failed");
            return { ...ok, status: null, error: new Error("command timed out") };
          },
          close: async () => {},
        }),
      });
      await expect(run).rejects.toThrow(thrown ? "runner failed" : "command timed out");
      const messages = progress.length;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(progress).toHaveLength(messages);
      expect(vi.getTimerCount()).toBe(0);
      expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "failure", stage: "acquire-installer" });
    } finally { vi.useRealTimers(); }
  });

  it("checkpoints sanitized failure evidence before settlement and updates it after secondary cleanup failure", async () => {
    const { output, environment } = await fixture();
    let checkpointRead = false;
    await expect(runSmoke({
      environment, writeProgress: () => {}, writeDiagnostic: () => {},
      readSystemEvents: async () => ({ events: [], antimalware: null }),
      createRunner: root => {
        roots.push(root);
        return {
          run: () => ({ ...ok, status: 1, stderr: `acquisition failed ${environment.NODE_AUTH_TOKEN}` }),
          close: async () => {
            const text = await readFile(output, "utf8");
            expect(text).not.toContain(environment.NODE_AUTH_TOKEN);
            expect(JSON.parse(text)).toMatchObject({ outcome: "failure", stage: "acquire-installer", error: "acquisition failed [redacted]" });
            expect(JSON.parse(text).cleanup).toBeUndefined();
            expect((await stat(root)).isDirectory()).toBe(true);
            checkpointRead = true;
            throw new Error("settlement failed");
          },
        };
      },
    })).rejects.toThrow("acquisition failed [redacted]");
    expect(checkpointRead).toBe(true);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({
      outcome: "failure", stage: "acquire-installer", error: "acquisition failed [redacted]", cleanup: { error: "settlement failed" },
    });
  });

  it("pins only A1 tag discovery while forwarding actual npm installs unchanged", async () => {
    const { output } = await fixture();
    const cli = resolve(output, "..", "fake-npm.mjs");
    writeFileSync(cli, "console.log(JSON.stringify(process.argv.slice(2)));\n");
    for (const [args, expected] of [
      [["view", "@timurproko/a1@latest", "version"], ["view", `@timurproko/a1@${version}`, "version"]],
      [["install", "--global", `@timurproko/a1@${version}`], ["install", "--global", `@timurproko/a1@${version}`]],
      [["view", "other-package@latest", "version"], ["view", "other-package@latest", "version"]],
    ]) {
      const result = spawnSync(process.execPath, ["scripts/release/published-candidate-npm-bridge.mjs", ...args!], {
        env: { ...process.env, PUBLISHED_SMOKE_NPM_CLI: cli, PUBLISHED_SMOKE_VERSION: version, PUBLISHED_SMOKE_PACKAGE_NAME: "@timurproko/a1" }, encoding: "utf8",
      });
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(expected);
    }
  });

  it.each(["settlement", "removal"])("preserves the update timeout when %s also fails and emits safe Actions annotations", async failure => {
    const { output, environment } = await fixture();
    const diagnostics: string[] = [];
    const cleanupMessage = `EBUSY 100% ${environment.NODE_AUTH_TOKEN} https://user:password@example.com/path?token=hidden\n%0A::error::forged`;
    let removed = false;
    await expect(runSmoke({
      environment: { ...environment, GITHUB_ACTIONS: "true" },
      createRunner: root => {
        roots.push(root);
        return {
          run: (command, args, options) => args[0] === "update"
            ? { ...ok, status: null, error: new Error("ETIMEDOUT published update"), stdout: "updating predecessor" }
            : successfulCommand(command, args, options),
          close: async () => { if (failure === "settlement") throw new Error(cleanupMessage); },
        };
      },
      removeFixture: async () => { removed = true; throw new Error(cleanupMessage); },
      writeDiagnostic: text => { diagnostics.push(text); },
    })).rejects.toThrow("ETIMEDOUT published update");
    const text = await readFile(output, "utf8");
    expect(JSON.parse(text)).toMatchObject({
      outcome: "failure", stage: "update-predecessor", error: "ETIMEDOUT published update",
      child: { status: null, stdout: "updating predecessor" }, cleanup: { error: expect.stringContaining("EBUSY") },
      launcherVerified: false, activationVerified: false,
    });
    expect(removed).toBe(failure === "removal");
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]).toContain("::error title=Published installer smoke::update-predecessor: ETIMEDOUT");
    expect(diagnostics[1]).toContain("secondary cleanup failure");
    expect(diagnostics[1]).toContain("100%25");
    expect(diagnostics[1]).toContain("%250A::error::forged");
    for (const value of [text, diagnostics.join("")]) {
      expect(value).not.toContain(environment.NODE_AUTH_TOKEN);
      expect(value).not.toContain("user:password");
      expect(value).not.toContain("token=hidden");
    }
    expect(diagnostics.join("").split("\n").filter(Boolean)).toHaveLength(2);
    const summary = describePublicationFailure(43732033913, {
      repository: "timurproko/a1", version, develop: true,
      jobs: [{ id: 123, name: "Develop / Published pair (win32-node24, windows-2025, 24)", conclusion: "failure" }],
      run: () => JSON.stringify([[{ annotation_level: "failure", message: diagnostics[0]!.split("::").at(-1)!.trim() }]]),
    });
    expect(summary).toContain("update-predecessor: ETIMEDOUT published update");
    expect(summary).not.toContain("Detailed failure evidence unavailable");
  });

  it.each(["settlement", "removal"])("records cleanup-only %s failure without reporting a successful smoke", async failure => {
    const { output, environment } = await fixture();
    const diagnostics: string[] = [];
    const stdout = vi.spyOn(process.stdout, "write");
    try {
      await expect(runSmoke({
        environment: { ...environment, GITHUB_ACTIONS: "true" },
        createRunner: root => {
          roots.push(root);
          return { run: successfulCommand, close: async () => { if (failure === "settlement") throw new Error("guardian did not settle"); } };
        },
        removeFixture: async () => { throw new Error("EBUSY fixture removal"); },
        writeDiagnostic: text => { diagnostics.push(text); },
      })).rejects.toThrow(failure === "settlement" ? "guardian did not settle" : "EBUSY fixture removal");
      expect(stdout.mock.calls.some(([value]) => String(value).includes("Published installer smoke passed"))).toBe(false);
    } finally { stdout.mockRestore(); }
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "failure", stage: "cleanup", cleanup: { error: expect.any(String) } });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toContain("::cleanup:");
  });

  it("retains the primary error and annotation if evidence itself cannot be written", async () => {
    const { output, environment } = await fixture();
    const diagnostics: string[] = [];
    await expect(runSmoke({
      environment: { ...environment, GITHUB_ACTIONS: "true", PUBLISHED_INSTALLER_EVIDENCE: resolve(output, "impossible.json") },
      createRunner: () => ({ run: () => { writeFileSync(output, "not a directory"); return { ...ok, status: 1, stderr: "npm download failed" }; }, close: async () => {} }),
      writeDiagnostic: text => { diagnostics.push(text); },
    })).rejects.toThrow("npm download failed");
    expect(diagnostics[0]).toContain("acquire-installer: npm download failed");
    expect(diagnostics[1]).toContain("secondary evidence write failure");
  });

  it("records spawn errors without invoking npm again", async () => {
    const { output, environment } = await fixture();
    await expect(smokePublishedInstaller({ environment, spawnSync: () => ({ ...ok, status: null, error: new Error("spawn ENOENT") }) })).rejects.toThrow(/ENOENT/u);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "failure", child: { status: null, error: "spawn ENOENT" } });
  });

  it("records the live process set, update records, npm log identities, and stage durations when the predecessor update stalls", async () => {
    const { output, environment } = await fixture();
    const order: string[] = [];
    let root = "";
    let sinceSeen = "";
    const launcherName = "a1";
    const stalledArgv = [process.execPath, "npm-cli.js", "install", "--global", `--//registry/:_authToken=${environment.NODE_AUTH_TOKEN}`];
    await expect(runSmoke({
      environment: { ...environment, AUTH_WORD: "root" },
      readSystemEvents: async since => {
        sinceSeen = since;
        return {
          antimalware: { RealTimeProtectionEnabled: true, BehaviorMonitorEnabled: true },
          events: Array.from({ length: 120 }, (_, index) => ({
            log: "Microsoft-Windows-Windows Defender/Operational", id: index === 0 ? 1117 : 1150, time: "2026-11-15T19:20:39.500Z", provider: "Microsoft-Windows-Windows Defender",
            message: index === 0 ? `Action: Remove node.exe ${environment.NODE_AUTH_TOKEN} ${"x".repeat(900)}` : "heartbeat",
          })),
        };
      },
      createRunner: fixtureRoot => {
        root = fixtureRoot;
        roots.push(fixtureRoot);
        return {
          run: (command, args, options) => {
            if (args[0] !== "update") return successfulCommand(command, args, options);
            const capsule = resolve(fixtureRoot, "update-data", "update-recovery", "5f1c0e2a-tx");
            mkdirSync(capsule, { recursive: true });
            writeFileSync(resolve(fixtureRoot, "update-data", "update-transaction.json"), JSON.stringify({ phase: "ownership-released", token: environment.NODE_AUTH_TOKEN }));
            writeFileSync(resolve(capsule, "owner.json"), JSON.stringify({ pid: 4321, heartbeatAt: "2026-11-15T17:31:51Z" }));
            writeFileSync(resolve(capsule, "capsule.json"), JSON.stringify({ npmCli: "ignored manifest" }));
            const prefix = options.env.npm_config_prefix!;
            const modules = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules");
            mkdirSync(resolve(modules, ".a1-retired-1307"), { recursive: true });
            const launcherRoot = process.platform === "win32" ? prefix : resolve(prefix, "bin");
            mkdirSync(launcherRoot, { recursive: true });
            writeFileSync(resolve(launcherRoot, launcherName), `#!/bin/sh
exec node "${modules}/@timurproko/a1/bin/cli.js" "$@" ${environment.NODE_AUTH_TOKEN}
`);
            const logs = resolve(options.env.npm_config_cache!, "_logs");
            mkdirSync(logs, { recursive: true });
            writeFileSync(resolve(logs, "2026-11-15T17_21_52_159Z-debug-0.log"), `7 verbose argv "root" "--global"\n15 verbose exit 0\n`);
            writeFileSync(resolve(logs, "2026-11-15T17_22_10_000Z-debug-0.log"), "895 http cache dependency.tgz 0ms (cache hit)\n");
            return { ...ok, status: null, error: new Error("published smoke command timed out after 1200000ms"), stdout: "a1 update: 0.2.7-dev.1307 → 0.2.7-dev.1316\nnpm root --global" };
          },
          inventory: async () => { order.push("inventory"); return [{ pid: 4321, parent: 1, start: "4321", executable: process.execPath, argv: stalledArgv }]; },
          history: () => ({ samples: 90, errors: 1, lastError: `inspection busy ${environment.NODE_AUTH_TOKEN}`, rows: [
            { pid: 9092, parent: 4321, start: "9092", executable: process.execPath, argv: [process.execPath, resolve(fixtureRoot, "update-data", "update-recovery", "tx", "recovery.js"), "--worker"], firstSeen: "2026-11-15T19:18:47.000Z", lastSeen: "2026-11-15T19:20:37.000Z" },
            { pid: 4321, parent: 1, start: "4321", executable: process.execPath, argv: stalledArgv, firstSeen: "2026-11-15T19:18:37.000Z", lastSeen: "2026-11-15T19:33:37.000Z" },
          ] }),
          close: async () => { order.push("close"); },
        };
      },
    })).rejects.toThrow("timed out after 1200000ms");
    expect(order).toEqual(["inventory", "close"]);
    const text = await readFile(output, "utf8");
    expect(text).not.toContain(environment.NODE_AUTH_TOKEN);
    const evidence = JSON.parse(text) as Record<string, unknown>;
    expect(evidence).toMatchObject({
      outcome: "failure", stage: "update-predecessor",
      child: { stdout: expect.stringContaining("npm root --global") },
      processes: [{ pid: 4321, parent: 1, start: "4321", argv: expect.stringContaining("install --global") }],
      updateRecords: {
        "update-data/update-transaction.json": { size: expect.any(Number), mtime: expect.any(String), tail: expect.stringContaining("ownership-released") },
        "update-data/update-recovery/5f1c0e2a-tx/owner.json": { tail: expect.stringContaining("4321") },
      },
      npmLogs: [
        { name: "2026-11-15T17_22_10_000Z-debug-0.log", size: expect.any(Number), mtime: expect.any(String) },
        { name: "2026-11-15T17_21_52_159Z-debug-0.log", size: expect.any(Number), mtime: expect.any(String) },
      ],
      timings: { "install-application": expect.any(Number), "update-predecessor": expect.any(Number) },
      processHistory: { samples: 90, errors: 1, lastError: expect.stringContaining("inspection busy"), rows: [
        { pid: 9092, parent: 4321, firstSeen: "2026-11-15T19:18:47.000Z", lastSeen: "2026-11-15T19:20:37.000Z", argv: expect.stringContaining("recovery.js --worker") },
        { pid: 4321, lastSeen: "2026-11-15T19:33:37.000Z", argv: expect.stringContaining("[redacted]") },
      ] },
    });
    expect(Object.keys(evidence.updateRecords as object)).not.toContain("update-data/update-recovery/5f1c0e2a-tx/capsule.json");
    expect(Date.parse(sinceSeen)).toBeLessThanOrEqual(Date.now());
    const systemEvents = evidence.systemEvents as { events: Array<{ id: number; message: string }>; antimalware: Record<string, unknown> };
    expect(systemEvents.antimalware).toEqual({ RealTimeProtectionEnabled: true, BehaviorMonitorEnabled: true });
    expect(systemEvents.events).toHaveLength(100);
    expect(systemEvents.events[0]).toMatchObject({ id: 1117, message: expect.stringContaining("Action: Remove node.exe [redacted]") });
    expect(systemEvents.events[0]!.message.length).toBeLessThanOrEqual(600);
    expect(evidence.replacementState).toMatchObject({
      "update-application": { retired: [".a1-retired-1307"], scoped: true, installedVersion: "0.2.7-dev.1305", },
      application: { retired: [], scoped: true, installedVersion: version },
    });
    const launchers = (evidence.replacementState as Record<string, { launchers: Record<string, { content: string }> }>)["update-application"]!.launchers;
    expect(Object.keys(launchers)).toEqual([launcherName]);
    expect(Object.values(launchers)[0]!.content).toContain("bin/cli.js");
    expect(JSON.stringify(evidence.replacementState)).not.toContain(environment.NODE_AUTH_TOKEN);
    expect((evidence.processes as Array<{ argv: string }>)[0]!.argv).toContain("[redacted]");
    expect((evidence.npmDiagnostics as string[]).join("\n")).toContain('verbose argv "root" "--global"');
    expect(root).not.toBe("");
  });

  it("keeps the primary failure when process inventory is unavailable and records stage durations on success", async () => {
    const { output, environment } = await fixture();
    await expect(runSmoke({
      environment,
      createRunner: root => {
        roots.push(root);
        return {
          run: (command, args, options) => args[0] === "update" ? { ...ok, status: 1, stderr: "replacement failed" } : successfulCommand(command, args, options),
          inventory: async () => { throw new Error(`inspection unavailable ${environment.NODE_AUTH_TOKEN}`); },
          close: async () => {},
        };
      },
    })).rejects.toThrow("replacement failed");
    const text = await readFile(output, "utf8");
    expect(text).not.toContain(environment.NODE_AUTH_TOKEN);
    expect(JSON.parse(text)).toMatchObject({ outcome: "failure", stage: "update-predecessor", error: "replacement failed", processes: { error: expect.stringContaining("inspection unavailable") }, updateRecords: {}, npmLogs: [] });

    const success = await fixture();
    await smokePublishedInstaller({ environment: success.environment, spawnSync: successfulCommand });
    expect(JSON.parse(await readFile(success.output, "utf8"))).toMatchObject({ outcome: "success", timings: { "acquire-installer": expect.any(Number), "update-predecessor": expect.any(Number) } });
  });

  it("keeps the primary failure when system records cannot be read", async () => {
    const { output, environment } = await fixture();
    await expect(runSmoke({
      environment,
      readSystemEvents: async () => { throw new Error(`Get-WinEvent refused ${environment.NODE_AUTH_TOKEN}`); },
      createRunner: root => {
        roots.push(root);
        return { run: (command, args, options) => args[0] === "update" ? { ...ok, status: 1, stderr: "replacement failed" } : successfulCommand(command, args, options), close: async () => {} };
      },
    })).rejects.toThrow("replacement failed");
    const text = await readFile(output, "utf8");
    expect(text).not.toContain(environment.NODE_AUTH_TOKEN);
    expect(JSON.parse(text)).toMatchObject({ outcome: "failure", stage: "update-predecessor", systemEvents: { error: expect.stringContaining("Get-WinEvent refused") } });
  });

  it("reads no system records outside Windows and refuses an unbounded window", async () => {
    let executed = 0;
    await expect(readWindowsSystemEvents("2026-11-15T19:18:37.000Z", { platform: "linux", execute: async () => { executed += 1; return { stdout: "" }; } })).resolves.toEqual({ events: [], antimalware: null });
    expect(executed).toBe(0);
    await expect(readWindowsSystemEvents("2026-11-15 19:18", { platform: "win32", execute: async () => ({ stdout: "" }) })).rejects.toThrow("invalid system event window");
    const encoded = Buffer.from(JSON.stringify({ events: { log: "Application", id: 1000, time: "t", provider: "Application Error", message: "node.exe crashed" }, antimalware: { RealTimeProtectionEnabled: false } })).toString("base64");
    const captured: unknown[] = [];
    await expect(readWindowsSystemEvents("2026-11-15T19:18:37Z", { platform: "win32", execute: async (file, args, options) => { captured.push(file, args.at(-2), Buffer.from(args.at(-1)!, "base64").toString("utf16le").includes("Parse('2026-11-15T19:18:37Z')"), options.timeout); return { stdout: encoded }; } }))
      .resolves.toEqual({ events: [{ log: "Application", id: 1000, time: "t", provider: "Application Error", message: "node.exe crashed" }], antimalware: { RealTimeProtectionEnabled: false } });
    expect(captured).toEqual(["powershell.exe", "-EncodedCommand", true, 30_000]);
  });

  it.runIf(process.platform === "win32")("reads antimalware status and bounded events from the native Windows logs", async () => {
    const records = await readWindowsSystemEvents(new Date(Date.now() - 60 * 60_000).toISOString());
    expect(Array.isArray(records.events)).toBe(true);
    expect(records.events.length).toBeLessThanOrEqual(100);
    expect(records.antimalware).toEqual(expect.objectContaining({ RealTimeProtectionEnabled: expect.anything() }));
    for (const event of records.events) expect(event).toEqual(expect.objectContaining({ log: expect.any(String), id: expect.any(Number), time: expect.any(String) }));
  }, 60_000);
});
