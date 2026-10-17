import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chmod, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { observeExecutableIdentity, resolveBuildTarget } from "./native-target.mjs";

// Rationale: `--target <triple>` cross-compiles another architecture of the host OS; publication builds
// macOS x64 this way on the arm64 runner instead of on a slower Intel runner.
const target = resolveBuildTarget({ argv: process.argv.slice(2) });
const { platform, architecture } = target;
const executable = platform === "win32" ? "process-guardian.exe" : "process-guardian";
const cargo = process.env.CARGO ?? "cargo";
const manifestPath = resolve("native/process-guardian/Cargo.toml");
// Rationale: a build that worked has nothing to say. Its output is kept and shown only when
// it failed, or when the reader asked for it with A1_BUILD_VERBOSE=1.
const verbose = process.env.A1_BUILD_VERBOSE === "1";
const build = crossSpawn.sync(cargo, ["build", "--release", "--locked", ...target.cargoArguments, "--manifest-path", manifestPath], {
  stdio: verbose ? "inherit" : ["ignore", "pipe", "pipe"],
  env: process.env,
  windowsHide: true,
});
if (build.status !== 0) {
  if (!verbose) {
    process.stderr.write(build.stdout?.toString() ?? "");
    process.stderr.write(build.stderr?.toString() ?? "");
  }
  throw new Error(`process guardian Cargo build failed with ${build.status}`);
}

const source = resolve("native/process-guardian/target", target.outputDirectory, executable);
const targetDirectory = resolve("dist/native", `${platform}-${architecture}`);
const artifact = resolve(targetDirectory, executable);
await mkdir(targetDirectory, { recursive: true });
await copyFile(source, artifact);
if (platform !== "win32") await chmod(artifact, 0o755);
const bytes = await readFile(artifact);
const metadata = await stat(artifact);
const cargoManifest = await readFile(manifestPath, "utf8");
const crateVersion = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (!crateVersion) throw new Error("process guardian Cargo manifest has no package version");
const observed = observeExecutableIdentity({
  executable: artifact,
  arguments_: ["--version"],
  target,
  execute: (path, arguments_) => crossSpawn.sync(path, arguments_, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }),
  readBytes: path => readFileSync(path),
});
if (observed.check === "executed" && !observed.stdout.includes("protocol=1")) throw new Error("built process guardian has incompatible protocol identity");

const manifest = {
  schema: "a1-process-guardian-artifact-v1",
  protocolVersion: 1,
  crateVersion,
  platform,
  architecture,
  capability: "supported",
  builtAt: new Date().toISOString(),
  artifact: {
    filename: basename(artifact),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: metadata.size,
  },
  provenance: {
    language: "Rust",
    cargoLock: "native/process-guardian/Cargo.lock",
    sourceRoot: "native/process-guardian",
    signatureStatus: "ci-attestation-required",
    // Rationale: a cross build the producing runner could not execute records that only its Mach-O
    // architecture was observed, never a protocol identity nobody saw.
    identityCheck: observed.check,
  },
};
await writeFile(resolve(targetDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
if (verbose) process.stdout.write(`Built ${artifact} (${manifest.artifact.sha256}, identity ${observed.check})\n`);
