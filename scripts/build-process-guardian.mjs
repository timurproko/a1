import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const platform = process.platform;
const architecture = process.arch;
const executable = platform === "win32" ? "a1-process-guardian.exe" : "a1-process-guardian";
const cargo = process.env.CARGO ?? "cargo";
const manifestPath = resolve("native/process-guardian/Cargo.toml");
// A build that worked has nothing to say. Its output is kept and shown only when
// it failed, or when the reader asked for it with A1_BUILD_VERBOSE=1.
const verbose = process.env.A1_BUILD_VERBOSE === "1";
const build = crossSpawn.sync(cargo, ["build", "--release", "--locked", "--manifest-path", manifestPath], {
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

const source = resolve("native/process-guardian/target/release", executable);
const targetDirectory = resolve("dist/native", `${platform}-${architecture}`);
const target = resolve(targetDirectory, executable);
await mkdir(targetDirectory, { recursive: true });
await copyFile(source, target);
if (platform !== "win32") await chmod(target, 0o755);
const bytes = await readFile(target);
const metadata = await stat(target);
const cargoManifest = await readFile(manifestPath, "utf8");
const crateVersion = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (!crateVersion) throw new Error("process guardian Cargo manifest has no package version");
const version = crossSpawn.sync(target, ["--version"], { encoding: "utf8", windowsHide: true });
if (version.status !== 0 || !version.stdout.includes("protocol=1")) throw new Error("built process guardian has incompatible protocol identity");

const manifest = {
  schema: "a1-process-guardian-artifact-v1",
  protocolVersion: 1,
  crateVersion,
  platform,
  architecture,
  capability: platform === "darwin" ? "unsupported" : "supported",
  builtAt: new Date().toISOString(),
  artifact: {
    filename: basename(target),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: metadata.size,
  },
  provenance: {
    language: "Rust",
    cargoLock: "native/process-guardian/Cargo.lock",
    sourceRoot: "native/process-guardian",
    signatureStatus: "ci-attestation-required",
  },
};
await writeFile(resolve(targetDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
if (verbose) process.stdout.write(`Built ${target} (${manifest.artifact.sha256})\n`);
