import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chmod, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hostTriple, NOTICES_FILENAME, writeTerminalHostNotices } from "../release/generate-terminal-host-notices.mjs";
import { observeExecutableIdentity, resolveBuildTarget, targetIdentity, ZIG_BASELINE_CPU } from "./native-target.mjs";

export const TERMINAL_HOST_MANIFEST = "terminal-host.manifest.json";
export const TERMINAL_HOST_SCHEMA = "a1-terminal-host-artifact-v1";
export const SESSION_LOCK_FILENAME = "a1_session_lock.node";
export const TERMINAL_HOST_GENERATION = 1;
const PROTOCOL_VERSION = 1;
const GHOSTTY_VT_COMMIT = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";

export function terminalHostExecutableName(identity, platform = process.platform) {
  return platform === "win32" ? `${identity.artifacts.nativeExecutable}.exe` : identity.artifacts.nativeExecutable;
}

/** The cdylib Cargo emits for the `node-addon` build on each platform. */
export function sessionLockLibraryName(platform = process.platform) {
  if (platform === "win32") return "terminal_host_contracts.dll";
  return platform === "darwin" ? "libterminal_host_contracts.dylib" : "libterminal_host_contracts.so";
}

/**
 * Checks the `--version` JSON of a built terminal host against the expected identity. A release
 * artifact must never carry the fixture or fault-injection features.
 */
export function verifyVersionReport(report, crateVersion) {
  const problems = [];
  if (report?.schema !== "a1-terminal-host-version-v1") problems.push("unexpected version schema");
  if (report?.protocolVersion !== PROTOCOL_VERSION) problems.push(`protocol version ${report?.protocolVersion} is not ${PROTOCOL_VERSION}`);
  if (report?.generation !== TERMINAL_HOST_GENERATION) problems.push(`generation ${report?.generation} is not ${TERMINAL_HOST_GENERATION}`);
  if (report?.crateVersion !== crateVersion) problems.push(`crate version ${report?.crateVersion} is not ${crateVersion}`);
  if (report?.libghosttyVtCommit !== GHOSTTY_VT_COMMIT) problems.push("libghostty-vt commit does not match the pinned source");
  if (report?.features?.faultInjection !== false) problems.push("release binary must not include fault injection");
  if (report?.features?.residentFixtures !== false) problems.push("release binary must not include resident fixtures");
  return problems;
}

export function buildManifest({ platform, architecture, triple, crateVersion, report, executable, sessionLock, notices, cargoLockSha256, rustVersion, zigVersion, builtAt, identityCheck = "executed" }) {
  if (!["executed", "mach-o-header"].includes(identityCheck)) throw new Error(`unknown terminal host identity check ${identityCheck}`);
  return {
    schema: TERMINAL_HOST_SCHEMA,
    protocolVersion: PROTOCOL_VERSION,
    generation: TERMINAL_HOST_GENERATION,
    crateVersion,
    platform,
    architecture,
    target: triple,
    capability: "supported",
    builtAt,
    artifact: executable,
    sessionLock,
    notices,
    provenance: {
      language: "Rust",
      sourceRoot: "native/terminal-host",
      cargoLock: "native/terminal-host/Cargo.lock",
      cargoLockSha256,
      libghosttyVtCommit: report.libghosttyVtCommit,
      zigTarget: report.libghosttyTarget,
      zigCpu: report.libghosttyCpu,
      zigVersion,
      rustVersion,
      features: { executable: [], sessionLock: ["node-addon"] },
      signatureStatus: "ci-attestation-required",
      // Rationale: a cross build the producing runner could not execute records that only its Mach-O
      // architecture was observed, never a version report nobody saw.
      identityCheck,
    },
  };
}

async function fileRecord(path) {
  const [bytes, metadata] = await Promise.all([readFile(path), stat(path)]);
  return { filename: path.split(/[\\/]/).at(-1), sha256: createHash("sha256").update(bytes).digest("hex"), size: metadata.size };
}

