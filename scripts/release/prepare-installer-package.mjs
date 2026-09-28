import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readPackedManifest } from "../governance/candidate-evidence.mjs";
import { assertPackingNpm, normalizeNpmPackMetadata, parseNpmPackOutput } from "./npm-pack-metadata.mjs";
import { repairPackedExecutableModes } from "./repair-native-executable-modes.mjs";

const sourceDirectory = resolve("packages", "a1-install");
const stageDirectory = resolve(".artifacts", "validation", "installer-stage");
const outputDirectory = resolve(".artifacts", "validation", "package");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const rootManifest = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const sourceManifest = JSON.parse(await readFile(resolve(sourceDirectory, "package.json"), "utf8"));
const [sourceLicense, rootLicense] = await Promise.all([
  readFile(resolve(sourceDirectory, "LICENSE"), "utf8"),
  readFile(resolve("LICENSE"), "utf8"),
]);
const version = process.env.RELEASE_VERSION ?? rootManifest.version;

validateSourceManifest(sourceManifest);
if (sourceLicense !== rootLicense) throw new Error("installer package license differs from the repository license");
if (typeof version !== "string" || version.length < 1 || version.length > 128) throw new Error("installer package version is invalid");

await rm(stageDirectory, { recursive: true, force: true });
await mkdir(resolve(stageDirectory, "bin"), { recursive: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  cp(resolve(sourceDirectory, "bin", "a1-install.js"), resolve(stageDirectory, "bin", "a1-install.js"), { recursive: true }),
  cp(resolve(sourceDirectory, "README.md"), resolve(stageDirectory, "README.md")),
  cp(resolve(sourceDirectory, "LICENSE"), resolve(stageDirectory, "LICENSE")),
]);
await chmod(resolve(stageDirectory, "bin", "a1-install.js"), 0o755);
await writeFile(resolve(stageDirectory, "package.json"), `${JSON.stringify({ ...sourceManifest, version }, null, 2)}\n`);

const npmVersion = crossSpawn.sync(npm, ["--version"], { cwd: process.cwd(), encoding: "utf8", env: process.env, windowsHide: true });
if (npmVersion.status !== 0) throw new Error(npmVersion.stderr || `npm --version failed with ${npmVersion.status}`);
assertPackingNpm(npmVersion.stdout);
const packed = crossSpawn.sync(npm, ["pack", stageDirectory, "--ignore-scripts", "--json", "--pack-destination", outputDirectory], {
  cwd: process.cwd(), encoding: "utf8", env: process.env, windowsHide: true,
});
if (packed.status !== 0) throw new Error(packed.stderr || `installer npm pack failed with ${packed.status}`);
const metadata = normalizeNpmPackMetadata(parseNpmPackOutput(packed.stdout));
const source = resolve(outputDirectory, metadata.filename);
const target = resolve(outputDirectory, "installer.tgz");
const { bytes, repaired } = repairPackedExecutableModes(await readFile(source), ["package/bin/a1-install.js"]);
await writeFile(target, bytes);
if (source !== target) await rm(source, { force: true });
const manifest = readPackedManifest(bytes);
validatePackedManifest(manifest, sourceManifest);
if (manifest.version !== version) throw new Error(`packed installer version ${manifest.version} is not ${version}`);
const identity = {
  integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  shasum: createHash("sha1").update(bytes).digest("hex"),
  size: bytes.length,
};
const files = metadata.files?.map(file => file.path === "bin/a1-install.js" ? { ...file, mode: 0o755 } : file);
await writeFile(resolve(outputDirectory, "installer-pack-result.json"), `${JSON.stringify([{ ...metadata, ...identity, files, filename: "installer.tgz" }], null, 2)}\n`);
await rm(stageDirectory, { recursive: true, force: true });
if (repaired.length > 0) process.stdout.write(`Repaired installer executable modes: ${repaired.join(", ")}\n`);
process.stdout.write(`Installer package: ${target}\n`);

function validateSourceManifest(manifest) {
  if (typeof manifest?.name !== "string" || !manifest.name.startsWith("@") || !manifest.name.endsWith("/a1-install")) throw new Error("installer package name is invalid");
  const executables = Object.entries(manifest.bin ?? {});
  if (executables.length !== 1 || executables[0]?.[0] !== "a1-install" || executables[0]?.[1] !== "bin/a1-install.js") throw new Error("installer package executable is invalid");
  assertMinimalMetadata(manifest);
}

function validatePackedManifest(manifest, source) {
  if (manifest?.name !== source.name) throw new Error("packed installer package name is invalid");
  if (JSON.stringify(manifest.bin) !== JSON.stringify(source.bin)) throw new Error("packed installer package executable is invalid");
  assertMinimalMetadata(manifest);
}

function assertMinimalMetadata(manifest) {
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "bundledDependencies", "bundleDependencies", "funding", "scripts"]) {
    if (Object.hasOwn(manifest, field)) throw new Error(`installer package must not declare ${field}`);
  }
}
