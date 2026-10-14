import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const identity = JSON.parse(await readFile(resolve("src/product-identity.json"), "utf8"));
const evidenceArgument = process.argv.indexOf("--evidence");
const evidencePath = resolve(evidenceArgument >= 0 ? process.argv[evidenceArgument + 1] : "config/terminal-host-provenance.json");
const errors = [];
let value;
try {
  value = JSON.parse(await readFile(evidencePath, "utf8"));
} catch (error) {
  console.error(`Terminal host provenance evidence is unreadable: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (value?.schema !== identity.evidence.terminalProvenanceSchema) errors.push(`schema must be ${identity.evidence.terminalProvenanceSchema}`);
if (value?.change !== "resident-tabs-contracts") errors.push("change identity is missing or invalid");
if (value?.hostMode !== "console-inside-existing-terminal") errors.push("host mode must remain console-inside-existing-terminal");
if (value?.desktopApplicationRequired !== false) errors.push("desktop application must not be required");
if (!Array.isArray(value?.sources) || value.sources.length !== 10) errors.push("exactly ten component records are required");

const expected = {
  "libghostty-vt": { commit: "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3", licenseSha256: "3129de97bc7769d683e52ce02cb4eaecd2b0aab144b09d6325a1b135bdc87cc0" },
  "portable-pty": { version: "0.9.0", licenseSha256: "c06f48b2acbbb4bb88345225c6d85264773528fe9fc99241cd255a7e32be632e" },
  crossterm: { version: "0.29.0", registryChecksum: "d8b9f2e4c67f833b660cdb0a3523065869fb35570177239812ed4c905aeff87b", license: "MIT" },
  "rmp-serde": { version: "1.3.1", registryChecksum: "72f81bee8c8ef9b577d1681a70ebbc962c232461e397b22c208c43c04b67a155", license: "MIT" },
  napi: { version: "2.16.17", registryChecksum: "55740c4ae1d8696773c78fdafd5d0e5fe9bc9f1b071c7ba493ba5c413a9184f3", license: "MIT" },
  "napi-derive": { version: "2.16.13", registryChecksum: "7cbe2585d8ac223f7d34f13701434b9d5f4eb9c332cccce8dee57ea18ab8ab0c", license: "MIT" },
  sha2: { version: "0.10.9", registryChecksum: "a7507d819769d01a365ab707794a4084392c824f54a7a6a7862f8c3d0892b283", license: "MIT OR Apache-2.0" },
  rand: { version: "0.10.0", registryChecksum: "bc266eb313df6c5c09c1c7b1fbe2510961e5bcd3add930c1e31f7ed9da0feff8", license: "MIT OR Apache-2.0" },
  serde: { version: "1.0.228", registryChecksum: "9a8e94ea7f378bd32cbbd37198a4a91436180c5bb472411e48b5ec2e2124ae9e", license: "MIT OR Apache-2.0" },
  hex: { version: "0.4.3", registryChecksum: "7f24254aa9a54b5c858eaee2f5bccdb46aaf0e486a595ed5fd8f86ba55232a70", license: "MIT OR Apache-2.0" },
};
for (const [name, requirement] of Object.entries(expected)) {
  const source = value?.sources?.find?.(entry => entry.name === name);
  if (!source) {
    errors.push(`missing component record: ${name}`);
    continue;
  }
  if (source.license !== (requirement.license ?? "MIT")) errors.push(`${name}: license must be ${requirement.license ?? "MIT"}`);
  if (source.cleanSourceTree !== true) errors.push(`${name}: source tree must be clean`);
  if (requirement.commit && source.commit !== requirement.commit) errors.push(`${name}: commit does not match the pinned revision`);
  if (requirement.version && source.version !== requirement.version) errors.push(`${name}: version does not match the pinned component`);
  if (requirement.licenseSha256 && source.licenseSha256 !== requirement.licenseSha256) errors.push(`${name}: license hash does not match`);
  if (requirement.registryChecksum && source.registryChecksum !== requirement.registryChecksum) errors.push(`${name}: registry checksum does not match`);
}

for (const excluded of ["Ghostty desktop application", "Winghostty Win32 runtime", "OpenGL/WGL", "Metal", "GTK", "AppKit", "Herdr"]) {
  if (!value?.excludedStacks?.includes?.(excluded)) errors.push(`excluded stack is missing: ${excluded}`);
}
const prerequisites = value?.buildPrerequisites;
if (prerequisites?.language !== "Rust") errors.push("terminal host prerequisite language must be Rust");
if (prerequisites?.zig !== ">=0.15.2 <0.16") errors.push("libghostty-vt prerequisite Zig must be >=0.15.2 <0.16");
if (prerequisites?.cToolchain !== "Visual Studio 2022 Build Tools/MSVC on Windows") errors.push("Windows C toolchain must be Visual Studio 2022 Build Tools/MSVC");
if (prerequisites?.guiSdkRequired !== false) errors.push("GUI SDK must not be required");
if (prerequisites?.openGlRequired !== false) errors.push("OpenGL must not be required");
if (prerequisites?.win32WindowRuntimeRequired !== false) errors.push("Win32 window runtime must not be required");
if (prerequisites?.isolatedPhysicalWorkerRequired !== true) errors.push("isolated physical worker requirement is mandatory");
if (!Array.isArray(value?.artifactManifestRequirements) || value.artifactManifestRequirements.length < 18) errors.push("artifact manifest requirements are incomplete");
if (value?.checks?.license !== "passed") errors.push("license check must pass");
if (value?.checks?.provenance !== "passed") errors.push("provenance check must pass");
if (value?.checks?.sourceTreeHygiene !== "passed") errors.push("source-tree hygiene check must pass");
if (value?.checks?.binaryBuild !== "passed") errors.push("renamed native binary build must be verified");
if (value?.checks?.physicalAutomation !== "not-run") errors.push("physical automation must not run for provenance");
if (value?.passed !== true) errors.push("provenance evidence must be marked passed");

if (errors.length > 0) {
  console.error(`Terminal host provenance check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exit(1);
}
console.log(`Terminal host provenance OK: ${evidencePath}`);
