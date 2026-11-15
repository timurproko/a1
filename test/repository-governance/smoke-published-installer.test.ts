import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { smokePublishedInstaller as runSmoke, updateCommandBudgetMs, type SmokeChildOptions, type SmokeChildResult } from "../../scripts/release/smoke-published-installer.mjs";
import { describePublicationFailure } from "../../scripts/release/publication-client.mjs";

function smokePublishedInstaller({ environment, spawnSync }: {
  environment: NodeJS.ProcessEnv;
  spawnSync: (command: string, args: string[], options: SmokeChildOptions) => SmokeChildResult;
}) {
  return runSmoke({ environment, createRunner: () => ({ run: spawnSync, close: async () => {} }) });
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

  it("gives only the Windows predecessor update a budget beyond the updater's fifteen-minute worker deadline", async () => {
    expect(updateCommandBudgetMs("win32")).toBe(20 * 60_000);
    for (const platform of ["linux", "darwin"] as const) expect(updateCommandBudgetMs(platform)).toBe(10 * 60_000);
    const { environment } = await fixture();
    const budgets = new Map<string, number>();
    await smokePublishedInstaller({ environment, spawnSync: (command, args, options) => {
      budgets.set(args[0] === "--develop" && budgets.has("--develop") ? "install-predecessor" : args[0] ?? command, options.timeout);
      return successfulCommand(command, args, options);
    } });
    expect(budgets.get("update")).toBe(updateCommandBudgetMs(process.platform));
    expect(budgets.get("--develop")).toBe(10 * 60_000);
    expect(budgets.get("install-predecessor")).toBe(10 * 60_000);
    expect(budgets.get("version")).toBe(30_000);
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
    const stalledArgv = [process.execPath, "npm-cli.js", "install", "--global", `--//registry/:_authToken=${environment.NODE_AUTH_TOKEN}`];
    await expect(runSmoke({
      environment: { ...environment, AUTH_WORD: "root" },
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
            const logs = resolve(options.env.npm_config_cache!, "_logs");
            mkdirSync(logs, { recursive: true });
            writeFileSync(resolve(logs, "2026-11-15T17_21_52_159Z-debug-0.log"), `7 verbose argv "root" "--global"\n15 verbose exit 0\n`);
            writeFileSync(resolve(logs, "2026-11-15T17_22_10_000Z-debug-0.log"), "895 http cache dependency.tgz 0ms (cache hit)\n");
            return { ...ok, status: null, error: new Error("published smoke command timed out after 1200000ms"), stdout: "a1 update: 0.2.7-dev.1307 → 0.2.7-dev.1316\nnpm root --global" };
          },
          inventory: async () => { order.push("inventory"); return [{ pid: 4321, parent: 1, start: "4321", executable: process.execPath, argv: stalledArgv }]; },
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
    });
    expect(Object.keys(evidence.updateRecords as object)).not.toContain("update-data/update-recovery/5f1c0e2a-tx/capsule.json");
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
});
