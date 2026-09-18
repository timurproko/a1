import { dirname, posix } from "node:path";
import { PROHIBITED_STARTUP_ENTRIES } from "./startup-graph-policy.mjs";

export const PROJECT_OWNERS = Object.freeze({
  "product-identity": Object.freeze({ id: "product-identity", layer: "foundation", sourceRoot: "src", testRoot: "test/product-identity", publicEntry: "src/product-identity.ts", mayImport: Object.freeze([]) }),
  cli: owner("cli", "entry", "src/cli", "test/cli", ["launch", "release", "agent-engine-contracts"]),
  composition: owner("composition", "entry", "src/composition", "test/composition", ["agent-engine-contracts", "presentation-contracts", "owned-ui-contracts", "owned-ui-settings", "lifecycle", "pi-engine-adapter", "pi-component-adapter", "pi-tui-runtime-adapter", "session-shell", "ui-apps", "ui-components", "owned-ui", "prompt-history", "prompt-suggestions", "launch"]),
  "session-shell": owner("session-shell", "app", "src/app/session-shell", "test/app/session-shell", [
    "owned-ui-contracts", "agent-engine-contracts", "presentation-contracts", "ui-components", "ui-apps", "owned-ui-settings",
    "pi-engine-adapter", "pi-component-adapter", "pi-tui-runtime-adapter", "terminal-cleanup", "owned-ui", "prompt-history", "prompt-suggestions", "launch",
  ]),
  launch: owner("launch", "feature", "src/features/launch", "test/features/launch", ["lifecycle"]),
  "owned-ui": owner("owned-ui", "feature", "src/features/owned-ui", "test/features/owned-ui", [
    "owned-ui-contracts", "owned-ui-settings", "ui-components", "ui-apps", "agent-engine-contracts", "presentation-contracts", "startup", "terminal-cleanup",
  ]),
  "prompt-suggestions": owner("prompt-suggestions", "feature", "src/features/prompt-suggestions", "test/features/prompt-suggestions", ["owned-ui-contracts"]),
  "prompt-history": owner("prompt-history", "feature", "src/features/prompt-history", "test/features/prompt-history", ["owned-ui-contracts"]),
  "terminal-cleanup": owner("terminal-cleanup", "foundation", "src/foundation/terminal-cleanup", "test/foundation/terminal-cleanup", []),
  "launch-context": owner("launch-context", "foundation", "src/foundation/launch-context", "test/foundation/launch-context", []),
  startup: owner("startup", "foundation", "src/foundation/startup", "test/foundation/startup", ["launch-context"]),
  lifecycle: owner("lifecycle", "foundation", "src/foundation/lifecycle", "test/foundation/lifecycle", []),
  "process-containment": owner("process-containment", "foundation", "src/foundation/process-containment", "test/foundation/process-containment", ["lifecycle"]),
  "launch-guardian": owner("launch-guardian", "foundation", "src/foundation/launch-guardian", "test/foundation/launch-guardian", ["lifecycle", "process-containment", "protocol", "supervision", "startup", "launch-context"]),
  protocol: owner("protocol", "foundation", "src/foundation/protocol", "test/foundation/protocol", ["lifecycle"]),
  release: owner("release", "foundation", "src/foundation/release", "test/foundation/release", ["lifecycle", "protocol", "startup", "terminal-cleanup", "launch-context"]),
  storage: owner("storage", "foundation", "src/foundation/storage", "test/foundation/storage", ["lifecycle"]),
  "owned-ui-contracts": owner("owned-ui-contracts", "foundation", "src/contracts/owned-ui", "test/contracts/owned-ui", []),
  "ui-components": owner("ui-components", "foundation", "src/ui/components", "test/ui/components", []),
  "ui-apps": owner("ui-apps", "foundation", "src/ui/apps", "test/ui/apps", ["ui-components"]),
  "owned-ui-settings": owner("owned-ui-settings", "foundation", "src/ui/settings", "test/ui/settings", ["agent-engine-contracts", "owned-ui-contracts"]),
  "agent-engine-contracts": owner("agent-engine-contracts", "foundation", "src/contracts/agent-engine", "test/contracts/agent-engine", []),
  "presentation-contracts": owner("presentation-contracts", "foundation", "src/contracts/presentation", "test/contracts/presentation", []),
  "pi-engine-adapter": owner("pi-engine-adapter", "foundation", "src/integrations/pi/engine", "test/integrations/pi/engine", ["owned-ui-contracts", "agent-engine-contracts", "startup"]),
  "pi-component-adapter": owner("pi-component-adapter", "foundation", "src/integrations/pi/components", "test/integrations/pi/components", ["owned-ui-contracts", "presentation-contracts"]),
  "pi-tui-runtime-adapter": owner("pi-tui-runtime-adapter", "foundation", "src/integrations/pi/tui-runtime", "test/integrations/pi/tui-runtime", ["presentation-contracts", "terminal-cleanup"]),
  supervision: owner("supervision", "foundation", "src/foundation/supervision", "test/foundation/supervision", ["lifecycle", "protocol", "release", "storage", "launch-context"]),
});

export const TEST_OWNERS = Object.freeze({
  ...Object.fromEntries(Object.values(PROJECT_OWNERS).map(value => [value.id, value.testRoot])),
  "repository-governance": "test/repository-governance",
});

