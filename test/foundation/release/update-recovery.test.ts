import { spawn } from "node:child_process";
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupUpdateRecoveryCapsules,
  inspectUpdateLauncherSet,
  npmPrefixForGlobalRoot,
  prepareUpdateRecoveryCapsule,
  readUpdateRecoveryCapsule,
  runProtectedPackageReplacement,
  runSelfUpdate,
  UpdateTransactionStore,
  updateLauncherPaths,
  updateNpmInstallArguments,
  type UpdateTransaction,
} from "../../../src/foundation/release/index.js";
import { installedRecoveryIsSettled, resolveNpmCli, restoreUpdateRecoveryLaunchers } from "../../../src/foundation/release/update-recovery.js";
import { fakeUpdateInstaller } from "../../support/update-installer-fake.js";

const roots: string[] = [];
afterEach(async () => await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("cancellation-safe package replacement", () => {
  it("imports recovery helpers without dispatching for unrelated or unavailable argv entries", async () => {
    const entryUrl = pathToFileURL(resolve("bin/update-recovery.js")).href;
    for (const invoked of [resolve("package.json"), resolve("missing-recovery-entry.js")]) {
      const child = spawn(process.execPath, ["--input-type=module", "-e", `
        process.argv[1] = ${JSON.stringify(invoked)};
        process.argv[2] = "--worker";
        const helpers = await import(${JSON.stringify(entryUrl)});
        if (typeof helpers.writeJson !== "function") throw new Error("missing helper");
      `], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
      let stderr = "";
      child.stderr!.on("data", chunk => { stderr += chunk.toString(); });
      const code = await new Promise<number | null>((resolvePromise, rejectPromise) => {
        child.once("error", rejectPromise);
        child.once("close", resolvePromise);
      });
      expect(code, stderr).toBe(0);
    }
  });
  it("derives exact platform prefixes, launchers, and pinned npm arguments", () => {
    const windowsRoot = resolve("C:/npm/node_modules");
    const unixRoot = "/usr/local/lib/node_modules";
    expect(npmPrefixForGlobalRoot(windowsRoot, "win32")).toBe(resolve("C:/npm"));
    expect(npmPrefixForGlobalRoot(unixRoot, "linux")).toBe(resolve("/usr/local"));
    expect(updateLauncherPaths(windowsRoot, "win32").map(path => path.split(/[\\/]/).at(-1))).toEqual(["a1", "a1.cmd", "a1.ps1"]);
    expect(updateLauncherPaths(unixRoot, "linux")).toEqual([resolve("/usr/local/bin/a1")]);
    expect(updateNpmInstallArguments(unixRoot, "1.2.3", "linux")).toEqual([
      "install", "--global", "--prefix", resolve("/usr/local"),
      "--loglevel=error", "--no-fund", "--no-audit", "@timurproko/a1@1.2.3",
    ]);
    expect(() => npmPrefixForGlobalRoot(resolve("fixtures", "global"), "win32")).toThrow(/unsupported layout/);
  });

  it("rejects incomplete and mixed launcher sets", async () => {
    const fixture = await recoveryFixture("success");
    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
    expect(prepared.capsule.npmArguments).toEqual([
      "install", "--global", "--prefix", npmPrefixForGlobalRoot(prepared.capsule.globalRoot),
      "--loglevel=error", "--no-fund", "--no-audit", "@timurproko/a1@1.1.0",
    ]);
    for (const launcher of fixture.launchers) {
      await writeFile(launcher, "node_modules/@timurproko/a1/bin/cli.js");
      await chmod(launcher, 0o755);
    }
    await expect(inspectUpdateLauncherSet(prepared.capsule)).resolves.toBe("target");

    await writeFile(fixture.launchers[0]!, `launch ${prepared.capsule.recoveryEntry}`);
    expect(await inspectUpdateLauncherSet(prepared.capsule)).toBe(fixture.launchers.length === 1 ? "recovery" : "unavailable");
    await rm(fixture.launchers.at(-1)!, { force: true });
    await expect(inspectUpdateLauncherSet(prepared.capsule)).resolves.toBe("unavailable");

    const linkedLauncher = fixture.launchers[0]!;
    const outside = resolve(fixture.root, "outside-launcher");
    await rm(linkedLauncher, { force: true });
    await mkdir(outside);
    await symlink(outside, linkedLauncher, process.platform === "win32" ? "junction" : "dir");
    await expect(inspectUpdateLauncherSet(prepared.capsule)).resolves.toBe("unavailable");
  });

  it.runIf(process.platform !== "win32")("classifies npm's Unix symlink launcher by its exact target", async () => {
    const fixture = await recoveryFixture("success");
    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
    const entry = resolve(fixture.options.packageRoot, "bin", "cli.js");
    await writeFile(entry, "// target");
    await rm(fixture.launchers[0]!, { force: true });
    await symlink(entry, fixture.launchers[0]!);
    await expect(inspectUpdateLauncherSet(prepared.capsule)).resolves.toBe("target");

    const foreign = resolve(fixture.options.packageRoot, "bin", "other.js");
    await writeFile(foreign, "// foreign");
    await rm(fixture.launchers[0]!, { force: true });
    await symlink(foreign, fixture.launchers[0]!);
    await expect(inspectUpdateLauncherSet(prepared.capsule)).resolves.toBe("unavailable");
  });

  it.runIf(process.platform !== "win32")("rejects a non-executable Unix launcher", async () => {
    const fixture = await recoveryFixture("success");
    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
    await writeFile(fixture.launchers[0]!, "node_modules/@timurproko/a1/bin/cli.js");
    await chmod(fixture.launchers[0]!, 0o644);
    await expect(inspectUpdateLauncherSet(prepared.capsule)).resolves.toBe("unavailable");
  });

  it("ignores an interrupted private capsule candidate and commits complete authority", async () => {
    const fixture = await recoveryFixture("success");
    const incomplete = resolve(fixture.options.dataDir, "update-recovery", ".candidate-interrupted");
    await mkdir(incomplete, { recursive: true });
    await writeFile(resolve(incomplete, "capsule.json"), "incomplete");

    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
    await expect(readUpdateRecoveryCapsule(prepared.manifestPath)).resolves.toMatchObject({ transactionId: fixture.options.transaction.transactionId });
    await expect(readUpdateRecoveryCapsule(resolve(incomplete, "capsule.json"))).rejects.toThrow();
  });

  it("uses the active npm implementation while pinning replacement to another prefix", async () => {
    const fixture = await recoveryFixture("success");
    const activePrefix = resolve(fixture.root, "active-prefix");
    const activeGlobalRoot = process.platform === "win32"
      ? resolve(activePrefix, "node_modules")
      : resolve(activePrefix, "lib", "node_modules");
    const activeNpmCli = resolve(activeGlobalRoot, "npm", "bin", "npm-cli.js");
    await mkdir(dirname(activeNpmCli), { recursive: true });
    await writeFile(activeNpmCli, "// active npm");
    const environment: NodeJS.ProcessEnv = { ...fixture.options.environment };
    for (const key of Object.keys(environment)) if (key.toLowerCase() === "npm_execpath") delete environment[key];

    const prepared = await prepareUpdateRecoveryCapsule({
      ...fixture.options,
      npmCliRoot: activeGlobalRoot,
      environment,
    });

    expect(prepared.capsule.npmCli).toBe(await realpath(activeNpmCli));
    expect(prepared.capsule.globalRoot).toBe(await realpath(fixture.options.globalRoot));
    expect(prepared.capsule.npmArguments).toContain(npmPrefixForGlobalRoot(prepared.capsule.globalRoot));
    expect(prepared.capsule.npmArguments.map(value => value.toLowerCase())).not.toContain(activePrefix.toLowerCase());
  });

  it("resolves Node-bundled npm for direct Windows invocation with a separate user global root", async () => {
    const fixture = await recoveryFixture("success");
    const activeGlobalRoot = resolve(fixture.root, "roaming", "npm", "node_modules");
    const nodeRoot = resolve(fixture.root, "Program Files", "nodejs");
    const npmCommand = resolve(nodeRoot, "npm.cmd");
    const bundledNpmCli = resolve(nodeRoot, "node_modules", "npm", "bin", "npm-cli.js");
    await mkdir(activeGlobalRoot, { recursive: true });
    await mkdir(dirname(bundledNpmCli), { recursive: true });
    await writeFile(npmCommand, "@echo off");
    await writeFile(bundledNpmCli, "// Node-bundled npm");
    const environment: NodeJS.ProcessEnv = { PATH: `\"${nodeRoot}\"`, PATHEXT: ".cmd" };

    const prepared = await prepareUpdateRecoveryCapsule({
      ...fixture.options,
      npmCliRoot: activeGlobalRoot,
      environment,
      platform: "win32",
    });

    expect(prepared.capsule.npmCli).toBe(await realpath(bundledNpmCli));
    expect(prepared.capsule.globalRoot).toBe(await realpath(fixture.options.globalRoot));
    expect(prepared.capsule.npmArguments).toContain(npmPrefixForGlobalRoot(prepared.capsule.globalRoot, "win32"));
  });

  it("revalidates a preflight npm entry while committing recovery authority", async () => {
    const fixture = await recoveryFixture("success");
    const preflightNpmCli = resolve(fixture.root, "preflight-node", "node_modules", "npm", "bin", "npm-cli.js");
    await mkdir(dirname(preflightNpmCli), { recursive: true });
    await writeFile(preflightNpmCli, "// preflight npm");

    const prepared = await prepareUpdateRecoveryCapsule({ ...fixture.options, npmCli: preflightNpmCli });
    expect(prepared.capsule.npmCli).toBe(await realpath(preflightNpmCli));

    await rm(resolve(fixture.options.dataDir, "update-recovery"), { recursive: true, force: true });
    await rm(preflightNpmCli);
    await mkdir(preflightNpmCli);
    await expect(prepareUpdateRecoveryCapsule({ ...fixture.options, npmCli: preflightNpmCli }))
      .rejects.toThrow(/preflight npm JavaScript entry is no longer a regular file/u);
  });

  it("fails closed when bounded npm entry candidates are absent or non-regular", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-npm-resolution-"));
    roots.push(root);
    const activeGlobalRoot = resolve(root, "roaming", "npm", "node_modules");
    const nodeRoot = resolve(root, "nodejs");
    const bundledNpmCli = resolve(nodeRoot, "node_modules", "npm", "bin", "npm-cli.js");
    await mkdir(activeGlobalRoot, { recursive: true });
    await mkdir(bundledNpmCli, { recursive: true });
    await writeFile(resolve(nodeRoot, "npm.cmd"), "@echo off");

    await expect(resolveNpmCli(
      activeGlobalRoot,
      { Path: nodeRoot, PATHEXT: "not-an-extension" },
      "win32",
      resolve(nodeRoot, "node.exe"),
    )).rejects.toThrow(/could not resolve npm's JavaScript entry/);
  });

  it("rejects capsule path and payload tampering", async () => {
    const fixture = await recoveryFixture("success");
    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
    const document = JSON.parse(await readFile(prepared.manifestPath, "utf8")) as Record<string, unknown>;
    const mutations: Record<string, unknown>[] = [
      { transactionId: "22222222-2222-4222-8222-222222222222" },
      { packageName: "@example/other" },
      { targetVersion: "9.9.9" },
      { packageRoot: resolve(fixture.root, "outside", "package") },
      { launchers: [resolve(fixture.root, "outside", "a1")] },
      { priorReleaseId: "other-release" },
      { recoveryEntry: resolve(fixture.root, "outside", "recovery.js") },
      { nodeExecutable: resolve(fixture.root, "other-node") },
      { npmArguments: ["install", "other-package"] },
      { resultPath: resolve(fixture.root, "outside", "result.json") },
    ];
    for (const mutation of mutations) {
      await writeFile(prepared.manifestPath, JSON.stringify({ ...document, ...mutation }));
      await expect(readUpdateRecoveryCapsule(prepared.manifestPath)).rejects.toThrow();
    }

    await writeFile(prepared.manifestPath, JSON.stringify({
      ...document,
      npmArguments: ["install", "--global", "--loglevel=error", "--no-fund", "--no-audit", "@timurproko/a1@1.1.0"],
    }));
    await expect(readUpdateRecoveryCapsule(prepared.manifestPath)).resolves.toMatchObject({ transactionId: fixture.options.transaction.transactionId });

    await writeFile(prepared.manifestPath, JSON.stringify(document));
    await chmod(prepared.capsule.recoveryEntry, 0o600);
    await writeFile(prepared.capsule.recoveryEntry, "tampered");
    await expect(readUpdateRecoveryCapsule(prepared.manifestPath)).rejects.toThrow(/digest/);
  });

  it("does not strand a start lease when the recovery guardian cannot spawn", async () => {
    const fixture = await recoveryFixture("success");
    await expect(runProtectedPackageReplacement({
      ...fixture.options,
      workerSpawner: async () => { throw new Error("injected guardian spawn failure"); },
    })).rejects.toThrow(/guardian spawn failure/);
    await expect(runProtectedPackageReplacement(fixture.options)).resolves.toMatchObject({ outcome: "installed" });
  }, 15_000);

  it("does not start npm when prepared journal authority cannot be persisted", async () => {
    const fixture = await recoveryFixture("success");
    let spawned = false;
    await expect(runProtectedPackageReplacement({ ...fixture.options,
      onRecoveryState: async () => { throw new Error("journal locked before start"); },
      workerSpawner: async () => { spawned = true; },
    })).rejects.toThrow(/before start/u);
    expect(spawned).toBe(false);
    for (const path of fixture.launchers) expect(await readFile(path, "utf8")).toBe("old launcher");
  });

  it("waits for detached npm settlement despite running and final journal callback failures", async () => {
    const fixture = await recoveryFixture("slow-success");
    const warnings: string[] = [];
    const states: string[] = [];
    const result = await runProtectedPackageReplacement({ ...fixture.options,
      output: { stderr: message => { warnings.push(message); } },
      onRecoveryState: async state => {
        states.push(state.status);
        if (state.status !== "prepared") throw new Error("persistent journal sharing violation");
      },
    });
    expect(states).toContain("running");
    expect(states.at(-1)).toBe("package-installed");
    expect(result).toMatchObject({ outcome: "installed", launcherDisposition: "target" });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("waiting for launcher settlement");
    for (const launcher of fixture.launchers) expect(await readFile(launcher, "utf8")).toContain("node_modules/@timurproko/a1/bin/cli.js");
    const capsule = await readUpdateRecoveryCapsule(result.recovery.capsulePath);
    expect(JSON.parse(await readFile(capsule.resultPath, "utf8"))).toMatchObject({ outcome: "installed" });
  }, 15_000);

  it.runIf(process.platform === "win32")("keeps the worker alive when a native Windows lock rejects heartbeat replacement", async () => {
    const fixture = await recoveryFixture("heartbeat-wait");
    const result = await runProtectedPackageReplacement({ ...fixture.options, timeoutMs: 20_000,
      workerSpawner: async (entry, manifestPath, environment) => {
        const child = spawn(process.execPath, [entry, "--worker", manifestPath], { detached: true, stdio: "ignore", windowsHide: true, env: environment });
        await new Promise<void>((done, reject) => { child.once("spawn", done); child.once("error", reject); });
        child.unref();
        const capsule = await readUpdateRecoveryCapsule(manifestPath);
        await waitForPath(capsule.ownerPath, 5_000);
        const script = `$ErrorActionPreference='Stop'; $file=[System.IO.File]::Open('${capsule.ownerPath.replaceAll("'", "''")}', [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite); try { [Console]::WriteLine('locked'); Start-Sleep -Milliseconds 3500 } finally { $file.Close() }`;
        const locker = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
        let diagnostics = "";
        locker.stderr.on("data", chunk => { diagnostics += String(chunk); });
        const closed = new Promise<number | null>((done, reject) => { locker.once("close", done); locker.once("error", reject); });
        try {
          await new Promise<void>((done, reject) => {
            locker.stdout.once("data", () => done());
            locker.once("error", reject);
            void closed.then(code => { if (code !== 0) reject(new Error(`native lock failed: ${diagnostics}`)); });
          });
          expect(await closed, diagnostics).toBe(0);
          expect(child.exitCode, "heartbeat I/O must not terminate the recovery owner").toBeNull();
          await expect(readFile(capsule.resultPath)).rejects.toMatchObject({ code: "ENOENT" });
        } finally {
          if (locker.exitCode === null) locker.kill();
          await closed;
          await writeFile(resolve(fixture.root, "heartbeat-released.marker"), "released");
        }
      },
    });
    expect(result).toMatchObject({ outcome: "installed", npmExitCode: 0, launcherDisposition: "target" });
    expect(result.stderr).toContain("owner heartbeat failed:");
  }, 30_000);

  it("settles an abandoned journal after installer activation instead of restarting its old capsule", async () => {
    const fixture = await installedRecoveryFixture();
    const stdout: string[] = [], stderr: string[] = [];
    expect(await installedRecoveryIsSettled((await fixture.store.read())!, "1.1.0", fixture.options.packageRoot)).toBe(true);
    const runner = async () => ({ code: 0, stdout: `${fixture.options.globalRoot}\n` });
    const result = await runSelfUpdate({
      packageRoot: fixture.options.packageRoot, resolvedTarget: "1.1.0", transactionStore: fixture.store,
      environment: { ...fixture.options.environment, A1_DATA_DIR: fixture.options.dataDir, A1_CONFIG_DIR: resolve(fixture.root, "config"), A1_RUNTIME_DIR: resolve(fixture.root, "runtime") },
      runner, output: { stdout: text => { stdout.push(text); }, stderr: text => { stderr.push(text); } },
      installer: fakeUpdateInstaller(() => runner, { preflight: async () => fixture.capsule.npmCli, replacePackage: async () => { throw new Error("must not restart npm"); }, maintenance: async () => {} }),
      lifecycle: { targetIsActive: async () => true, verifyPackageUnlocked: async () => { throw new Error("must not replace package"); }, activateInstalled: async () => { throw new Error("already activated"); } },
    });
    expect(result, stderr.join("")).toBe(0);
    expect(stdout.join("")).toContain("is up to date");
    expect(await fixture.store.read()).toBeNull();
  });

  it.each(["live-journal-owner", "live-capsule-owner", "wrong-target", "wrong-package", "missing-launcher", "malformed-owner"])("does not settle externally installed recovery with %s", async fault => {
    const fixture = await installedRecoveryFixture();
    let transaction = (await fixture.store.read())!;
    if (fault === "live-journal-owner") transaction = { ...transaction, recovery: { ...transaction.recovery!, guardianPid: process.pid } };
    if (fault === "live-capsule-owner") await writeFile(fixture.capsule.ownerPath, JSON.stringify({ transactionId: transaction.transactionId, pid: process.pid }));
    if (fault === "malformed-owner") await writeFile(fixture.capsule.ownerPath, "not-json");
    if (fault === "wrong-target") transaction = { ...transaction, targetVersion: "9.9.9" };
    if (fault === "wrong-package") transaction = { ...transaction, packageRoot: resolve(fixture.root, "other-package") };
    if (fault === "missing-launcher") await rm(fixture.launchers[0]!);
    await expect(installedRecoveryIsSettled(transaction, "1.1.0", fixture.options.packageRoot)).resolves.toBe(false);
    expect((await fixture.store.read())!.status).toBe("active");
  });

  it("bounds a guardian that never publishes ownership or a result", async () => {
    const fixture = await recoveryFixture("success");
    await expect(runProtectedPackageReplacement({
      ...fixture.options,
      timeoutMs: 100,
      workerSpawner: async () => {},
    })).rejects.toThrow(/timed out/);
  });

  it.each([false, true])("retains npm target launchers after successful replacement (aliased entry: %s)", async aliased => {
    const fixture = await recoveryFixture("success", 0, aliased);
    const result = await runProtectedPackageReplacement(fixture.options);

    expect(result, JSON.stringify(result)).toMatchObject({ outcome: "installed", npmExitCode: 0, cancelled: false, launcherDisposition: "target" });
    for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("node_modules/@timurproko/a1/bin/cli.js");
  }, 15_000);

  it.runIf(process.platform !== "win32")("keeps npm's Unix symlink launcher when it resolves to the installed entry", async () => {
    const fixture = await recoveryFixture("link-success");
    const result = await runProtectedPackageReplacement(fixture.options);

    expect(result, JSON.stringify(result)).toMatchObject({ outcome: "installed", npmExitCode: 0, cancelled: false, launcherDisposition: "target" });
    for (const launcher of fixture.launchers) expect((await lstat(launcher)).isSymbolicLink()).toBe(true);
  }, 15_000);

  it.runIf(process.platform !== "win32")("replaces a Unix symlink launcher that resolves outside the installed entry", async () => {
    const fixture = await recoveryFixture("link-foreign");
    const result = await runProtectedPackageReplacement(fixture.options);

    expect(result, JSON.stringify(result)).toMatchObject({ outcome: "recovery-launcher", launcherDisposition: "recovery" });
    for (const launcher of fixture.launchers) expect((await lstat(launcher)).isSymbolicLink()).toBe(false);
  }, 15_000);

  it("restores prior-release launchers after successful npm is followed by activation failure", async () => {
    const fixture = await recoveryFixture("success");
    const result = await runProtectedPackageReplacement(fixture.options);
    expect(result.outcome).toBe("installed");
    await writeFile(resolve(fixture.options.packageRoot, "bin", "cli.js"), "process.exitCode = 42;");
    await restoreUpdateRecoveryLaunchers(result.recovery.capsulePath, fixture.options.environment);
    const capsule = await readUpdateRecoveryCapsule(result.recovery.capsulePath);
    for (const launcher of fixture.launchers) expect(await readFile(launcher, "utf8")).toContain("recovery.js");
    const child = spawn(process.execPath, [capsule.recoveryEntry, "--launch", result.recovery.capsulePath, "--", "--version"], { stdio: "ignore", windowsHide: true });
    await expect(new Promise<number | null>((resolvePromise, rejectPromise) => { child.once("error", rejectPromise); child.once("close", resolvePromise); })).resolves.toBe(0);
    expect(JSON.parse(await readFile(capsule.resultPath, "utf8"))).toMatchObject({ outcome: "recovery-launcher", launcherDisposition: "recovery" });
  }, 15_000);

  it("restores every launcher after npm failure and preserves its diagnostics", async () => {
    const fixture = await recoveryFixture("fail");
    const result = await runProtectedPackageReplacement(fixture.options);

    expect(result).toMatchObject({ outcome: "recovery-launcher", npmExitCode: 7, cancelled: false, launcherDisposition: "recovery" });
    expect(result.stderr).toContain("injected npm failure");
    for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("recovery.js");
  }, 15_000);

  it("does not launch a partial target when npm failed after writing its entry", async () => {
    const fixture = await recoveryFixture("fail-partial");
    const result = await runProtectedPackageReplacement(fixture.options);
    expect(result).toMatchObject({ outcome: "recovery-launcher", npmExitCode: 7, launcherDisposition: "recovery" });
    const capsule = await readUpdateRecoveryCapsule(result.recovery.capsulePath);
    const child = spawn(process.execPath, [capsule.recoveryEntry, "--launch", result.recovery.capsulePath, "--", "--version"], { stdio: "ignore", windowsHide: true });
    await expect(new Promise<number | null>((resolvePromise, rejectPromise) => { child.once("error", rejectPromise); child.once("close", resolvePromise); })).resolves.toBe(0);
  }, 15_000);

  it("restores the complete platform launcher set after cancellation at each launcher mutation", async () => {
    const count = process.platform === "win32" ? 3 : 1;
    for (let index = 0; index < count; index += 1) {
      const fixture = await recoveryFixture("staged-wait", index);
      const result = await runProtectedPackageReplacement({
        ...fixture.options,
        workerSpawner: async (entry, manifestPath, environment) => {
          const child = spawn(process.execPath, [entry, "--worker", manifestPath], { detached: true, stdio: "ignore", windowsHide: true, env: environment });
          await new Promise<void>((resolvePromise, rejectPromise) => { child.once("spawn", resolvePromise); child.once("error", rejectPromise); });
          child.unref();
          await waitForPath(resolve(fixture.root, "removed.marker"), 5_000);
          const capsule = await readUpdateRecoveryCapsule(manifestPath);
          await writeFile(capsule.cancellationPath, JSON.stringify({ schema: "a1-update-recovery-v1", transactionId: capsule.transactionId, signal: "SIGINT" }));
        },
      });
      expect(result).toMatchObject({ cancelled: true, launcherDisposition: "recovery" });
      for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("recovery.js");
    }
  }, 30_000);

  it.each([false, true])("restores every launcher before acknowledging cancellation (aliased entry: %s)", async aliased => {
    const fixture = await recoveryFixture("wait", 0, aliased);
    const result = await runProtectedPackageReplacement({
      ...fixture.options,
      workerSpawner: async (entry, manifestPath, environment) => {
        const child = spawn(process.execPath, [entry, "--worker", manifestPath], { detached: true, stdio: "ignore", windowsHide: true, env: environment });
        await new Promise<void>((resolvePromise, rejectPromise) => { child.once("spawn", resolvePromise); child.once("error", rejectPromise); });
        child.unref();
        setTimeout(async () => {
          const capsule = await readUpdateRecoveryCapsule(manifestPath);
          await writeFile(capsule.cancellationPath, JSON.stringify({ schema: "a1-update-recovery-v1", transactionId: capsule.transactionId, signal: "SIGINT" }));
        }, 150).unref();
      },
    });

    expect(result).toMatchObject({ outcome: "recovery-launcher", cancelled: true, launcherDisposition: "recovery" });
    for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("recovery.js");
    const recovered = spawn(process.execPath, [resolve(dirname(result.recovery.capsulePath), "recovery.js"), "--launch", result.recovery.capsulePath, "--", "--version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await expect(new Promise<number | null>((resolvePromise, rejectPromise) => {
      recovered.once("error", rejectPromise);
      recovered.once("close", resolvePromise);
    })).resolves.toBe(0);

    const recoveryCapsule = await readUpdateRecoveryCapsule(result.recovery.capsulePath);
    await writeFile(recoveryCapsule.npmCli, fakeNpmSource("success", fixture.options.packageRoot, fixture.launchers));
    const resumed = spawn(process.execPath, [resolve(dirname(result.recovery.capsulePath), "recovery.js"), "--launch", result.recovery.capsulePath, "--", "update", "--develop"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await expect(new Promise<number | null>((resolvePromise, rejectPromise) => {
      resumed.once("error", rejectPromise);
      resumed.once("close", resolvePromise);
    })).resolves.toBe(0);
    for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("node_modules/@timurproko/a1/bin/cli.js");

    await cleanupUpdateRecoveryCapsules(fixture.options.dataDir);
    await expect(readFile(result.recovery.capsulePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  }, 15_000);

  it("replaces a stale owner record even when its PID has been reused", async () => {
    const fixture = await recoveryFixture("success");
    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
    await writeFile(prepared.capsule.ownerPath, JSON.stringify({
      transactionId: prepared.capsule.transactionId,
      pid: process.pid,
      startIdentity: "stale-start",
    }));
    const stale = new Date(Date.now() - 10_000);
    await utimes(prepared.capsule.ownerPath, stale, stale);

    await expect(runProtectedPackageReplacement(fixture.options)).resolves.toMatchObject({ outcome: "installed" });
    const owner = JSON.parse(await readFile(prepared.capsule.ownerPath, "utf8")) as { startIdentity: string };
    expect(owner.startIdentity).not.toBe("stale-start");
  }, 15_000);

  it("coordinates repeated Ctrl+C requests without abandoning launcher recovery", async () => {
    const fixture = await recoveryFixture("wait");
    const moduleUrl = pathToFileURL(resolve("src/foundation/release/update-recovery.ts")).href;
    const serializable = {
      dataDir: fixture.options.dataDir,
      globalRoot: fixture.options.globalRoot,
      packageRoot: fixture.options.packageRoot,
      transaction: fixture.options.transaction,
      priorRelease: fixture.options.priorRelease,
      environment: fixture.options.environment,
      timeoutMs: 30_000,
      ownerPath: resolve(fixture.options.dataDir, "update-recovery", fixture.options.transaction.transactionId, "owner.json"),
    };
    const script = `
      const { access } = await import("node:fs/promises");
      const { runProtectedPackageReplacement } = await import(${JSON.stringify(moduleUrl)});
      const input = ${JSON.stringify(serializable)};
      const messages = [];
      void (async () => {
        while (true) {
          try { await access(input.ownerPath); break; } catch { await new Promise(resolvePromise => setTimeout(resolvePromise, 25)); }
        }
        process.emit("SIGINT", "SIGINT");
        process.emit("SIGINT", "SIGINT");
      })();
      const result = await runProtectedPackageReplacement({ ...input, output: { stderr(message) { messages.push(message); } } });
      process.stdout.write(JSON.stringify({ result, messages }));
    `;
    const updater = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { cwd: resolve("."), stdio: ["ignore", "pipe", "inherit"], windowsHide: true });
    const chunks: Buffer[] = [];
    updater.stdout!.on("data", chunk => chunks.push(Buffer.from(chunk)));
    const code = await new Promise<number | null>((resolvePromise, rejectPromise) => { updater.once("error", rejectPromise); updater.once("close", resolvePromise); });
    const observed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { result: { cancelled: boolean; launcherDisposition: string }; messages: string[] };

    expect(code).toBe(0);
    expect(observed.result).toMatchObject({ cancelled: true, launcherDisposition: "recovery" });
    expect(observed.messages).toHaveLength(1);
  }, 40_000);

  it.each([false, true])("keeps the detached guardian alive after the invoking updater is terminated (aliased entry: %s)", async aliased => {
    const fixture = await recoveryFixture("slow-success", 0, aliased);
    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
    const moduleUrl = pathToFileURL(resolve("src/foundation/release/update-recovery.ts")).href;
    const serializable = {
      dataDir: fixture.options.dataDir,
      globalRoot: fixture.options.globalRoot,
      packageRoot: fixture.options.packageRoot,
      transaction: fixture.options.transaction,
      priorRelease: fixture.options.priorRelease,
      environment: fixture.options.environment,
      timeoutMs: 10_000,
    };
    const script = `
      const { runProtectedPackageReplacement } = await import(${JSON.stringify(moduleUrl)});
      await runProtectedPackageReplacement({ ...${JSON.stringify(serializable)}, output: { stderr() {} } });
    `;
    const updater = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { cwd: resolve("."), stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let stderr = "";
    updater.stderr!.on("data", chunk => { stderr += chunk.toString(); });
    const closed = new Promise(resolvePromise => updater.once("close", resolvePromise));
    try {
      await waitForPath(prepared.capsule.ownerPath, 5_000);
      updater.kill("SIGKILL");
      await closed;
      await waitForPath(prepared.capsule.resultPath, 10_000);
    } catch (error) {
      throw new Error(`${String(error)}\nUpdater diagnostics: ${stderr || "none"}`, { cause: error });
    } finally {
      if (updater.exitCode === null && updater.signalCode === null) updater.kill("SIGKILL");
      await closed;
    }

    const result = JSON.parse(await readFile(prepared.capsule.resultPath, "utf8")) as { launcherDisposition: string };
    expect(result.launcherDisposition).toBe("target");
    for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("node_modules/@timurproko/a1/bin/cli.js");
  }, 20_000);

  it("serializes concurrent replacement coordinators onto one guardian", async () => {
    const fixture = await recoveryFixture("success");
    let spawned = 0;
    const workerSpawner = async (entry: string, manifestPath: string, environment: NodeJS.ProcessEnv) => {
      spawned += 1;
      const child = spawn(process.execPath, [entry, "--worker", manifestPath], { detached: true, stdio: "ignore", windowsHide: true, env: environment });
      await new Promise<void>((resolvePromise, rejectPromise) => { child.once("spawn", resolvePromise); child.once("error", rejectPromise); });
      child.unref();
    };
    const [left, right] = await Promise.all([
      runProtectedPackageReplacement({ ...fixture.options, workerSpawner }),
      runProtectedPackageReplacement({ ...fixture.options, workerSpawner }),
    ]);

    expect(spawned).toBe(1);
    expect(left.outcome).toBe("installed");
    expect(right.outcome).toBe("installed");
  }, 15_000);
});

async function recoveryFixture(mode: RecoveryNpmMode, cancelAfter = 0, aliased = false) {
  const temporary = await mkdtemp(resolve(tmpdir(), "a1-update-recovery-"));
  roots.push(temporary);
  let root = temporary;
  if (aliased) {
    const canonical = resolve(await realpath(temporary), "canonical");
    root = resolve(temporary, "alias");
    await mkdir(canonical);
    await symlink(canonical, root, process.platform === "win32" ? "junction" : "dir");
  }
  const dataDir = resolve(root, "data");
  const globalRoot = process.platform === "win32" ? resolve(root, "npm", "node_modules") : resolve(root, "prefix", "lib", "node_modules");
  const packageRoot = resolve(globalRoot, "@timurproko", "a1");
  const npmCli = resolve(globalRoot, "npm", "bin", "npm-cli.js");
  const priorReleaseRoot = resolve(dataDir, "releases", "1.0.0-aaaaaaaaaaaaaaaaaaaa");
  const launchers = updateLauncherPaths(globalRoot);
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await mkdir(dirname(npmCli), { recursive: true });
  await mkdir(resolve(priorReleaseRoot, "bin"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", privateLaunchContract: "neutral-launch-v1", version: "1.0.0" }));
  await writeFile(resolve(packageRoot, "bin", "cli.js"), "// old");
  await writeFile(resolve(priorReleaseRoot, "bin", "cli.js"), "// prior");
  await writeFile(resolve(priorReleaseRoot, ".a1-release.json"), JSON.stringify({
    launchContract: "neutral-launch-v1",
    releaseId: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
    contentDigest: "a".repeat(64),
  }));
  for (const launcher of launchers) { await mkdir(dirname(launcher), { recursive: true }); await writeFile(launcher, "old launcher"); }
  await writeFile(npmCli, fakeNpmSource(mode, packageRoot, launchers));
  await chmod(npmCli, 0o755);
  const transaction: UpdateTransaction = {
    schema: "a1-update-journal-v1",
    transactionId: "11111111-1111-4111-8111-111111111111",
    channel: "next",
    targetVersion: "1.1.0",
    packageRoot,
    priorActiveReleaseId: "1.0.0-aaaaaaaaaaaaaaaaaaaa",
    phase: "ownership-released",
    status: "active",
    error: null,
    startedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
  return {
    root,
    launchers,
    options: {
      dataDir,
      globalRoot,
      packageRoot,
      transaction,
      priorRelease: { releaseId: transaction.priorActiveReleaseId!, releaseRoot: priorReleaseRoot, contentDigest: "a".repeat(64) },
      output: { stderr: () => {} },
      environment: {
        ...process.env,
        npm_execpath: npmCli,
        RECOVERY_TEST_CANCEL_AFTER: String(cancelAfter),
        RECOVERY_TEST_REMOVAL_MARKER: resolve(root, "removed.marker"),
      },
      timeoutMs: 10_000,
    },
  };
}

async function installedRecoveryFixture() {
  const fixture = await recoveryFixture("success");
  const store = new UpdateTransactionStore(fixture.options.dataDir);
  await store.begin({ channel: "stable", targetVersion: "1.1.0", packageRoot: fixture.options.packageRoot, priorActiveReleaseId: fixture.options.transaction.priorActiveReleaseId });
  const transaction = await store.advance("ownership-released");
  const prepared = await prepareUpdateRecoveryCapsule({ ...fixture.options, transaction });
  await store.setRecovery({ capsulePath: prepared.manifestPath, status: "running", guardianPid: 2147483647, guardianStartIdentity: "dead-owner", cancellationRequested: false, launcherDisposition: "pending" });
  await writeFile(prepared.capsule.ownerPath, JSON.stringify({ transactionId: transaction.transactionId, pid: 2147483647 }));
  await writeFile(resolve(fixture.options.packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "1.1.0" }));
  for (const launcher of fixture.launchers) { await writeFile(launcher, "node_modules/@timurproko/a1/bin/cli.js"); await chmod(launcher, 0o755); }
  return { ...fixture, store, capsule: prepared.capsule };
}

type RecoveryNpmMode = "success" | "slow-success" | "heartbeat-wait" | "wait" | "staged-wait" | "fail" | "fail-partial" | "link-success" | "link-foreign";

function fakeNpmSource(mode: RecoveryNpmMode, packageRoot: string, launchers: readonly string[]): string {
  if (mode === "link-success" || mode === "link-foreign") {
    return `
    const { mkdir, rm, symlink, writeFile } = require("node:fs/promises");
    const { dirname, resolve } = require("node:path");
    const packageRoot = ${JSON.stringify(packageRoot)};
    const launchers = ${JSON.stringify(launchers)};
    (async () => {
      await mkdir(resolve(packageRoot, "bin"), { recursive: true });
      await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", privateLaunchContract: "neutral-launch-v1", version: "1.1.0" }));
      await writeFile(resolve(packageRoot, "bin", "cli.js"), "// target");
      await writeFile(resolve(packageRoot, "bin", "other.js"), "// foreign");
      for (const launcher of launchers) {
        await rm(launcher, { force: true });
        await mkdir(dirname(launcher), { recursive: true });
        await symlink(resolve(packageRoot, "bin", ${JSON.stringify(mode === "link-success" ? "cli.js" : "other.js")}), launcher);
      }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  }
  return `
    const { mkdir, rm, writeFile } = require("node:fs/promises");
    const { dirname, resolve } = require("node:path");
    const packageRoot = ${JSON.stringify(packageRoot)};
    const launchers = ${JSON.stringify(launchers)};
    (async () => {
      for (let index = 0; index < launchers.length; index += 1) {
        await rm(launchers[index], { force: true });
        if (${JSON.stringify(mode)} === "staged-wait" && index === Number(process.env.RECOVERY_TEST_CANCEL_AFTER)) {
          await writeFile(process.env.RECOVERY_TEST_REMOVAL_MARKER, String(index));
          await new Promise(resolvePromise => setTimeout(resolvePromise, 10000));
        }
      }
      ${mode === "wait" ? "await new Promise(resolvePromise => setTimeout(resolvePromise, 10000));" : mode === "fail" ? "console.error('injected npm failure'); process.exitCode = 7;" : mode === "staged-wait" ? "" : `
      ${mode === "slow-success" ? "await new Promise(resolvePromise => setTimeout(resolvePromise, 1000));" : mode === "heartbeat-wait" ? `
      const marker = resolve(process.env.RECOVERY_TEST_REMOVAL_MARKER, "..", "heartbeat-released.marker");
      const deadline = Date.now() + 15000;
      while (!await require("node:fs/promises").stat(marker).catch(() => null)) {
        if (Date.now() >= deadline) throw new Error("native heartbeat lock was not released");
        await new Promise(done => setTimeout(done, 25));
      }
      ` : ""}
      await mkdir(resolve(packageRoot, "bin"), { recursive: true });
      await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", privateLaunchContract: "neutral-launch-v1", version: "1.1.0" }));
      await writeFile(resolve(packageRoot, "bin", "cli.js"), ${JSON.stringify(mode === "fail-partial" ? "process.exitCode = 42;" : "// target")});
      for (const launcher of launchers) {
        await mkdir(dirname(launcher), { recursive: true });
        await writeFile(launcher, "node_modules/@timurproko/a1/bin/cli.js");
        await require("node:fs/promises").chmod(launcher, 0o755);
      }
      ${mode === "fail-partial" ? "console.error('npm failed after partial target write'); process.exitCode = 7;" : ""}
      `}
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
}

async function waitForPath(path: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await readFile(path).then(() => true).catch(() => false)) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  throw new Error(`timed out waiting for ${path}`);
}
