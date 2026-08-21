import { dirname, posix } from "node:path";

export const PROJECT_OWNERS = Object.freeze({
  "product-identity": Object.freeze({ id: "product-identity", layer: "foundation", sourceRoot: "src", testRoot: "test/product-identity", publicEntry: "src/product-identity.ts", mayImport: Object.freeze([]) }),
  cli: owner("cli", "entry", "src/cli", "test/cli", ["launch", "release"]),
  composition: owner("composition", "entry", "src/composition", "test/composition", ["agent-engine-contracts", "presentation-contracts", "owned-ui-contracts", "owned-ui-settings", "lifecycle", "transparent-terminal", "pi-engine-adapter", "pi-component-adapter", "pi-tui-runtime-adapter", "pi-owned-ui-integration", "ui-apps", "ui-components", "owned-ui"]),
  launch: owner("launch", "feature", "src/features/launch", "test/features/launch", ["lifecycle", "transparent-terminal"]),
  workspace: owner("workspace", "feature", "src/features/workspace", "test/features/workspace", [
    "storage", "workspace-contracts", "structured-agent-runtime", "native-host-protocol", "agent-engine-contracts", "presentation-contracts",
  ]),
  "owned-ui": owner("owned-ui", "feature", "src/features/owned-ui", "test/features/owned-ui", [
    "owned-ui-contracts", "owned-ui-settings", "ui-components", "ui-apps", "agent-engine-contracts", "presentation-contracts",
  ]),
  lifecycle: owner("lifecycle", "foundation", "src/foundation/lifecycle", "test/foundation/lifecycle", []),
  protocol: owner("protocol", "foundation", "src/foundation/protocol", "test/foundation/protocol", ["lifecycle"]),
  release: owner("release", "foundation", "src/foundation/release", "test/foundation/release", ["lifecycle", "protocol"]),
  storage: owner("storage", "foundation", "src/foundation/storage", "test/foundation/storage", ["lifecycle", "workspace-contracts"]),
  "structured-agent-runtime": owner("structured-agent-runtime", "foundation", "src/foundation/structured-agent-runtime", "test/foundation/structured-agent-runtime", ["workspace-contracts"]),
  "native-host-protocol": owner("native-host-protocol", "foundation", "src/foundation/native-host-protocol", "test/foundation/native-host-protocol", ["workspace-contracts"]),
  "owned-ui-contracts": owner("owned-ui-contracts", "foundation", "src/foundation/owned-ui-contracts", "test/foundation/owned-ui-contracts", []),
  "ui-components": owner("ui-components", "foundation", "src/foundation/ui-components", "test/foundation/ui-components", []),
  "ui-apps": owner("ui-apps", "foundation", "src/foundation/ui-apps", "test/foundation/ui-apps", ["ui-components"]),
  "owned-ui-settings": owner("owned-ui-settings", "foundation", "src/foundation/owned-ui-settings", "test/foundation/owned-ui-settings", ["agent-engine-contracts", "owned-ui-contracts"]),
  "agent-engine-contracts": owner("agent-engine-contracts", "foundation", "src/foundation/agent-engine-contracts", "test/foundation/agent-engine-contracts", []),
  "presentation-contracts": owner("presentation-contracts", "foundation", "src/foundation/presentation-contracts", "test/foundation/presentation-contracts", []),
  "pi-engine-adapter": owner("pi-engine-adapter", "foundation", "src/foundation/pi-engine-adapter", "test/foundation/pi-engine-adapter", ["owned-ui-contracts", "agent-engine-contracts"]),
  "pi-component-adapter": owner("pi-component-adapter", "foundation", "src/foundation/pi-component-adapter", "test/foundation/pi-component-adapter", ["owned-ui-contracts", "presentation-contracts"]),
  "pi-tui-runtime-adapter": owner("pi-tui-runtime-adapter", "foundation", "src/foundation/pi-tui-runtime-adapter", "test/foundation/pi-tui-runtime-adapter", ["presentation-contracts"]),
  "pi-owned-ui-integration": owner("pi-owned-ui-integration", "foundation", "src/foundation/pi-owned-ui-integration", "test/foundation/pi-owned-ui-integration", ["owned-ui-contracts", "pi-engine-adapter", "pi-component-adapter", "pi-tui-runtime-adapter"]),
  supervision: owner("supervision", "foundation", "src/foundation/supervision", "test/foundation/supervision", ["lifecycle", "protocol", "release", "storage"]),
  "workspace-contracts": owner("workspace-contracts", "foundation", "src/foundation/workspace-contracts", "test/foundation/workspace-contracts", []),
  "transparent-terminal": owner(
    "transparent-terminal",
    "foundation",
    "src/foundation/transparent-terminal",
    "test/foundation/transparent-terminal",
    ["lifecycle", "protocol", "supervision"],
  ),
});

export const TEST_OWNERS = Object.freeze({
  ...Object.fromEntries(Object.values(PROJECT_OWNERS).map(value => [value.id, value.testRoot])),
  "repository-governance": "test/repository-governance",
});