function run(executable, arguments_, verbose, options = {}) {
  const result = crossSpawn.sync(executable, arguments_, {
    stdio: verbose ? "inherit" : ["ignore", "pipe", "pipe"],
    env: process.env,
    windowsHide: true,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (!verbose) {
      process.stderr.write(result.stdout?.toString() ?? "");
      process.stderr.write(result.stderr?.toString() ?? "");
    }
    throw new Error(`${executable} ${arguments_.join(" ")} failed with ${result.status}`);
  }
  return result.stdout?.toString() ?? "";
}

async function main() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  // Rationale: `--target <triple>` cross-compiles another architecture of the host OS; publication builds
  // macOS x64 this way on the arm64 runner, where the Intel runner took two to three times as long.
  const target = resolveBuildTarget({ argv: process.argv.slice(2) });
  const { platform, architecture } = target;
  const cargo = process.env.CARGO ?? "cargo";
  // Rationale: a build that worked has nothing to say; output is shown only on failure or with A1_BUILD_VERBOSE=1.
  const verbose = process.env.A1_BUILD_VERBOSE === "1";
  const identity = JSON.parse(await readFile(resolve(repositoryRoot, "src/product-identity.json"), "utf8"));
  const cargoManifest = resolve(repositoryRoot, "native/terminal-host/Cargo.toml");
  const crateVersion = (await readFile(cargoManifest, "utf8")).match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (!crateVersion) throw new Error("terminal host Cargo manifest has no package version");
  const releaseDirectory = resolve(repositoryRoot, "native/terminal-host/target", target.outputDirectory);
  const targetDirectory = resolve(repositoryRoot, "dist/native", `${platform}-${architecture}`);
  await mkdir(targetDirectory, { recursive: true });

  // Invariant: the executable is copied before the addon build so the feature-enabled library build cannot replace it.
  const executableName = terminalHostExecutableName(identity, platform);
  run(cargo, ["build", "--release", "--locked", ...target.cargoArguments, "--manifest-path", cargoManifest, "--bin", "terminal-host"], verbose);
  const executablePath = resolve(targetDirectory, executableName);
  await copyFile(resolve(releaseDirectory, platform === "win32" ? "terminal-host.exe" : "terminal-host"), executablePath);
  if (platform !== "win32") await chmod(executablePath, 0o755);

  run(cargo, ["build", "--release", "--locked", ...target.cargoArguments, "--manifest-path", cargoManifest, "--lib", "--features", "node-addon"], verbose);
  const sessionLockPath = resolve(targetDirectory, SESSION_LOCK_FILENAME);
  await copyFile(resolve(releaseDirectory, sessionLockLibraryName(platform)), sessionLockPath);

  const observed = observeExecutableIdentity({
    executable: executablePath,
    arguments_: ["--version"],
    target,
    execute: (executable, arguments_) => crossSpawn.sync(executable, arguments_, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }),
    readBytes: path => readFileSync(path),
  });
  const triple = target.triple ?? hostTriple();
  let report;
  if (observed.check === "executed") {
    report = JSON.parse(observed.stdout.trim());
    const problems = verifyVersionReport(report, crateVersion);
    if (problems.length > 0) throw new Error(`built terminal host failed identity checks:\n${problems.map(problem => `- ${problem}`).join("\n")}`);
  } else {
    // Rationale: without a version report the Zig target and CPU come from the same table build.rs used.
    const zig = targetIdentity(triple);
    report = { libghosttyVtCommit: GHOSTTY_VT_COMMIT, libghosttyTarget: zig.zigTarget, libghosttyCpu: ZIG_BASELINE_CPU };
  }

  await writeTerminalHostNotices({ repositoryRoot, targetDirectory, triple });
  const manifest = buildManifest({
    platform,
    architecture,
    triple,
    crateVersion,
    report,
    executable: await fileRecord(executablePath),
    sessionLock: await fileRecord(sessionLockPath),
    notices: await fileRecord(resolve(targetDirectory, NOTICES_FILENAME)),
    cargoLockSha256: createHash("sha256").update(await readFile(resolve(repositoryRoot, "native/terminal-host/Cargo.lock"))).digest("hex"),
    rustVersion: run(process.env.RUSTC ?? "rustc", ["--version"], false, { encoding: "utf8" }).trim(),
    zigVersion: run(process.env.ZIG ?? "zig", ["version"], false, { encoding: "utf8" }).trim(),
    builtAt: new Date().toISOString(),
    identityCheck: observed.check,
  });
  await writeFile(resolve(targetDirectory, TERMINAL_HOST_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (verbose) process.stdout.write(`Built ${executablePath} (${manifest.artifact.sha256}, identity ${observed.check})\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
