/**
 * Re-resolves `modal-surface-inventory.json`, `presenter-ownership-inventory.json`, and
 * `pinned-pi-interactive-baseline.json` against the installed Pi packages through
 * `sync-pi-inventories-core.mjs`, so a Pi upgrade proposes inventory updates instead of
 * requiring a migration by hand. `--check` reports without writing and fails on drift, orphaned
 * entries, or unmapped components; `--commit <sha>` records the upstream commit of a new version;
 * `--report <path>` writes the resolution report for an upgrade pull request body.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { syncInventories } from "./sync-pi-inventories-core.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const commitArgument = argumentValue("--commit");
const reportPath = argumentValue("--report");
const baselineRoot = join(repository, "config", "baselines");
const codingAgentRoot = join(repository, "node_modules", "@earendil-works", "pi-coding-agent");
const packageRoots = {
  "@earendil-works/pi-coding-agent": codingAgentRoot,
  "@earendil-works/pi-tui": join(repository, "node_modules", "@earendil-works", "pi-tui"),
};

const inventories = {
  modal: await readJson("modal-surface-inventory.json"),
  presenters: await readJson("presenter-ownership-inventory.json"),
  behaviors: await readJson("pinned-pi-interactive-baseline.json"),
};
const version = JSON.parse(await readFile(join(codingAgentRoot, "package.json"), "utf8")).version;
const commit = commitArgument ?? inventories.modal.pinned.commit;
if (version !== inventories.modal.pinned.version && commitArgument === undefined) {
  throw new Error(`installed Pi ${version} differs from the pinned ${inventories.modal.pinned.version}; pass --commit <sha> for the new version`);
}
const lockfile = JSON.parse(await readFile(join(repository, "package-lock.json"), "utf8"));
const lockPackages = Object.fromEntries(Object.keys(packageRoots).map(name => [name, lockfile.packages[`node_modules/${name}`] ?? {}]));
const modalSources = Object.fromEntries(await Promise.all(Object.entries(inventories.modal.sources)
  .map(async ([id, path]) => [id, await readFile(join(repository, path), "utf8")])));
const presenterSource = await readFile(join(repository, inventories.presenters.pinned.packageArtifact), "utf8");
const behaviorSources = new Map();
for (const record of inventories.behaviors.sourceProvenance) {
  const sourceMap = JSON.parse(await readFile(join(packageRoots[record.package], "dist", record.sourceMap), "utf8"));
  if (sourceMap.sources?.length !== 1 || sourceMap.sourcesContent?.length !== 1) throw new Error(`invalid pinned source map: ${record.sourceMap}`);
  behaviorSources.set(record.id, sourceMap.sourcesContent[0].replaceAll("\r\n", "\n"));
}
const componentFiles = (await readdir(join(codingAgentRoot, "dist", "modes", "interactive", "components")))
  .filter(name => name.endsWith(".js"));

const { report, blocking, changed } = syncInventories({ inventories, modalSources, presenterSource, behaviorSources, componentFiles, version, commit, lockPackages });

if (checkOnly) {
  if (changed) console.error("inventory drift: the inventories differ from their re-resolved form");
  for (const line of blocking) console.error(`inventory drift: ${line}`);
  if (changed || blocking.length > 0) process.exitCode = 1;
  else console.log(`Pinned Pi inventories are current (${version}, ${commit.slice(0, 7)})`);
} else {
  await writeJson("modal-surface-inventory.json", inventories.modal);
  await writeJson("presenter-ownership-inventory.json", inventories.presenters);
  await writeJson("pinned-pi-interactive-baseline.json", inventories.behaviors);
  console.log(`Wrote ${changed ? "updated" : "unchanged"} pinned Pi inventories for ${version} (${commit.slice(0, 7)})`);
  for (const line of blocking) console.log(`review: ${line}`);
}
if (reportPath !== undefined) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function readJson(name) {
  return JSON.parse(await readFile(join(baselineRoot, name), "utf8"));
}

async function writeJson(name, value) {
  await writeFile(join(baselineRoot, name), `${JSON.stringify(value, null, 2)}\n`);
  console.log(`  ${relative(repository, join(baselineRoot, name))}`);
}
