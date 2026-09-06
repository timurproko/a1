import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { repairNativeExecutableModes } from "./repair-native-executable-modes.mjs";

const outputDirectory = resolve(".artifacts", "validation", "package");
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = crossSpawn.sync(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", outputDirectory], {
  cwd: process.cwd(), encoding: "utf8", env: process.env, windowsHide: true,
});
if (result.status !== 0) throw new Error(result.stderr || `npm pack failed with ${result.status}`);
const [metadata] = JSON.parse(result.stdout);
if (!metadata?.filename || !metadata?.integrity || !metadata?.shasum) throw new Error("npm pack returned incomplete validation metadata");
const source = resolve(outputDirectory, metadata.filename);
const target = resolve(outputDirectory, "candidate.tgz");
// Platform: the pack host may not represent posix permissions, so packed native guardian
// modes are repaired before the candidate identity below binds integrity to these bytes.
const { bytes, repaired } = repairNativeExecutableModes(await readFile(source));
await writeFile(target, bytes);
const identity = {
  integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  shasum: createHash("sha1").update(bytes).digest("hex"),
  size: bytes.length,
};
await writeFile(resolve(outputDirectory, "npm-pack-result.json"), `${JSON.stringify([{ ...metadata, ...identity, validationFilename: "candidate.tgz" }], null, 2)}\n`);
await readFile(target);
if (repaired.length > 0) process.stdout.write(`Repaired native executable modes: ${repaired.join(", ")}\n`);
process.stdout.write(`Validation package: ${target}\n`);
