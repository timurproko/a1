import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupUpdateRecoveryCapsules,
  inspectUpdateLauncherSet,
  prepareUpdateRecoveryCapsule,
  readUpdateRecoveryCapsule,
  runProtectedPackageReplacement,
  updateLauncherPaths,
  type UpdateTransaction,
} from "../../../src/foundation/release/index.js";

const roots: string[] = [];
afterEach(async () => await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("cancellation-safe package replacement", () => {
  it("defines the complete platform launcher set", () => {
    const globalRoot = process.platform === "win32" ? resolve("C:/npm/node_modules") : "/usr/local/lib/node_modules";
    const launchers = updateLauncherPaths(globalRoot);
    expect(launchers.map(path => path.split(/[\\/]/).at(-1))).toEqual(process.platform === "win32" ? ["a1", "a1.cmd", "a1.ps1"] : ["a1"]);
  });

  it("rejects incomplete and mixed launcher sets", async () => {
    const fixture = await recoveryFixture("success");
    const prepared = await prepareUpdateRecoveryCapsule(fixture.options);
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

  it("bounds a guardian that never publishes ownership or a result", async () => {
    const fixture = await recoveryFixture("success");
    await expect(runProtectedPackageReplacement({
      ...fixture.options,
      timeoutMs: 100,
      workerSpawner: async () => {},
    })).rejects.toThrow(/timed out/);
  });

  it("retains npm target launchers after successful replacement", async () => {
    const fixture = await recoveryFixture("success");
    const result = await runProtectedPackageReplacement(fixture.options);

    expect(result, JSON.stringify(result)).toMatchObject({ outcome: "installed", npmExitCode: 0, cancelled: false, launcherDisposition: "target" });
    for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("node_modules/@timurproko/a1/bin/cli.js");
  }, 15_000);

  it("restores every launcher after npm failure and preserves its diagnostics", async () => {
    const fixture = await recoveryFixture("fail");
    const result = await runProtectedPackageReplacement(fixture.options);

    expect(result).toMatchObject({ outcome: "recovery-launcher", npmExitCode: 7, cancelled: false, launcherDisposition: "recovery" });
    expect(result.stderr).toContain("injected npm failure");
    for (const launcher of fixture.launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("recovery.js");
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

  it("restores every launcher before acknowledging cancellation", async () => {
    const fixture = await recoveryFixture("wait");
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

  it("keeps the detached guardian alive after the invoking updater is terminated", async () => {
    const fixture = await recoveryFixture("slow-success");
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
    const updater = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { cwd: resolve("."), stdio: "ignore", windowsHide: true });
    await waitForPath(prepared.capsule.ownerPath, 5_000);
    updater.kill("SIGKILL");
    await new Promise(resolvePromise => updater.once("close", resolvePromise));
    await waitForPath(prepared.capsule.resultPath, 10_000);

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

async function recoveryFixture(mode: "success" | "slow-success" | "wait" | "staged-wait" | "fail", cancelAfter = 0) {
  const root = await mkdtemp(resolve(tmpdir(), "a1-update-recovery-"));
  roots.push(root);
  const dataDir = resolve(root, "data");
  const globalRoot = process.platform === "win32" ? resolve(root, "npm", "node_modules") : resolve(root, "prefix", "lib", "node_modules");
  const packageRoot = resolve(globalRoot, "@timurproko", "a1");
  const npmCli = resolve(globalRoot, "npm", "bin", "npm-cli.js");
  const priorReleaseRoot = resolve(dataDir, "releases", "1.0.0-aaaaaaaaaaaaaaaaaaaa");
  const launchers = updateLauncherPaths(globalRoot);
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await mkdir(dirname(npmCli), { recursive: true });
  await mkdir(resolve(priorReleaseRoot, "bin"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "1.0.0" }));
  await writeFile(resolve(packageRoot, "bin", "cli.js"), "// old");
  await writeFile(resolve(priorReleaseRoot, "bin", "cli.js"), "// prior");
  await writeFile(resolve(priorReleaseRoot, ".a1-release.json"), JSON.stringify({
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
        A1_TEST_CANCEL_AFTER: String(cancelAfter),
        A1_TEST_REMOVAL_MARKER: resolve(root, "removed.marker"),
      },
      timeoutMs: 10_000,
    },
  };
}

function fakeNpmSource(mode: "success" | "slow-success" | "wait" | "staged-wait" | "fail", packageRoot: string, launchers: readonly string[]): string {
  return `
    const { mkdir, rm, writeFile } = require("node:fs/promises");
    const { dirname, resolve } = require("node:path");
    const packageRoot = ${JSON.stringify(packageRoot)};
    const launchers = ${JSON.stringify(launchers)};
    (async () => {
      for (let index = 0; index < launchers.length; index += 1) {
        await rm(launchers[index], { force: true });
        if (${JSON.stringify(mode)} === "staged-wait" && index === Number(process.env.A1_TEST_CANCEL_AFTER)) {
          await writeFile(process.env.A1_TEST_REMOVAL_MARKER, String(index));
          await new Promise(resolvePromise => setTimeout(resolvePromise, 10000));
        }
      }
      ${mode === "wait" ? "await new Promise(resolvePromise => setTimeout(resolvePromise, 10000));" : mode === "fail" ? "console.error('injected npm failure'); process.exitCode = 7;" : mode === "staged-wait" ? "" : `
      ${mode === "slow-success" ? "await new Promise(resolvePromise => setTimeout(resolvePromise, 1000));" : ""}
      await mkdir(resolve(packageRoot, "bin"), { recursive: true });
      await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: "1.1.0" }));
      await writeFile(resolve(packageRoot, "bin", "cli.js"), "// target");
      for (const launcher of launchers) {
        await mkdir(dirname(launcher), { recursive: true });
        await writeFile(launcher, "node_modules/@timurproko/a1/bin/cli.js");
        await require("node:fs/promises").chmod(launcher, 0o755);
      }
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
