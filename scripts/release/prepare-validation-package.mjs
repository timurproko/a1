import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { repairNativeExecutableModes } from "./repair-native-executable-modes.mjs";
import { assertPackingNpm, normalizeNpmPackMetadata, parseNpmPackOutput } from "./npm-pack-metadata.mjs";
import { createValidationPhaseRecorder } from "./validation-phase.mjs";
import { recordPackageReceipt, verifyBuildReceipt } from "./validation-receipt.mjs";

const phases = createValidationPhaseRecorder("candidate-package");
const buildReceipt = process.env.VALIDATION_BUILD_RECEIPT;
if (!buildReceipt) throw new Error("VALIDATION_BUILD_RECEIPT is required before candidate packing");
await phases.run("verify-build-receipt", () => verifyBuildReceipt(buildReceipt));
const outputDirectory = resolve(".artifacts", "validation", "package");
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
phases.runSync("npm-version", () => {
  const result = crossSpawn.sync(npm, ["--version"], { cwd: process.cwd(), encoding: "utf8", env: process.env, windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || `npm --version failed with ${result.status}`);
  return assertPackingNpm(result.stdout);
});
const metadata = phases.runSync("npm-pack", () => {
  const result = crossSpawn.sync(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", outputDirectory], {
    cwd: process.cwd(), encoding: "utf8", env: process.env, windowsHide: true,
  });
  if (result.status !== 0) throw new Error(result.stderr || `npm pack failed with ${result.status}`);
  return normalizeNpmPackMetadata(parseNpmPackOutput(result.stdout));
});
const source = resolve(outputDirectory, metadata.filename);
const target = resolve(outputDirectory, "candidate.tgz");
// Platform: the pack host may not represent posix permissions, so packed native guardian
// modes are repaired before the candidate identity below binds integrity to these bytes.
const { bytes, repaired } = await phases.run("native-mode-repair", async () => repairNativeExecutableModes(await readFile(source)));
phases.bindCandidate(bytes);
await phases.run("write-exact-candidate", () => writeFile(target, bytes));
const identity = {
  integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  shasum: createHash("sha1").update(bytes).digest("hex"),
  size: bytes.length,
};
await writeFile(resolve(outputDirectory, "npm-pack-result.json"), `${JSON.stringify([{ ...metadata, ...identity, validationFilename: "candidate.tgz" }], null, 2)}\n`);
await readFile(target);
await phases.run("package-receipt", () => recordPackageReceipt(target, {
  buildReceipt,
  output: resolve(outputDirectory, "candidate.receipt.json"),
}));
if (repaired.length > 0) process.stdout.write(`Repaired native executable modes: ${repaired.join(", ")}\n`);
process.stdout.write(`Validation package: ${target}\n`);
