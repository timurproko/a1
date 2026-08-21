import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());

export async function createValidationInventory(repository = root) {
  const [manifest, baseline, releaseSource, previewSource, exactEntrySource, packageSurfaceSource] = await Promise.all([
    readJson(resolve(repository, "package.json")),
    readJson(resolve(repository, "config", "validation-baseline.json")),
    readFile(resolve(repository, "scripts", "run-release-gates.mjs"), "utf8"),
    readFile(resolve(repository, ".github", "workflows", "publish-next.yml"), "utf8"),
    readFile(resolve(repository, "test", "features", "launch", "exact-pi-entry.integration.test.ts"), "utf8"),
    readFile(resolve(repository, "test", "foundation", "release", "package-surface.integration.test.ts"), "utf8"),
  ]);

  if (baseline.schema !== "a1-validation-baseline-v1") throw new Error("unsupported validation baseline schema");
  const missingPreviewCommands = baseline.previewCommands.filter(command => !previewSource.includes(command));
  if (missingPreviewCommands.length > 0) throw new Error(`preview workflow no longer contains baseline commands: ${missingPreviewCommands.join(", ")}`);

  const releaseGates = parseReleaseGates(releaseSource);
  const releaseGateIds = new Set(releaseGates.map(gate => gate.id));
  for (const duplicate of baseline.knownDuplicateContracts) {
    if (!releaseGateIds.has(duplicate.repeatedByReleaseGate)) throw new Error(`baseline duplicate references missing release gate: ${duplicate.repeatedByReleaseGate}`);
  }

  const buildTriggers = [
    { id: "root-prepare", present: manifest.scripts?.prepare === "npm run build", source: "package.json#scripts.prepare" },
    { id: "engine-conformance", present: manifest.scripts?.["report:pi-engine-conformance"]?.includes("npm run build") === true, source: "package.json#scripts.report:pi-engine-conformance" },
    { id: "exact-entry", present: exactEntrySource.includes("tsconfig.build.json"), source: "test/features/launch/exact-pi-entry.integration.test.ts" },
    { id: "package-surface", present: packageSurfaceSource.includes("tsconfig.build.json"), source: "test/foundation/release/package-surface.integration.test.ts" },
    { id: "preview-pack", present: /Pack and verify accepted bytes[\s\S]*?npm run build/.test(previewSource), source: ".github/workflows/publish-next.yml" },
  ];
  const missingBuildTriggers = buildTriggers.filter(trigger => !trigger.present);
  if (missingBuildTriggers.length > 0) throw new Error(`baseline build trigger changed: ${missingBuildTriggers.map(trigger => trigger.id).join(", ")}`);

  return {
    schema: "a1-validation-inventory-v1",
    generatedAt: new Date().toISOString(),
    baseline: baseline.source,
    observations: baseline.observations,
    packageScripts: Object.fromEntries(Object.entries(manifest.scripts ?? {}).filter(([name]) => /^(check|test|build|prepare|report:pi-engine)/.test(name))),
    previewCommands: baseline.previewCommands,
    releaseGates,
    duplicateContracts: baseline.knownDuplicateContracts,
    buildTriggers: buildTriggers.map(({ id, source }) => ({ id, source })),
  };
}

export function parseReleaseGates(source) {
  const gates = [];
  const pattern = /\{ id: "([^"]+)", executable: ([^,]+), arguments: (\[[^\]]+\]) \}/g;
  for (const match of source.matchAll(pattern)) {
    gates.push({ id: match[1], executable: match[2].trim(), arguments: JSON.parse(match[3]) });
  }
  if (gates.length === 0) throw new Error("no mandatory release gates found");
  return gates;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const inventory = await createValidationInventory();
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
    return;
  }
  const output = resolve("artifacts", "validation", "invocation-inventory.json");
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`);
  process.stdout.write(`Validation inventory: ${output}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
