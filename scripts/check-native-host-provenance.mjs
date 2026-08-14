import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const evidenceArgument = process.argv.indexOf("--evidence");
const evidencePath = resolve(evidenceArgument >= 0 ? process.argv[evidenceArgument + 1] : "openspec/changes/evolve-bare-a1-into-multi-agent-workspace/evidence/native-host-provenance.json");
const errors = [];
let value;
try {
  value = JSON.parse(await readFile(evidencePath, "utf8"));
} catch (error) {
  console.error(`Native host provenance evidence is unreadable: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (value?.schema !== "addone-native-host-provenance-v1") errors.push("schema must be addone-native-host-provenance-v1");
if (value?.change !== "evolve-bare-a1-into-multi-agent-workspace") errors.push("change identity is missing or invalid");
if (!Array.isArray(value?.sources) || value.sources.length !== 2) errors.push("exactly two source pins are required");
for (const name of ["winghostty", "ghostty"]) {
  const source = value?.sources?.find?.(entry => entry.name === name);
  if (!source) {
    errors.push(`missing source pin: ${name}`);
    continue;
  }
  if (!/^[a-f0-9]{40}$/.test(source.commit ?? "")) errors.push(`${name}: commit must be a full SHA-1`);
  if (source.license !== "MIT") errors.push(`${name}: license must be MIT`);
  if (!/^[a-f0-9]{64}$/.test(source.licenseSha256 ?? "")) errors.push(`${name}: license hash must be SHA-256`);
  if (source.cleanSourceTree !== true) errors.push(`${name}: source tree must be clean`);
}
const components = value?.windowsProofComponents;
for (const field of ["retainedFromWinghostty", "referenceFromGhostty", "adaptedForAddOne", "forbiddenReplacements"]) {
  if (!Array.isArray(components?.[field]) || components[field].length === 0) errors.push(`windowsProofComponents.${field} must be non-empty`);
}
const prerequisites = value?.buildPrerequisites;
if (prerequisites?.zig !== ">=0.15.2 <0.16") errors.push("Zig prerequisite must be >=0.15.2 <0.16");
if (prerequisites?.referenceZig !== "0.15.2") errors.push("reference Zig must be 0.15.2");
if (prerequisites?.isolatedPhysicalWorkerRequired !== true) errors.push("isolated physical worker requirement is mandatory");
if (!Array.isArray(value?.artifactManifestRequirements) || value.artifactManifestRequirements.length < 15) errors.push("artifact manifest requirements are incomplete");
if (value?.checks?.license !== "passed") errors.push("license check must pass");
if (value?.checks?.provenance !== "passed") errors.push("provenance check must pass");
if (value?.checks?.sourceTreeHygiene !== "passed") errors.push("source-tree hygiene check must pass");
if (value?.checks?.binaryBuild !== "deferred-to-task-5.1") errors.push("binary build must remain deferred to task 5.1");
if (value?.checks?.physicalAutomation !== "not-run") errors.push("physical automation must not run for provenance");
if (value?.passed !== true) errors.push("provenance evidence must be marked passed");

if (errors.length > 0) {
  console.error(`Native host provenance check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exit(1);
}
console.log(`Native host provenance OK: ${evidencePath}`);
