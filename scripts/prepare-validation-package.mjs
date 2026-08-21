import crossSpawn from "cross-spawn";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve("artifacts", "validation", "package");
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
await copyFile(source, target);
await writeFile(resolve(outputDirectory, "npm-pack-result.json"), `${JSON.stringify([{ ...metadata, validationFilename: "candidate.tgz" }], null, 2)}\n`);
await readFile(target);
process.stdout.write(`Validation package: ${target}\n`);
