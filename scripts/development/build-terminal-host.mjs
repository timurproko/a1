import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hostTriple, NOTICES_FILENAME, writeTerminalHostNotices } from "../release/generate-terminal-host-notices.mjs";
import { addonLibraryName, observeAddonIdentity, resolveBuildTarget, targetIdentity, ZIG_BASELINE_CPU } from "./native-target.mjs";

export const TERMINAL_HOST_MANIFEST = "terminal-host.manifest.json";
export const TERMINAL_HOST_SCHEMA = "a1-terminal-host-artifact-v2";
export const TERMINAL_HOST_ADDON = "terminal-host.node";
export const TERMINAL_HOST_ENTRY = "dist/foundation/resident-tabs/host-entry.js";
export const TERMINAL_HOST_GENERATION = 1;
const PROTOCOL_VERSION = 1;
export const GHOSTTY_VT_COMMIT = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";
export const PINNED_ZIG_VERSION = "0.15.2";

/** Checks the version JSON exported by a built terminal host addon. */
export function verifyVersionReport(report, crateVersion) {
  const problems = [];
  if (report?.schema !== "a1-terminal-host-version-v1") problems.push("unexpected version schema");
  if (report?.protocolVersion !== PROTOCOL_VERSION) problems.push(`protocol version ${report?.protocolVersion} is not ${PROTOCOL_VERSION}`);
  if (report?.generation !== TERMINAL_HOST_GENERATION) problems.push(`generation ${report?.generation} is not ${TERMINAL_HOST_GENERATION}`);
  if (report?.crateVersion !== crateVersion) problems.push(`crate version ${report?.crateVersion} is not ${crateVersion}`);
  if (report?.libghosttyVtCommit !== GHOSTTY_VT_COMMIT) problems.push("libghostty-vt commit does not match the pinned source");
  if (report?.features?.faultInjection !== false) problems.push("release addon must not include fault injection");
  if (report?.features?.residentFixtures !== false) problems.push("release addon must not include resident fixtures");
  return problems;
}

export function buildManifest({ platform, architecture, triple, crateVersion, report, artifact, entry, notices, cargoLockSha256, rustVersion, zigVersion, builtAt, identityCheck = "executed" }) {
  if (!["executed", "mach-o-header"].includes(identityCheck)) throw new Error(`unknown terminal host identity check ${identityCheck}`);
  return {
    schema: TERMINAL_HOST_SCHEMA,
    kind: "node-addon",
    nodeApi: 9,
    protocolVersion: PROTOCOL_VERSION,
    generation: TERMINAL_HOST_GENERATION,
    crateVersion,
    platform,
    architecture,
    target: triple,
    capability: "supported",
    builtAt,
    artifact,
    entry,
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
      features: { addon: ["node-addon"] },
      signatureStatus: "ci-attestation-required",
      identityCheck,
    },
  };
}

async function fileRecord(path, filename = path.split(/[\\/]/).at(-1)) {
  const [bytes, metadata] = await Promise.all([readFile(path), stat(path)]);
  return { filename, sha256: createHash("sha256").update(bytes).digest("hex"), size: metadata.size };
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

/** Report the pinned producer version when a local build links verified CI bytes and never invokes Zig. */
export function terminalHostZigVersion(environment, observe) {
  const localPrebuilt = environment.TERMINAL_HOST_LOCAL_BUILD === "1"
    && !environment.CI && Boolean(environment.TERMINAL_HOST_PREBUILT_VT?.trim());
  return localPrebuilt ? `${PINNED_ZIG_VERSION} (prebuilt terminal library)` : observe();
}

async function main() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const target = resolveBuildTarget({ argv: process.argv.slice(2) });
  const { platform, architecture } = target;
  const cargo = process.env.CARGO ?? "cargo";
  const verbose = process.env.A1_BUILD_VERBOSE === "1";
  const cargoManifest = resolve(repositoryRoot, "native/terminal-host/Cargo.toml");
  const crateVersion = (await readFile(cargoManifest, "utf8")).match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (!crateVersion) throw new Error("terminal host Cargo manifest has no package version");
  const releaseDirectory = resolve(repositoryRoot, "native/terminal-host/target", target.outputDirectory);
  const targetDirectory = resolve(repositoryRoot, "dist/native", `${platform}-${architecture}`);
  await mkdir(targetDirectory, { recursive: true });

  run(cargo, ["build", "--release", "--locked", ...target.cargoArguments, "--manifest-path", cargoManifest, "--lib", "--features", "node-addon"], verbose);
  const artifactPath = resolve(targetDirectory, TERMINAL_HOST_ADDON);
  await copyFile(resolve(releaseDirectory, addonLibraryName("terminal_host_contracts", platform)), artifactPath);

  const loaderArguments = [
    "-e",
    "const addon = require(process.argv[1]); process.stdout.write.call(process.stdout, JSON.stringify(addon.version()));",
    artifactPath,
  ];
  const observed = observeAddonIdentity({
    addon: artifactPath,
    arguments_: loaderArguments,
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
    const zig = targetIdentity(triple);
    report = { libghosttyVtCommit: GHOSTTY_VT_COMMIT, libghosttyTarget: zig.zigTarget, libghosttyCpu: ZIG_BASELINE_CPU };
  }

  const entryPath = resolve(repositoryRoot, TERMINAL_HOST_ENTRY);
  await writeTerminalHostNotices({ repositoryRoot, targetDirectory, triple });
  const manifest = buildManifest({
    platform,
    architecture,
    triple,
    crateVersion,
    report,
    artifact: await fileRecord(artifactPath),
    entry: await fileRecord(entryPath, TERMINAL_HOST_ENTRY),
    notices: await fileRecord(resolve(targetDirectory, NOTICES_FILENAME)),
    cargoLockSha256: createHash("sha256").update(await readFile(resolve(repositoryRoot, "native/terminal-host/Cargo.lock"))).digest("hex"),
    rustVersion: run(process.env.RUSTC ?? "rustc", ["--version"], false, { encoding: "utf8" }).trim(),
    zigVersion: terminalHostZigVersion(process.env, () => run(process.env.ZIG ?? "zig", ["version"], false, { encoding: "utf8" }).trim()),
    builtAt: new Date().toISOString(),
    identityCheck: observed.check,
  });
  await writeFile(resolve(targetDirectory, TERMINAL_HOST_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (verbose) process.stdout.write(`Built ${artifactPath} (${manifest.artifact.sha256}, identity ${observed.check})\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
