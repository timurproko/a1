import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PredecessorFixture } from "../../support/predecessor-fixture.js";
import { loadValidationCandidate } from "./package-candidate-fixture.js";

/**
 * The published predecessors drive this gate. An update is performed by the code that is
 * already installed, so a private handoff can only be proven compatible by running the
 * previous release's own copy of it against the candidate payload. Fixtures built from
 * the candidate cannot show this: both sides would speak whatever the candidate speaks.
 */
const PREDECESSOR_COUNT = Number.parseInt(process.env.UPDATE_PREDECESSOR_COUNT ?? "3", 10);
const fixture = new PredecessorFixture();
let candidateRoot = "";
let predecessors: string[] = [];

beforeAll(async () => fixture.phase(900_000, async () => {
  const candidate = await loadValidationCandidate();
  candidateRoot = await fixture.install(candidate.path);
  predecessors = await fixture.publishedVersions(candidate.manifest.version);
  expect(predecessors.length, "no published release is available to update from").toBeGreaterThan(0);
}), 900_000);

afterAll(async () => fixture.close(), 120_000);

describe("update from every recent published release", () => {
  it("materializes and warms the candidate with each predecessor's own release code", async ({ signal }) => fixture.phase(1_800_000, async phaseSignal => {
    let exercised = 0;
    for (const version of predecessors) {
      phaseSignal.throwIfAborted();
      if (exercised >= PREDECESSOR_COUNT) break;
      const priorRoot = await fixture.install(`@timurproko/a1@${version}`, version);
      const entry = resolve(priorRoot, "dist", "foundation", "release", "index.js");
      // Rationale: releases older than the immutable release store cannot drive this
      // handoff at all; they are skipped by absence of the entry, never by version
      // guesswork, and the run still has to exercise a real predecessor.
      if (!existsSync(entry)) { await fixture.discard(priorRoot); continue; }
      exercised += 1;
      const release = await import(pathToFileURL(entry).href) as {
        materializeRelease: (packageRoot: string, dataDir: string) => Promise<{ releaseId: string }>;
        warmMaterializedRelease: (release: unknown, environment: NodeJS.ProcessEnv, timeoutMs?: number) => Promise<void>;
      };
      const sandbox = await fixture.temporaryRoot("a1-predecessor-");
      const environment = {
        ...process.env,
        A1_DATA_DIR: resolve(sandbox, "data"),
        A1_RUNTIME_DIR: resolve(sandbox, "runtime"),
        A1_CONFIG_DIR: resolve(sandbox, "config"),
        A1_DATABASE_PATH: resolve(sandbox, "control.sqlite3"),
      };
      // Protocol: the predecessor copies the candidate payload and then imports the candidate's own
      // startup graph in a child process, exactly as `a1 update` does.
      const materialized = await fixture.measure("materialize", version, () => release.materializeRelease(candidateRoot, environment.A1_DATA_DIR));
      phaseSignal.throwIfAborted();
      await expect(
        fixture.measure("warm", version, () => release.warmMaterializedRelease(materialized, environment, 120_000)),
        `published ${version} cannot activate the candidate`,
      ).resolves.toBeUndefined();
      // Performance: each predecessor leaves a global installation and a materialized release store behind,
      // and the warmed child has closed by now, so both are released under this phase's own budget.
      // Holding all of them until the teardown hook instead made removal outgrow that hook's limit.
      await fixture.discard(sandbox);
      await fixture.discard(priorRoot);
    }
    expect(exercised, "no published release carried a usable release store to update from").toBeGreaterThan(0);
  }, signal), 1_800_000);

  it.runIf(process.platform === "win32")("replaces and activates the candidate through direct and bridged published updaters", async ({ signal }) => fixture.phase(1_800_000, async phaseSignal => {
    const directVersion = predecessors[0]!;
    const directRoot = await fixture.install(`@timurproko/a1@${directVersion}`, directVersion);
    await exerciseProtectedReplacement(directRoot, directVersion, candidateRoot, "direct");
    phaseSignal.throwIfAborted();
    await fixture.discard(directRoot);

    const bridgeVersion = "0.2.2";
    const bridgeRoot = await fixture.install(`@timurproko/a1@${bridgeVersion}`, bridgeVersion);
    await exerciseProtectedReplacement(bridgeRoot, bridgeVersion, candidateRoot, "installer-bridge");
    phaseSignal.throwIfAborted();
    await fixture.discard(bridgeRoot);
  }, signal), 1_800_000);
});