export function inspectProjectStructureImports(files, approvedImports = []) {
  const approved = new Set(approvedImports.map(record => approvalKey(record.path, record.specifier, record.statement)));
  const errors = [];
  for (const [rawPath, source] of Object.entries(files)) {
    const path = normalize(rawPath);
    const consumer = projectOwnerForPath(path);
    if (!consumer) continue;
    for (const record of importRecords(source)) {
      const specifier = record.specifier;
      if (!specifier.startsWith(".")) continue;
      if (approved.has(approvalKey(path, specifier, normalizeStatement(record.statement)))) continue;
      const targetPath = resolveTypeScriptImport(path, specifier);
      const provider = projectOwnerForPath(targetPath);
      if (!provider) {
        errors.push(`${path}: relative import '${specifier}' resolves outside a declared production owner (${targetPath})`);
        continue;
      }
      if (provider.id === consumer.id) continue;
      if (provider.id !== "product-identity" && !consumer.mayImport.includes(provider.id)) {
        errors.push(`${path}: ${consumer.id} may not import ${provider.id} (${specifier})`);
        continue;
      }
      if (targetPath !== provider.publicEntry) {
        errors.push(`${path}: cross-owner import '${specifier}' must use ${provider.publicEntry}`);
      }
    }
  }
  return errors;
}

export function inspectPiFeatureBoundaryImports(files, approvedImports = []) {
  const approved = new Set(approvedImports.map(record => approvalKey(record.path, record.specifier, record.statement)));
  const errors = [];
  for (const [rawPath, source] of Object.entries(files)) {
    const path = normalize(rawPath);
    if (!path.startsWith("src/features/")) continue;
    for (const record of importRecords(source)) {
      const statement = normalizeStatement(record.statement);
      if (approved.has(approvalKey(path, record.specifier, statement))) continue;
      const imported = record.clause ?? "";
      if (/^@earendil-works\/pi-/.test(record.specifier)) {
        errors.push(`${path}: feature may not import Pi package '${record.specifier}'; inject a vendor-neutral A1 port`);
      } else if (/foundation\/pi-(?:(?:engine|component|tui-runtime)-adapter|owned-ui-integration)\//.test(record.specifier)) {
        errors.push(`${path}: feature may not import concrete Pi adapter '${record.specifier}'; inject a vendor-neutral A1 port`);
      } else if (/\b(?:create|render)Pi[A-Z][A-Za-z0-9_$]*\b/.test(imported)) {
        const factory = imported.match(/\b(?:create|render)Pi[A-Z][A-Za-z0-9_$]*\b/)?.[0];
        errors.push(`${path}: feature may not import Pi component factory '${factory}'; inject a vendor-neutral presentation port`);
      } else if (/\bPi[A-Z][A-Za-z0-9_$]*(?:Contract|Port|Adapter|Runtime|Session|Component|Factory)\b/.test(imported)) {
        const contract = imported.match(/\bPi[A-Z][A-Za-z0-9_$]*(?:Contract|Port|Adapter|Runtime|Session|Component|Factory)\b/)?.[0];
        errors.push(`${path}: feature may not import Pi-named contract '${contract}'; use a vendor-neutral A1-owned contract`);
      }
    }
  }
  return errors;
}

export function projectOwnerForPath(path) {
  const normalized = normalize(path);
  if (normalized === "src/product-identity.ts" || normalized === "src/product-identity.json") return PROJECT_OWNERS["product-identity"];
  return Object.values(PROJECT_OWNERS)
    .filter(value => value.id !== "product-identity")
    .find(value => normalized === value.sourceRoot || normalized.startsWith(`${value.sourceRoot}/`)) ?? null;
}

export function testOwnerForPath(path) {
  const normalized = normalize(path);
  return Object.entries(TEST_OWNERS).find(([, root]) => normalized === root || normalized.startsWith(`${root}/`))?.[0] ?? null;
}

function owner(id, layer, sourceRoot, testRoot, mayImport) {
  return Object.freeze({ id, layer, sourceRoot, testRoot, publicEntry: `${sourceRoot}/index.ts`, mayImport: Object.freeze(mayImport) });
}

function importRecords(source) {
  const records = [];
  for (const match of source.matchAll(/\bimport\s+(type\s+)?([^;]+?)\s+from\s+(["'])([^"']+)\3\s*;?/g)) {
    records.push({ clause: match[2], specifier: match[4], statement: match[0] });
  }
  for (const match of source.matchAll(/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g)) {
    records.push({ clause: null, specifier: match[2], statement: match[0] });
  }
  return records;
}

function approvalKey(path, specifier, statement) {
  return `${normalize(path)}\0${specifier}\0${normalizeStatement(statement)}`;
}

function normalizeStatement(statement) {
  return statement.replace(/\s+/g, " ").trim();
}

function resolveTypeScriptImport(importer, specifier) {
  const resolved = normalize(posix.normalize(posix.join(dirname(importer), specifier)));
  if (resolved.endsWith(".js")) return `${resolved.slice(0, -3)}.ts`;
  if (resolved.endsWith(".mjs")) return `${resolved.slice(0, -4)}.mts`;
  return resolved;
}

function normalize(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
