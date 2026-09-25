import crossSpawn from "cross-spawn";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readPackedEntries, readPackedManifest } from "../governance/candidate-evidence.mjs";

const candidate = resolve(process.env.VALIDATION_INSTALLER_TARBALL ?? process.argv[2] ?? "");
const expectedVersion = process.env.RELEASE_VERSION;
if (!process.env.VALIDATION_INSTALLER_TARBALL && !process.argv[2]) throw new Error("installer candidate path is required");
const sourceManifest = JSON.parse(await readFile(resolve("packages", "a1-install", "package.json"), "utf8"));
validateSourceManifest(sourceManifest);
const bytes = await readFile(candidate);
const packed = readPackedManifest(bytes);
validatePackedManifest(packed, sourceManifest);
if (expectedVersion && packed.version !== expectedVersion) throw new Error(`installer candidate version ${packed.version} is not ${expectedVersion}`);
const entries = readPackedEntries(bytes);
const paths = entries.map(entry => entry.path).sort();
const expectedPaths = ["package/LICENSE", "package/README.md", "package/bin/a1-install.js", "package/package.json"];
if (JSON.stringify(paths) !== JSON.stringify(expectedPaths)) throw new Error("installer candidate payload is not minimal");
const executable = entries.find(entry => entry.path === "package/bin/a1-install.js");
if (!executable || (executable.mode & 0o111) === 0) throw new Error("installer candidate executable mode is invalid");

const root = await mkdtemp(resolve(tmpdir(), "a1-installer-package-"));
const prefix = resolve(root, "prefix");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
try {
  const installed = crossSpawn.sync(npm, [
    "install", "--global", "--prefix", prefix, candidate, "--ignore-scripts", "--no-audit", "--no-fund", "--offline",
  ], { cwd: root, encoding: "utf8", env: process.env, windowsHide: true });
  if (installed.status !== 0) throw new Error(installed.stderr || `installer candidate install failed with ${installed.status}`);

  const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", ...sourceManifest.name.split("/"));
  const manifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
  validatePackedManifest(manifest, sourceManifest);
  if (manifest.version !== packed.version) throw new Error("installed installer identity differs from the candidate");

  const launcher = process.platform === "win32" ? resolve(prefix, "a1-install.cmd") : resolve(prefix, "bin", "a1-install");
  await access(launcher);
  const invoked = crossSpawn.sync(launcher, ["--help"], { cwd: root, encoding: "utf8", env: process.env, windowsHide: true });
  if (invoked.status !== 0) throw new Error(invoked.stderr || `installer executable failed with ${invoked.status}`);
  const expectedHelp = [
    "a1-install",
    "a1-install --develop",
    "a1-install --version <x.y.z-dev.n>",
    "a1-install --verbose",
    "",
  ].join("\n");
  if (invoked.stdout.replace(/\r\n/gu, "\n") !== expectedHelp || invoked.stderr !== "") {
    throw new Error("installer executable help contract is invalid");
  }
  process.stdout.write(`Validated installer package ${manifest.name}@${manifest.version}\n`);
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
}

function validateSourceManifest(manifest) {
  if (typeof manifest?.name !== "string" || !manifest.name.startsWith("@") || !manifest.name.endsWith("/a1-install")) throw new Error("installer package name is invalid");
  const executables = Object.entries(manifest.bin ?? {});
  if (executables.length !== 1 || executables[0]?.[0] !== "a1-install" || executables[0]?.[1] !== "bin/a1-install.js") throw new Error("installer package executable is invalid");
  assertMinimalMetadata(manifest);
}

function validatePackedManifest(manifest, source) {
  if (manifest?.name !== source.name || JSON.stringify(manifest.bin) !== JSON.stringify(source.bin)) throw new Error("installer package identity is invalid");
  if (typeof manifest.version !== "string" || manifest.version.length < 1 || manifest.version.length > 128) throw new Error("installer package version is invalid");
  assertMinimalMetadata(manifest);
}

function assertMinimalMetadata(manifest) {
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "bundledDependencies", "bundleDependencies", "funding", "scripts"]) {
    if (Object.hasOwn(manifest, field)) throw new Error(`installer package must not declare ${field}`);
  }
}
