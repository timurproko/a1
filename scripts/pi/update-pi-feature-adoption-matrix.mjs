/**
 * Regenerates `config/baselines/pi-feature-adoption-matrix.json` from what the installed Pi
 * packages present: the interactive baseline's manifests, the settings the engine presents, and
 * the changelog's "New Features" entries newer than the matrix's `changelogSince`. Only the
 * upstream side is rewritten; dispositions and their evidence are kept from the existing matrix,
 * new rows start `pending`, and rows upstream dropped become `retired`. `--packages-root
 * <node_modules>` reads another installation, `--output <path>` writes elsewhere, `--report
 * <path>` records the created and retired rows for an upgrade proposal, and `--check` reports
 * drift without writing.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { refreshMatrix, upstreamFeatureRows } from "./pi-feature-adoption-matrix.mjs";
import { extractPiSettingsMetadata } from "./pi-settings-metadata.mjs";

// Rationale: features published before the foundation pin were adopted with the foundation; the
// matrix tracks the ones that arrived afterwards.
const DEFAULT_CHANGELOG_SINCE = "0.84.2";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const matrixPath = join(repository, "config", "baselines", "pi-feature-adoption-matrix.json");
const outputPath = resolve(argumentValue("--output") ?? matrixPath);
const packagesRoot = resolve(argumentValue("--packages-root") ?? join(repository, "node_modules"));
const baselinePath = resolve(argumentValue("--baseline") ?? join(repository, "config", "baselines", "pinned-pi-interactive-baseline.json"));
const reportPath = argumentValue("--report");

const previous = await readFile(matrixPath, "utf8").then(JSON.parse, () => null);
const upstreamRows = await collectUpstreamRows({ packagesRoot, baselinePath, changelogSince: previous?.changelogSince ?? DEFAULT_CHANGELOG_SINCE });
const version = JSON.parse(await readFile(join(packagesRoot, "@earendil-works", "pi-coding-agent", "package.json"), "utf8")).version;
const { matrix, report } = refreshMatrix(previous, upstreamRows, { version, changelogSince: previous?.changelogSince ?? DEFAULT_CHANGELOG_SINCE });
if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(resolve(reportPath), `${JSON.stringify({ ...report, pending: matrix.rows.filter(row => row.disposition === "pending").map(row => row.id) }, null, 2)}\n`);
}
if (checkOnly) {
  const lines = [
    ...(previous === null ? [`${relative(repository, matrixPath).replaceAll("\\", "/")} is missing`] : []),
    ...(previous !== null && previous.pinned?.version !== version ? [`pinned version is ${previous.pinned?.version}, packages are ${version}`] : []),
    ...report.created.map(id => `upstream row ${id} is missing from the matrix`),
    ...report.retired.map(id => `row ${id} is no longer presented upstream and is not retired`),
    ...report.restored.map(id => `row ${id} is presented upstream again and cannot stay retired`),
  ];
  if (lines.length > 0) {
    for (const line of lines) console.error(`feature matrix drift: ${line}`);
    process.exitCode = 1;
  } else {
    console.log(`Pi feature adoption matrix is current (${matrix.rows.length} rows)`);
  }
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(matrix, null, 2)}\n`);
  console.log(`Wrote ${relative(repository, outputPath).replaceAll("\\", "/")} (${matrix.rows.length} rows; ${report.created.length} created, ${report.retired.length} retired)`);
}

/** Upstream rows for one installation: manifests from the baseline, settings and changelog from the packages. */
export async function collectUpstreamRows({ packagesRoot, baselinePath, changelogSince }) {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const changelog = await readFile(join(packagesRoot, "@earendil-works", "pi-coding-agent", "CHANGELOG.md"), "utf8");
  return upstreamFeatureRows({
    manifests: baseline.manifests,
    presentedSettings: extractPiSettingsMetadata(packagesRoot).presented,
    changelog,
    changelogSince,
  });
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}