export function inspectProjectOwnerLayout(paths) {
  const files = new Set(paths.map(normalize));
  const errors = [];
  for (const owner of Object.values(PROJECT_OWNERS)) {
    if (![...files].some(path => path.startsWith(`${owner.sourceRoot}/`))) {
      errors.push(`${owner.id}: declared source root has no files (${owner.sourceRoot})`);
    }
    if (!files.has(owner.publicEntry)) {
      errors.push(`${owner.id}: declared public entry is missing (${owner.publicEntry})`);
    }
    if (![...files].some(path => path.startsWith(`${owner.testRoot}/`))) {
      errors.push(`${owner.id}: declared test root has no files (${owner.testRoot})`);
    }
  }
  return errors;
}

/**
 * Only the composition root may reach past a provider's public entry. The one other case is a module on the eager
 * startup path importing a leaf of a provider whose public entry is a prohibited startup entry: loading that barrel
 * would pull the provider's whole graph into startup, so the leaf import is the lean choice, not a shortcut.
 */
const DEEP_IMPORT_OWNER = "composition";

export function inspectProjectStructureImports(files, startupModules = new Set()) {
  const errors = [];
  for (const [rawPath, source] of Object.entries(files)) {
    const path = normalize(rawPath);
    const consumer = projectOwnerForPath(path);
    if (!consumer) continue;
    if (path === consumer.publicEntry && /^export \* from /m.test(source)) {
      errors.push(`${path}: public entry must list its named exports rather than re-export a whole module`);
    }
    for (const record of importRecords(source)) {
      const specifier = record.specifier;
      if (!specifier.startsWith(".")) continue;
      const targetPath = resolveTypeScriptImport(path, specifier);
      const provider = projectOwnerForPath(targetPath);
      if (!provider) {
        errors.push(`${path}: relative import '${specifier}' resolves outside a declared production owner (${targetPath})`);
        continue;
      }
      if (provider.id === consumer.id) continue;
      const sharedPiStartupBoundary = targetPath === "src/integrations/pi/startup-public.ts"
        && (consumer.id === "pi-engine-adapter" || consumer.id === "pi-component-adapter");
      if (!sharedPiStartupBoundary && provider.id !== "product-identity" && !consumer.mayImport.includes(provider.id)) {
        errors.push(`${path}: ${consumer.id} may not import ${provider.id} (${specifier})`);
        continue;
      }
      const startupLeaf = startupModules.has(path) && PROHIBITED_STARTUP_ENTRIES.has(provider.publicEntry);
      if (!sharedPiStartupBoundary && targetPath !== provider.publicEntry && consumer.id !== DEEP_IMPORT_OWNER && !startupLeaf) {
        errors.push(`${path}: cross-owner import '${specifier}' must use ${provider.publicEntry}`);
      }
    }
  }
  return errors;
}

export function inspectPiFeatureBoundaryImports(files) {
  const errors = [];
  for (const [rawPath, source] of Object.entries(files)) {
    const path = normalize(rawPath);
    if (!path.startsWith("src/features/")) continue;
    for (const record of importRecords(source)) {
      const imported = record.clause ?? "";
      if (/^@earendil-works\/pi-/.test(record.specifier)) {
        errors.push(`${path}: feature may not import Pi package '${record.specifier}'; inject a vendor-neutral A1 port`);
      } else if (/(?:integrations\/pi\/(?:engine|components|tui-runtime)|app\/session-shell)\//.test(record.specifier)) {
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

/**
 * The three layer boundaries that hold regardless of the owner DAG: contracts import nothing, vendor-neutral UI
 * components import only contracts, and only the Pi adapters (and the shipped `bin/` entries, checked elsewhere)
 * import the pinned Pi packages.
 */
export function inspectLayerBoundaries(files) {
  const errors = [];
  for (const [rawPath, source] of Object.entries(files)) {
    const path = normalize(rawPath);
    if (!path.startsWith("src/")) continue;
    const consumer = projectOwnerForPath(path);
    for (const record of importRecords(source)) {
      const specifier = record.specifier;
      const relativeTarget = specifier.startsWith(".") ? resolveTypeScriptImport(path, specifier) : null;
      const provider = relativeTarget === null ? null : projectOwnerForPath(relativeTarget);
      const withinOwner = consumer !== null && provider !== null && provider.id === consumer.id;
      if (path.startsWith("src/contracts/") && !withinOwner) {
        errors.push(`${path}: contracts import nothing ('${specifier}')`);
      } else if (path.startsWith("src/ui/components/") && !withinOwner && !(relativeTarget !== null && /^src\/contracts\/[a-z-]+\/index\.ts$/.test(relativeTarget))) {
        errors.push(`${path}: ui/components import only contracts ('${specifier}')`);
      } else if (/^@earendil-works\//.test(specifier) && !path.startsWith("src/integrations/pi/")) {
        errors.push(`${path}: only the Pi adapters import '${specifier}'`);
      }
    }
  }
  return errors;
}

export function projectOwnerForPath(path) {
  const normalized = normalize(path);
  if (normalized === "src/product-identity.ts" || normalized === "src/product-identity.json") return PROJECT_OWNERS["product-identity"];
  if (normalized === "src/integrations/pi/startup-public.ts") return PROJECT_OWNERS["pi-engine-adapter"];
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

function resolveTypeScriptImport(importer, specifier) {
  const resolved = normalize(posix.normalize(posix.join(dirname(importer), specifier)));
  if (resolved.endsWith(".js")) return `${resolved.slice(0, -3)}.ts`;
  if (resolved.endsWith(".mjs")) return `${resolved.slice(0, -4)}.mts`;
  return resolved;
}

function normalize(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