async function exerciseProtectedReplacement(
  predecessorRoot: string,
  predecessorVersion: string,
  exactCandidateRoot: string,
  mode: "direct" | "installer-bridge",
): Promise<void> {
  const entry = resolve(predecessorRoot, "dist", "foundation", "release", "index.js");
  expect(existsSync(entry), `published ${predecessorVersion} has no protected update boundary`).toBe(true);
  const release = await import(pathToFileURL(entry).href) as {
    updateLauncherPaths(globalRoot: string, platform?: NodeJS.Platform): readonly string[];
    runProtectedPackageReplacement(options: Record<string, unknown>): Promise<{
      outcome: string; npmExitCode: number | null; launcherDisposition: string;
    }>;
    materializeRelease(packageRoot: string, dataDir: string): Promise<{ releaseId: string }>;
    warmMaterializedRelease(materialized: unknown, environment: NodeJS.ProcessEnv, timeoutMs?: number): Promise<void>;
  };
  const root = await fixture.temporaryRoot(`a1-predecessor-${mode}-`);
  const prefix = resolve(root, "a1-prefix");
  const globalRoot = resolve(prefix, "node_modules");
  const packageRoot = resolve(globalRoot, "@timurproko", "a1");
  const stagedPackageRoot = resolve(root, "candidate-package");
  const activePrefix = resolve(root, "node-prefix");
  const activeGlobalRoot = resolve(activePrefix, "node_modules");
  const npmCli = resolve(activeGlobalRoot, "npm", "bin", "npm-cli.js");
  const dataDir = resolve(root, "data");
  const priorReleaseId = `${predecessorVersion}-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const priorReleaseRoot = resolve(dataDir, "releases", priorReleaseId);
  const priorContentDigest = "a".repeat(64);
  const launchers = release.updateLauncherPaths(globalRoot, "win32");
  const candidateManifest = JSON.parse(await readFile(resolve(exactCandidateRoot, "package.json"), "utf8")) as { version: string };

  // npm acquires and extracts a payload before replacing the global package. Keep that
  // filesystem-heavy preparation outside the immutable predecessor's recovery deadline;
  // the fake npm process still owns the destructive package and launcher mutations.
  await cp(exactCandidateRoot, stagedPackageRoot, { recursive: true });
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await mkdir(resolve(priorReleaseRoot, "bin"), { recursive: true });
  await mkdir(dirname(npmCli), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: predecessorVersion }));
  await writeFile(resolve(packageRoot, "bin", "cli.js"), "// predecessor package\n");
  await writeFile(resolve(priorReleaseRoot, "bin", "cli.js"), "// retained predecessor\n");
  await writeFile(resolve(priorReleaseRoot, ".a1-release.json"), JSON.stringify({
    launchContract: "neutral-launch-v1",
    releaseId: priorReleaseId,
    contentDigest: priorContentDigest,
  }));
  for (const launcher of launchers) {
    await mkdir(dirname(launcher), { recursive: true });
    await writeFile(launcher, "node_modules/@timurproko/a1/bin/cli.js");
  }
  await writeFile(resolve(activePrefix, "npm.cmd"), "@echo off\r\n");
  await writeFile(npmCli, `
    const { chmod, mkdir, rename, rm, writeFile } = require("node:fs/promises");
    const { dirname } = require("node:path");
    const stagedPackageRoot = ${JSON.stringify(stagedPackageRoot)};
    const packageRoot = ${JSON.stringify(packageRoot)};
    const launchers = ${JSON.stringify(launchers)};
    (async () => {
      await rm(packageRoot, { recursive: true, force: true });
      await rename(stagedPackageRoot, packageRoot);
      for (const launcher of launchers) {
        await mkdir(dirname(launcher), { recursive: true });
        await writeFile(launcher, "node_modules/@timurproko/a1/bin/cli.js");
        await chmod(launcher, 0o755);
      }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `);

  const environment: NodeJS.ProcessEnv = { ...process.env, PATH: activePrefix, PATHEXT: ".CMD" };
  for (const key of Object.keys(environment)) {
    if (key.toLowerCase() === "npm_execpath") delete environment[key];
    if (key.toLowerCase() === "path" && key !== "PATH") delete environment[key];
  }
  if (mode === "installer-bridge") environment.npm_execpath = npmCli;
  const transactionId = randomUUID();
  const result = await release.runProtectedPackageReplacement({
    dataDir,
    globalRoot,
    npmCliRoot: activeGlobalRoot,
    packageRoot,
    transaction: {
      schema: "a1-update-journal-v1",
      transactionId,
      channel: "stable",
      targetVersion: candidateManifest.version,
      packageRoot,
      priorActiveReleaseId: priorReleaseId,
      phase: "ownership-released",
      status: "active",
      error: null,
      startedAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    priorRelease: { releaseId: priorReleaseId, releaseRoot: priorReleaseRoot, contentDigest: priorContentDigest },
    output: { stderr() {} },
    environment,
    platform: "win32",
    timeoutMs: 120_000,
  });

  expect(result, `${mode} replacement through ${predecessorVersion}`).toMatchObject({
    outcome: "installed",
    npmExitCode: 0,
    launcherDisposition: "target",
  });
  expect(existsSync(stagedPackageRoot), "fake npm must consume the staged exact candidate").toBe(false);
  await expect(readFile(resolve(packageRoot, "package.json"), "utf8").then(JSON.parse)).resolves.toMatchObject({
    name: "@timurproko/a1",
    version: candidateManifest.version,
  });
  for (const launcher of launchers) await expect(readFile(launcher, "utf8")).resolves.toContain("node_modules/@timurproko/a1/bin/cli.js");

  const activationEnvironment = {
    ...process.env,
    A1_DATA_DIR: dataDir,
    A1_RUNTIME_DIR: resolve(root, "runtime"),
    A1_CONFIG_DIR: resolve(root, "config"),
    A1_DATABASE_PATH: resolve(root, "control.sqlite3"),
  };
  const materialized = await release.materializeRelease(packageRoot, dataDir);
  await release.warmMaterializedRelease(materialized, activationEnvironment, 120_000);
  const command = await runCandidateCommand(resolve(packageRoot, "bin", "cli.js"), activationEnvironment);
  expect(command.code, command.stderr).toBe(0);
  expect(command.stdout).toContain("a1 update");
  await fixture.discard(root);
}

async function runCandidateCommand(entry: string, environment: NodeJS.ProcessEnv): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(process.execPath, [entry, "help"], {
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on("data", chunk => stdout.push(Buffer.from(chunk)));
  child.stderr.on("data", chunk => stderr.push(Buffer.from(chunk)));
  const code = await new Promise<number | null>((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", resolvePromise);
  });
  return { code, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") };
}
