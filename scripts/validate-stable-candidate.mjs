import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { deriveStableCandidate, observeStableRegistry } from "./stable-candidate.mjs";

const repository = resolve(process.cwd());
const [manifest, identity] = await Promise.all([
  readJson(resolve(repository, "package.json")),
  readJson(resolve(repository, "src", "product-identity.json")),
]);
const commit = required("--commit");
const tag = required("--tag");
const actualCommit = git(["rev-parse", "HEAD"]);
const tree = git(["rev-parse", `${commit}^{tree}`]);
const actualTree = valueAfter("--expected-tree") ?? tree;
const status = git(["status", "--porcelain"]);
const registryOverride = valueAfter("--registry-status");
const registryStatus = registryOverride ?? await observeStableRegistry(identity.packageName, manifest.version);
const candidate = deriveStableCandidate({
  identity,
  packageName: manifest.name,
  version: manifest.version,
  tag,
  commit,
  actualCommit,
  tree,
  actualTree,
  status,
  registryStatus,
});
const output = valueAfter("--output");
if (output) {
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(candidate, null, 2)}\n`);
} else process.stdout.write(`${JSON.stringify(candidate, null, 2)}\n`);

function git(arguments_) {
  const result = spawnSync("git", arguments_, { cwd: repository, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || `git ${arguments_.join(" ")} failed`);
  return result.stdout.trim();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function required(name) {
  const value = valueAfter(name);
  if (!value) throw new Error(`missing required argument ${name}`);
  return value;
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
