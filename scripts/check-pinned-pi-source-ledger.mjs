import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPiCompatibilityAuthority } from "./pi-compatibility-authority.mjs";

const repository = fileURLToPath(new URL("..", import.meta.url));
const identity = JSON.parse(await readFile(join(repository, "src", "product-identity.json"), "utf8"));
const ledgerPath = resolve(process.env[identity.environment.piSourceLedgerPath] ?? join(
  repository,
  "evidence",
  "owned-pi-ui-foundation",
  "pinned-pi-source-port-ledger.json",
));
const sourceRoot = resolve(process.env[identity.environment.piSourceScanRoot] ?? join(repository, "src"));
const portRoot = resolve(process.env[identity.environment.piPortRoot] ?? join(repository, "src", "foundation", "pi-component-adapter", "upstream"));
const expectedCommit = "914cf1472e715297caa30db4b9535d534a9eb718";
const allowedClassifications = new Set(["public-reuse", "owned-source-port", "host-adapter"]);
const completedStatusesByClassification = new Map([
  ["public-reuse", new Set(["available-through-pinned-package"])],
  ["owned-source-port", new Set(["ported", "source-synchronized-port", "owned-port-present"])],
  ["host-adapter", new Set(["adapter-present-conformance-passed", "pinned-cli-only-inventory-mapped"])],
]);
const adjacentCodingAgentMaps = [
  "cli/startup-ui.js.map",
  "core/agent-session.js.map",
  "core/agent-session-runtime.js.map",
  "core/agent-session-services.js.map",
  "core/bash-executor.js.map",
  "core/extensions/runner.js.map",
  "core/extensions/types.js.map",
  "core/footer-data-provider.js.map",
  "core/keybindings.js.map",
  "core/model-runtime.js.map",
  "core/prompt-templates.js.map",
  "core/resource-loader.js.map",
  "core/sdk.js.map",
  "core/session-manager.js.map",
  "core/settings-manager.js.map",
  "core/skills.js.map",
  "core/slash-commands.js.map",
  "utils/clipboard.js.map",
];
const interactiveAssets = [
  "modes/interactive/assets/clankolas.png",
  "modes/interactive/theme/dark.json",
  "modes/interactive/theme/light.json",
  "modes/interactive/theme/theme-schema.json",
];
const packageAuthorities = [
  {
    name: "@earendil-works/pi-coding-agent",
    sourceRoot: "packages/coding-agent",
    packageRoot: join(repository, "node_modules", "@earendil-works", "pi-coding-agent"),
  },
  {
    name: "@earendil-works/pi-tui",
    sourceRoot: "packages/tui",
    packageRoot: join(repository, "node_modules", "@earendil-works", "pi-tui"),
  },
];

