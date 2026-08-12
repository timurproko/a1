import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, resolve } from "node:path";
import crossSpawn from "cross-spawn";
import { deriveReleaseIdentity } from "../release.js";

export interface ExactPiRuntimeIdentity {
  readonly executable: string;
  readonly sha256: string;
  readonly version: string;
  readonly arguments: readonly string[];
}

export interface PackagedCandidate {
  readonly root: string;
  readonly prefix: string;
  readonly tarball: string;
  readonly packageRoot: string;
  readonly cli: string;
  readonly packageVersion: string;
  readonly packageContentDigest: string;
  readonly pi: ExactPiRuntimeIdentity;
  readonly environment: NodeJS.ProcessEnv;
  readonly evidencePath: string;
}

export interface PreparePackagedCandidateOptions {
  readonly packageRoot: string;
  readonly piExecutable: string;
  readonly artifacts: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly root?: string;
  /** Publication certification installs this already-packed immutable artifact. */
  readonly tarball?: string;
}

const REAL_PI_ARGUMENTS = ["--offline", "--approve", "--no-session"] as const;

export async function preparePackagedCandidate(options: PreparePackagedCandidateOptions): Promise<PackagedCandidate> {
  const root = options.root ?? await mkdtemp(resolve(tmpdir(), "addone-packaged-candidate-"));
  const prefix = resolve(root, "prefix");
  const packs = resolve(root, "packs");
  await Promise.all([prefix, packs, options.artifacts].map(path => mkdir(path, { recursive: true, mode: 0o700 })));

  const tarball = options.tarball
    ? await realpath(options.tarball)
    : await packCandidate(options.packageRoot, packs, options.environment);
  await run("npm", ["install", "--prefix", prefix, "--install-strategy=nested", "--no-audit", "--no-fund", tarball], root, options.environment);

  const packageRoot = resolve(prefix, "node_modules", "@timurproko", "addone");
  const identity = await deriveReleaseIdentity(packageRoot);
  const executable = await realpath(options.piExecutable);
  const piBytes = await readFile(executable);
  const versionResult = await run(executable, ["--version"], root, options.environment);
  const pi: ExactPiRuntimeIdentity = {
    executable,
    sha256: createHash("sha256").update(piBytes).digest("hex"),
    version: versionResult.stdout.trim(),
    arguments: REAL_PI_ARGUMENTS,
  };
  if (!pi.version) throw new Error("selected Pi runtime did not report a version");

  const environment: NodeJS.ProcessEnv = {
    ...(options.environment ?? process.env),
    ADDONE_NATIVE_PI_EXECUTABLE: executable,
    ADDONE_NATIVE_PI_ARGUMENTS: JSON.stringify(REAL_PI_ARGUMENTS),
    PI_OFFLINE: "1",
    PATH: `${dirname(executable)}${delimiter}${options.environment?.PATH ?? process.env.PATH ?? ""}`,
  };
  const evidencePath = resolve(options.artifacts, "packaged-candidate.json");
  const candidate: PackagedCandidate = {
    root,
    prefix,
    tarball,
    packageRoot,
    cli: resolve(packageRoot, "bin", "addone.js"),
    packageVersion: identity.packageVersion,
    packageContentDigest: identity.contentDigest,
    pi,
    environment,
    evidencePath,
  };
  await writeFile(evidencePath, JSON.stringify({
    ...candidate,
    environment: selectedEnvironment(environment),
    roles: {
      bootstrap: candidate.cli,
      immutableUi: "selected at runtime from endpoint/release metadata",
      immutableSupervisor: "selected at runtime from endpoint/release metadata",
      nativePi: pi.executable,
    },
    exactCertificationTarball: options.tarball ? tarball : null,
    tarballSha512: `sha512-${createHash("sha512").update(await readFile(tarball)).digest("base64")}`,
  }, null, 2));
  return candidate;
}

async function packCandidate(packageRoot: string, packs: string, environment?: NodeJS.ProcessEnv): Promise<string> {
  const releasePackageLock = await acquirePackageLock(packageRoot);
  let pack: { stdout: string; stderr: string };
  try {
    pack = await run("npm", ["pack", "--json", "--pack-destination", packs], packageRoot, {
      ...(environment ?? process.env),
      ADDONE_INTERNAL_PACKAGING: "1",
    });
  } finally {
    await releasePackageLock();
  }
  const jsonStart = Math.max(pack.stdout.lastIndexOf("\n["), pack.stdout.startsWith("[") ? 0 : -1);
  if (jsonStart < 0) throw new Error(`npm pack did not emit a JSON result: ${pack.stdout}`);
  const packResult = JSON.parse(pack.stdout.slice(jsonStart === 0 ? 0 : jsonStart + 1)) as { filename?: unknown }[];
  const filename = packResult[0]?.filename;
  if (typeof filename !== "string") throw new Error(`npm pack did not identify its tarball: ${pack.stdout}`);
  return resolve(packs, filename);
}

async function acquirePackageLock(packageRoot: string): Promise<() => Promise<void>> {
  const digest = createHash("sha256").update(await realpath(packageRoot)).digest("hex").slice(0, 16);
  const lock = resolve(tmpdir(), `addone-package-${digest}.lock`);
  const deadline = Date.now() + 120_000;
  while (true) {
    try {
      await mkdir(lock);
      await writeFile(resolve(lock, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
      return async () => { await rm(lock, { recursive: true, force: true }); };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const age = Date.now() - await stat(lock).then(value => value.mtimeMs).catch(() => Date.now());
      if (age > 120_000) {
        await rm(lock, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new Error(`timed out waiting for package lock ${lock}`);
      await new Promise(resolvePromise => setTimeout(resolvePromise, 100));
    }
  }
}

async function run(command: string, arguments_: readonly string[], cwd: string, environment?: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const launcher = process.platform === "win32" ? crossSpawn : spawn;
    const child = launcher(command, [...arguments_], { cwd, env: environment ?? process.env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
    child.stderr?.on("data", chunk => stderr.push(Buffer.from(chunk)));
    child.once("error", rejectPromise);
    child.once("close", code => {
      const result = { stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") };
      if (code === 0) resolvePromise(result);
      else rejectPromise(new Error(`${command} ${arguments_.join(" ")} exited ${String(code)}\n${result.stderr}`));
    });
  });
}

function selectedEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  const keys = ["ADDONE_NATIVE_PI_EXECUTABLE", "ADDONE_NATIVE_PI_ARGUMENTS", "ADDONE_DATA_DIR", "ADDONE_RUNTIME_DIR", "PI_CODING_AGENT_DIR", "PI_OFFLINE", "PATH"];
  return Object.fromEntries(keys.flatMap(key => environment[key] === undefined ? [] : [[key, environment[key] as string]]));
}
