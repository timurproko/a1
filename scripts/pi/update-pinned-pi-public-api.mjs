/**
 * Regenerates `config/baselines/pinned-pi-public-api.json`, the package-root export surface of
 * both pinned Pi packages with each export's kind, declaration hash, and A1 consumers. Reads the
 * declaration entries by path from the installed packages (`--packages-root <node_modules>` for
 * another installation) and the consumers from `src/`; `--output <path>` writes elsewhere, which
 * is how the upgrade driver records a candidate's surface, and `--check` reports drift without
 * writing.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectPiPublicApi, diffPublicApi } from "./pi-public-api.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const baselinePath = join(repository, "config", "baselines", "pinned-pi-public-api.json");
const outputPath = resolve(argumentValue("--output") ?? baselinePath);
const packagesRoot = resolve(argumentValue("--packages-root") ?? join(repository, "node_modules"));
const sourceRoot = resolve(argumentValue("--source-root") ?? join(repository, "src"));

const next = await collectPiPublicApi({ packagesRoot, sourceRoot });
const count = next.packages.reduce((total, pkg) => total + pkg.exports.length, 0);
if (checkOnly) {
  const previous = await readFile(outputPath, "utf8").then(JSON.parse, () => null);
  if (previous === null) {
    console.error(`public API drift: ${relative(repository, outputPath).replaceAll("\\", "/")} is missing`);
    process.exitCode = 1;
  } else {
    const delta = diffPublicApi(previous, next);
    const versions = next.packages.filter(pkg => previous.packages.find(candidate => candidate.name === pkg.name)?.version !== pkg.version);
    const lines = [
      ...versions.map(pkg => `${pkg.name} is ${pkg.version} in the packages`),
      ...delta.added.map(record => `added ${record.package} ${record.kind} ${record.name}`),
      ...delta.removed.map(record => `removed ${record.package} ${record.kind} ${record.name}`),
      ...delta.changed.map(record => `changed ${record.package} ${record.kind} ${record.name}`),
      ...consumerDrift(previous, next),
    ];
    if (lines.length > 0) {
      for (const line of lines) console.error(`public API drift: ${line}`);
      process.exitCode = 1;
    } else {
      console.log(`Pinned Pi public API is current (${count} exports)`);
    }
  }
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${relative(repository, outputPath).replaceAll("\\", "/")} (${count} exports)`);
}

function consumerDrift(previous, next) {
  const lines = [];
  for (const pkg of next.packages) {
    const before = new Map((previous.packages.find(candidate => candidate.name === pkg.name)?.exports ?? []).map(record => [record.name, record]));
    for (const record of pkg.exports) {
      const old = before.get(record.name);
      if (old !== undefined && JSON.stringify(old.consumers) !== JSON.stringify(record.consumers)) lines.push(`consumers of ${pkg.name} ${record.name} differ`);
    }
  }
  return lines;
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}