try {
  const report = await validateLedger();
  process.stdout.write(`Pinned Pi source ledger OK: ${report.records} records, ${report.behaviors} behaviors\n`);
} catch (error) {
  process.stderr.write(`Pinned Pi source ledger check failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

async function validateLedger() {
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  const compatibilityAuthority = await readPiCompatibilityAuthority(repository);
  requiredString(ledger.schema, "ledger schema");
  if (ledger.schema !== identity.evidence.piSourceLedgerSchema) fail("unsupported ledger schema");
  if (ledger.change !== "build-owned-pi-ui-foundation" || ledger.task !== "7.2") fail("ledger change/task identity is stale");
  if (ledger.upstream?.repository !== "https://github.com/earendil-works/pi.git") fail("upstream repository identity is stale");
  if (ledger.upstream?.commit !== expectedCommit) fail("upstream commit identity is stale");
  if (ledger.upstream?.license !== "MIT") fail("upstream license must be MIT");
  if (!Array.isArray(ledger.records)) fail("ledger records collection is missing");

  await validatePackages(ledger.upstream.packages, compatibilityAuthority);
  const expected = await discoverPinnedAuthorities();
  const actual = new Map();
  for (const [index, record] of ledger.records.entries()) {
    validateRecord(record, index);
    const key = authorityKey(record.package, record.upstreamPath);
    if (actual.has(key)) fail(`duplicate ledger source unit: ${key}`);
    actual.set(key, record);
  }
  for (const [key, authority] of expected) {
    const record = actual.get(key);
    if (!record) fail(`missing pinned source unit: ${key}`);
    if (record.kind !== authority.kind) fail(`stale source kind: ${key}`);
    if (record.sourceMap !== authority.sourceMap) fail(`stale source-map path: ${key}`);
    if (record.sha256 !== authority.sha256) fail(`stale source hash: ${key}`);
    if (authority.kind === "source" && record.lines !== authority.lines) fail(`stale source line count: ${key}`);
    if (authority.kind === "asset" && record.bytes !== authority.bytes) fail(`stale asset byte count: ${key}`);
  }
  for (const key of actual.keys()) if (!expected.has(key)) fail(`ledger contains an unknown or stale source unit: ${key}`);
  await validateTestLinks(ledger.records);

  const baseline = JSON.parse(await readFile(resolve(repository, ledger.scope?.behaviorAuthority ?? "missing"), "utf8"));
  const expectedBehaviors = new Set((baseline.behaviorInventory ?? []).map(value => value.id));
  const coveredBehaviors = new Set(ledger.records.flatMap(record => record.behaviorIds));
  for (const behavior of expectedBehaviors) if (!coveredBehaviors.has(behavior)) fail(`unmapped pinned behavior: ${behavior}`);
  for (const behavior of coveredBehaviors) if (!expectedBehaviors.has(behavior)) fail(`unknown or stale behavior mapping: ${behavior}`);
  if (!Array.isArray(ledger.summary?.unmappedBehaviorIds) || ledger.summary.unmappedBehaviorIds.length !== 0) {
    fail("ledger summary reports unmapped behaviors");
  }
  if (ledger.summary.modules !== expected.size || ledger.summary.coveredBehaviorIds !== coveredBehaviors.size) {
    fail("ledger summary is stale");
  }

  await validatePortDestinations(ledger.records);
  await rejectDeepPiImports(sourceRoot);
  return { records: ledger.records.length, behaviors: coveredBehaviors.size };
}

async function validatePackages(packages, compatibilityAuthority) {
  if (!Array.isArray(packages) || packages.length !== packageAuthorities.length) fail("pinned package identities are incomplete");
  for (const authority of packageAuthorities) {
    const record = packages.find(value => value?.name === authority.name);
    const selected = compatibilityAuthority.packages.find(value => value.name === authority.name);
    const manifest = JSON.parse(await readFile(join(authority.packageRoot, "package.json"), "utf8"));
    if (!record || !selected || record.version !== selected.version || record.integrity !== selected.integrity) {
      fail(`pinned package identity is stale: ${authority.name}`);
    }
    if (manifest.name !== authority.name || manifest.version !== record.version || manifest.license !== "MIT") {
      fail(`installed package identity or MIT license differs: ${authority.name}`);
    }
  }
}

function validateRecord(record, index) {
  const label = `ledger record ${index}`;
  for (const field of ["id", "kind", "scope", "package", "upstreamPath", "sha256", "classification", "localDestination", "implementationStatus", "attribution", "modifications"]) {
    requiredString(record?.[field], `${label}.${field}`);
  }
  if (!packageAuthorities.some(authority => authority.name === record.package)) fail(`${label}.package is unknown`);
  if (!allowedClassifications.has(record.classification)) fail(`${label}.classification is unknown`);
  if (!completedStatusesByClassification.get(record.classification)?.has(record.implementationStatus)) {
    fail(`${label}.implementationStatus is unresolved or incompatible with ${record.classification}`);
  }
  if (!/^src\/foundation\/(?:pi-component-adapter|pi-engine-adapter|pi-tui-runtime-adapter)\//.test(record.localDestination)
    || record.localDestination.includes("..") || isAbsolute(record.localDestination)) {
    fail(`${label}.localDestination escapes the approved adapter roots`);
  }
  if (record.classification === "owned-source-port" && !record.localDestination.startsWith("src/foundation/pi-component-adapter/upstream/")) {
    fail(`${label}.owned source port has no mirrored local destination`);
  }
  if (!/MIT/.test(record.attribution) || !/repository/.test(record.attribution) || !/commit/.test(record.attribution)) {
    fail(`${label}.attribution is incomplete`);
  }
  if (!Array.isArray(record.tests) || record.tests.length === 0 || record.tests.some(path => typeof path !== "string" || !path.startsWith("test/"))) {
    fail(`${label}.tests are missing or invalid`);
  }
  if (!Array.isArray(record.acceptanceTasks) || record.acceptanceTasks.length === 0 || record.acceptanceTasks.some(task => !/^7\.\d+$/.test(task))) {
    fail(`${label}.acceptanceTasks are missing or invalid`);
  }
  if (!Array.isArray(record.behaviorCategories) || record.behaviorCategories.length === 0
    || !Array.isArray(record.behaviorIds) || record.behaviorIds.length === 0) {
    fail(`${label}.behavior mappings are missing`);
  }
  if (!Array.isArray(record.approvedDeviations)) fail(`${label}.approvedDeviations must be an array`);
  for (const [deviationIndex, deviation] of record.approvedDeviations.entries()) {
    if (!deviation || typeof deviation !== "object" || Array.isArray(deviation)) fail(`${label}.approvedDeviations[${deviationIndex}] is undocumented`);
    for (const field of ["id", "reason", "upstreamBehavior", "acceptanceTest"]) {
      requiredString(deviation[field], `${label}.approvedDeviations[${deviationIndex}].${field}`);
    }
  }
}

async function validateTestLinks(records) {
  for (const record of records) {
    for (const test of record.tests) {
      if (!await pathExists(resolve(repository, test))) fail(`linked acceptance test is missing: ${record.id}: ${test}`);
    }
    for (const deviation of record.approvedDeviations) {
      if (!await pathExists(resolve(repository, deviation.acceptanceTest))) {
        fail(`linked deviation test is missing: ${record.id}: ${deviation.acceptanceTest}`);
      }
    }
  }
}

async function validatePortDestinations(records) {
  const ownedRecords = records.filter(record => record.classification === "owned-source-port");
  const mapped = new Map(ownedRecords.map(record => [resolve(repository, record.localDestination), record]));
  for (const path of await filesUnderIfPresent(portRoot)) {
    if (!mapped.has(path)) fail(`undocumented owned source file: ${relative(repository, path).replaceAll("\\", "/")}`);
  }
  for (const [path, record] of mapped) {
    if (!await pathExists(path)) fail(`mapped owned source destination is missing: ${record.id}`);
    requiredString(record.localSha256, `${record.id}.localSha256`);
    const localHash = createHash("sha256").update(await readFile(path)).digest("hex");
    if (record.localSha256 !== localHash) fail(`mapped owned source destination hash is stale: ${record.id}`);
  }
  for (const record of records.filter(value => value.classification !== "owned-source-port")) {
    if (!await pathExists(resolve(repository, record.localDestination))) fail(`adapter destination is missing: ${record.id}`);
  }
}

async function rejectDeepPiImports(root) {
  for (const path of await filesUnderIfPresent(root)) {
    if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
    const source = await readFile(path, "utf8");
    for (const match of source.matchAll(/(?:from\s+|import\s*\()(["'])(@earendil-works\/(?:pi-coding-agent|pi-tui)[^"']*)\1/g)) {
      if (match[2] !== "@earendil-works/pi-coding-agent" && match[2] !== "@earendil-works/pi-tui") {
        fail(`forbidden deep Pi import in ${relative(repository, path).replaceAll("\\", "/")}: ${match[2]}`);
      }
    }
  }
}

async function discoverPinnedAuthorities() {
  const expected = new Map();
  const coding = packageAuthorities[0];
  const tui = packageAuthorities[1];
  for (const path of await sourceMapsUnder(join(coding.packageRoot, "dist", "modes", "interactive"))) {
    await addSourceAuthority(expected, coding, path);
  }
  for (const path of adjacentCodingAgentMaps) await addSourceAuthority(expected, coding, join(coding.packageRoot, "dist", path));
  for (const path of await sourceMapsUnder(join(tui.packageRoot, "dist"))) await addSourceAuthority(expected, tui, path);
  for (const distRelative of interactiveAssets) {
    const path = join(coding.packageRoot, "dist", distRelative);
    const content = await readFile(path);
    const upstreamPath = `${coding.sourceRoot}/${distRelative.replace(/^modes\/interactive\//, "src/modes/interactive/")}`;
    expected.set(authorityKey(coding.name, upstreamPath), {
      kind: "asset",
      sourceMap: null,
      bytes: content.byteLength,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  return expected;
}

async function addSourceAuthority(expected, pkg, sourceMapPath) {
  const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8"));
  if (sourceMap.sources?.length !== 1 || sourceMap.sourcesContent?.length !== 1) fail(`invalid pinned source map: ${sourceMapPath}`);
  const sourceRelative = normalizeSourcePath(sourceMap.sources[0]);
  const upstreamPath = `${pkg.sourceRoot}/${sourceRelative}`;
  const content = sourceMap.sourcesContent[0].replaceAll("\r\n", "\n");
  expected.set(authorityKey(pkg.name, upstreamPath), {
    kind: "source",
    sourceMap: relative(join(pkg.packageRoot, "dist"), sourceMapPath).replaceAll("\\", "/"),
    lines: content.split("\n").length,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}

async function sourceMapsUnder(root) {
  return (await filesUnderIfPresent(root)).filter(path => path.endsWith(".js.map")).sort();
}

async function filesUnderIfPresent(root) {
  if (!await pathExists(root)) return [];
  const values = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else values.push(resolve(path));
    }
  }
  await visit(root);
  return values;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeSourcePath(source) {
  const normalized = source.replaceAll("\\", "/");
  const index = normalized.lastIndexOf("src/");
  if (index < 0) fail(`source map has no source root: ${source}`);
  return normalized.slice(index);
}

function authorityKey(packageName, upstreamPath) {
  return `${packageName}:${upstreamPath}`;
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.length === 0) fail(`required field is missing: ${field}`);
}

function fail(message) {
  throw new Error(message);
}
