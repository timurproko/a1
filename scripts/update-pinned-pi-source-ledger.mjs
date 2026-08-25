import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("..", import.meta.url));
const identity = JSON.parse(await readFile(join(repository, "src", "product-identity.json"), "utf8"));
const baselineRoot = join(repository, "config", "baselines");
const outputPath = join(baselineRoot, "pinned-pi-source-port-ledger.json");
const previousLedger = await readFile(outputPath, "utf8").then(JSON.parse, () => ({ records: [] }));
const previousRecords = new Map((previousLedger.records ?? []).map(record => [record.id, record]));
const baseline = JSON.parse(await readFile(join(baselineRoot, "pinned-pi-interactive-baseline.json"), "utf8"));
const lockfile = JSON.parse(await readFile(join(repository, "package-lock.json"), "utf8"));

const packages = [
  {
    name: "@earendil-works/pi-coding-agent",
    sourceRoot: "packages/coding-agent",
    packageRoot: join(repository, "node_modules", "@earendil-works", "pi-coding-agent"),
    distRoot: join(repository, "node_modules", "@earendil-works", "pi-coding-agent", "dist"),
    lockKey: "node_modules/@earendil-works/pi-coding-agent",
  },
  {
    name: "@earendil-works/pi-tui",
    sourceRoot: "packages/tui",
    packageRoot: join(repository, "node_modules", "@earendil-works", "pi-tui"),
    distRoot: join(repository, "node_modules", "@earendil-works", "pi-tui", "dist"),
    lockKey: "node_modules/@earendil-works/pi-tui",
  },
];

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

const publicCodingAgentComponents = new Set([
  "armin.ts",
  "assistant-message.ts",
  "bash-execution.ts",
  "bordered-loader.ts",
  "branch-summary-message.ts",
  "compaction-summary-message.ts",
  "custom-editor.ts",
  "custom-message.ts",
  "diff.ts",
  "dynamic-border.ts",
  "extension-editor.ts",
  "extension-input.ts",
  "extension-selector.ts",
  "footer.ts",
  "index.ts",
  "keybinding-hints.ts",
  "login-dialog.ts",
  "model-selector.ts",
  "oauth-selector.ts",
  "scoped-models-selector.ts",
  "session-selector.ts",
  "settings-selector.ts",
  "show-images-selector.ts",
  "skill-invocation-message.ts",
  "theme-selector.ts",
  "thinking-selector.ts",
  "tool-execution.ts",
  "tree-selector.ts",
  "trust-selector.ts",
  "user-message-selector.ts",
  "user-message.ts",
  "visual-truncate.ts",
]);

const tuiHostModules = new Set([
  "native-modifiers.ts",
  "stdin-buffer.ts",
  "terminal-colors.ts",
  "terminal.ts",
  "tui-alt-screen.ts",
  "tui-main-screen.ts",
  "tui.ts",
]);

const behaviorByCategory = new Map();
for (const behavior of baseline.behaviorInventory) {
  const values = behaviorByCategory.get(behavior.category) ?? [];
  values.push(behavior.id);
  behaviorByCategory.set(behavior.category, values);
}

const records = [];
const codingAgent = packages[0];
const tui = packages[1];
for (const sourceMap of await sourceMapsUnder(join(codingAgent.distRoot, "modes", "interactive"))) {
  records.push(await sourceMapRecord(codingAgent, sourceMap, "interactive-tree"));
}
for (const sourceMap of adjacentCodingAgentMaps) {
  records.push(await sourceMapRecord(codingAgent, join(codingAgent.distRoot, sourceMap), "adjacent-authority"));
}
for (const sourceMap of await sourceMapsUnder(tui.distRoot)) {
  records.push(await sourceMapRecord(tui, sourceMap, "public-tui-package"));
}
for (const asset of [
  "modes/interactive/assets/clankolas.png",
  "modes/interactive/theme/dark.json",
  "modes/interactive/theme/light.json",
  "modes/interactive/theme/theme-schema.json",
]) {
  records.push(await assetRecord(codingAgent, asset));
}

records.sort((left, right) => left.package.localeCompare(right.package) || left.upstreamPath.localeCompare(right.upstreamPath));
const packageRecords = await Promise.all(packages.map(async pkg => {
  const locked = lockfile.packages[pkg.lockKey];
  const manifest = JSON.parse(await readFile(join(pkg.packageRoot, "package.json"), "utf8"));
  if (!locked || typeof locked.version !== "string" || typeof locked.integrity !== "string") {
    throw new Error(`missing pinned package identity: ${pkg.name}`);
  }
  if (manifest.name !== pkg.name || manifest.version !== locked.version || manifest.license !== "MIT") {
    throw new Error(`installed package identity or license differs from lockfile: ${pkg.name}`);
  }
  return { name: pkg.name, version: locked.version, integrity: locked.integrity };
}));

const classifications = Object.fromEntries(["public-api-reuse", "owned-presentation", "host-adaptation"].map(classification => [
  classification,
  records.filter(record => record.classification === classification).length,
]));
const coveredBehaviorIds = new Set(records.flatMap(record => record.behaviorIds));
const expectedBehaviorIds = baseline.behaviorInventory.map(behavior => behavior.id);
if (new Set(records.map(record => record.id)).size !== records.length) throw new Error("duplicate source ledger id");
if (new Set(records.map(record => `${record.package}:${record.upstreamPath}`)).size !== records.length) {
  throw new Error("duplicate source ledger package/path");
}
if (expectedBehaviorIds.some(id => !coveredBehaviorIds.has(id))) throw new Error("source ledger leaves behavior ids unmapped");
for (const record of records) {
  if (!record.localDestination || !record.attribution || !record.modifications || record.tests.length === 0 || record.acceptanceTasks.length === 0) {
    throw new Error(`incomplete source ledger record: ${record.id}`);
  }
  if (!Array.isArray(record.approvedDeviations)) throw new Error(`invalid deviation ledger: ${record.id}`);
}

const ledger = {
  schema: identity.evidence.piSourceLedgerSchema,
  change: "build-owned-pi-ui-foundation",
  task: "7.2",
  recordedAt: new Date().toISOString(),
  upstream: {
    repository: "https://github.com/earendil-works/pi.git",
    commit: "914cf1472e715297caa30db4b9535d534a9eb718",
    license: "MIT",
    packages: packageRecords,
  },
  scope: {
    included: [
      "Every TypeScript source represented by a JavaScript source map under @earendil-works/pi-coding-agent/dist/modes/interactive.",
      "Every TypeScript source represented by a JavaScript source map in the pinned @earendil-works/pi-tui package.",
      "Named adjacent coding-agent authorities for startup, public SDK sessions, resources, commands, keybindings, extensions, settings, models, sessions, skills, prompts, bash, footer data, and clipboard.",
      "Pinned interactive image, built-in theme, and theme-schema assets.",
    ],
    excluded: [
      "Provider transports, model implementations, tool filesystem operations, storage internals, and non-interactive modes that remain behind already-conformed public engine APIs.",
      "Declaration maps and generated JavaScript because their authoritative TypeScript source content is already hashed from JavaScript source maps.",
    ],
    behaviorAuthority: "config/baselines/pinned-pi-interactive-baseline.json",
  },
  summary: {
    modules: records.length,
    sourceModules: records.filter(record => record.kind === "source").length,
    assets: records.filter(record => record.kind === "asset").length,
    classifications,
    requiredBehaviorIds: expectedBehaviorIds.length,
    coveredBehaviorIds: coveredBehaviorIds.size,
    unmappedBehaviorIds: expectedBehaviorIds.filter(id => !coveredBehaviorIds.has(id)),
  },
  records,
};

await writeFile(outputPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`Wrote ${relative(repository, outputPath)} (${records.length} records)`);

async function sourceMapsUnder(root) {
  const values = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.name.endsWith(".js.map")) values.push(path);
    }
  }
  await visit(root);
  return values.sort();
}

async function sourceMapRecord(pkg, sourceMapPath, scope) {
  const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8"));
  if (sourceMap.sources?.length !== 1 || sourceMap.sourcesContent?.length !== 1) {
    throw new Error(`source map must contain exactly one source: ${sourceMapPath}`);
  }
  const content = sourceMap.sourcesContent[0].replaceAll("\r\n", "\n");
  const sourceRelative = normalizeSourcePath(sourceMap.sources[0]);
  const upstreamPath = `${pkg.sourceRoot}/${sourceRelative}`;
  const disposition = classify(pkg.name, upstreamPath);
  const categories = behaviorCategories(upstreamPath);
  const portedThemeUnit = upstreamPath === "packages/coding-agent/src/modes/interactive/theme/theme.ts"
    ? {
        localDestination: "src/integrations/pi/components/upstream/theme/theme.ts",
        modifications: "Source-synchronized theme port: retain pinned theme schema, variable/color resolution, built-in and custom loading, terminal detection, and layout defaults while constructing the public package-root Theme class.",
        approvedDeviations: [
          {
            id: "theme-public-api-boundary",
            reason: "Use public package-root Theme, initTheme, configuration-directory, TUI capability, markdown, selector, and syntax helpers instead of private module imports.",
            upstreamBehavior: "Pinned dark/light/custom color resolution, 256/truecolor selection, fallback, automatic terminal detection, and component styling remain acceptance-tested.",
            acceptanceTest: "test/foundation/pi-component-adapter/pinned-theme-parity.test.ts",
          },
          {
            id: "theme-owned-watcher-boundary",
            reason: "Mirror custom-theme reload with an A1-owned file watcher because the public API exposes no theme-change callback and private watcher imports are forbidden.",
            upstreamBehavior: "Debounced valid changes replace the active custom theme and notify rendering; invalid or temporarily missing files retain the last valid theme.",
            acceptanceTest: "test/foundation/pi-component-adapter/pinned-theme-parity.test.ts",
          },
        ],
      }
    : upstreamPath === "packages/coding-agent/src/modes/interactive/theme/theme-controller.ts"
      ? {
          localDestination: "src/integrations/pi/components/upstream/theme/theme-controller.ts",
          modifications: "Source-synchronized controller port: renamed owner class, injected dependency-free settings/runtime ports, remapped private theme helpers to the public-backed A1 theme adapter, and added explicit disposal.",
          approvedDeviations: [
            {
              id: "theme-controller-owned-boundaries",
              reason: "Replace private SettingsManager/theme-module coupling with public theme APIs and A1-owned runtime/settings ports.",
              upstreamBehavior: "Theme initialization, auto detection, preview, switching, render invalidation, and terminal color-scheme synchronization remain ordered as pinned.",
              acceptanceTest: "test/foundation/pi-component-adapter/pinned-theme-parity.test.ts",
            },
            {
              id: "theme-controller-explicit-disposal",
              reason: "A1 lifecycle ownership requires explicit listener disposal instead of relying on stock InteractiveMode teardown.",
              upstreamBehavior: "The terminal color-scheme listener and automatic notifications are released when the owned shell stops.",
              acceptanceTest: "test/foundation/pi-component-adapter/pinned-theme-parity.test.ts",
            },
          ],
        }
      : upstreamPath === "packages/coding-agent/src/modes/interactive/components/countdown-timer.ts"
        ? {
            localDestination: "src/integrations/pi/components/upstream/components/countdown-timer.ts",
            modifications: "Mechanical source port with ECMAScript private fields; imports remain on the public Pi TUI package root.",
            approvedDeviations: [{
              id: "countdown-owned-private-fields",
              reason: "Use language-level private fields in the A1-owned class without changing timer ordering or lifecycle.",
              upstreamBehavior: "Initial tick, one-second decrements, render requests, expiration callback, and disposal order match pinned Pi.",
              acceptanceTest: "test/foundation/pi-component-adapter/pinned-status-indicator-parity.test.ts",
            }],
          }
        : upstreamPath === "packages/coding-agent/src/modes/interactive/components/status-indicator.ts"
          ? {
              localDestination: "src/integrations/pi/components/upstream/components/status-indicator.ts",
              modifications: "Mechanical source port with public package-root keybinding, Loader, and owned theme/countdown imports plus ECMAScript private fields.",
              approvedDeviations: [{
                id: "status-indicator-public-boundaries",
                reason: "Remap private theme, countdown, extension option, and keybinding imports to A1-owned or public package-root equivalents.",
                upstreamBehavior: "Working, retry, compaction, branch-summary, idle, countdown, style, and disposal behavior match pinned Pi.",
                acceptanceTest: "test/foundation/pi-component-adapter/pinned-status-indicator-parity.test.ts",
              }],
            }
          : upstreamPath === "packages/coding-agent/src/core/keybindings.ts"
            ? {
                localDestination: "src/integrations/pi/components/upstream/adjacent/core/keybindings.ts",
                modifications: "Mechanical source port with Node import prefixes and public package-root A1 agent-directory resolution.",
                approvedDeviations: [{
                  id: "keybindings-public-config-boundary",
                  reason: "Resolve the agent configuration directory through the documented package-root API instead of a private config import.",
                  upstreamBehavior: "Complete pinned defaults, migrations, user overrides, conflict detection, matching, and effective-config behavior remain unchanged.",
                  acceptanceTest: "test/foundation/pi-component-adapter/pinned-editor-input-parity.test.ts",
                }],
              }
            : undefined;
  const reconciledUnit = reconciledSourceUnit(upstreamPath);
  const resolvedUnit = reconciledUnit ?? portedThemeUnit;
  const localDestination = resolvedUnit?.localDestination ?? disposition.localDestination;
  const classification = resolvedUnit?.classification ?? (portedThemeUnit === undefined ? disposition.classification : "owned-presentation");
  const implementationStatus = resolvedUnit?.implementationStatus ?? (portedThemeUnit === undefined ? disposition.implementationStatus : "source-synchronized-port");
  const modifications = resolvedUnit?.modifications ?? portedThemeUnit?.modifications ?? disposition.modifications;
  const localSha256 = classification === "owned-presentation"
    ? createHash("sha256").update(await readFile(join(repository, localDestination))).digest("hex")
    : undefined;
  const approvedDeviations = resolvedUnit?.approvedDeviations ?? portedThemeUnit?.approvedDeviations ?? [];
  const id = `${packageSlug(pkg.name)}:${sourceRelative.replace(/\.ts$/, "")}`;
  const record = {
    id,
    kind: "source",
    scope,
    package: pkg.name,
    upstreamPath,
    sourceMap: relative(pkg.distRoot, sourceMapPath).replaceAll("\\", "/"),
    lines: content.split("\n").length,
    sha256: createHash("sha256").update(content).digest("hex"),
    classification,
    localDestination,
    implementationStatus,
    attribution: "MIT; preserve upstream repository, commit, license, and local modifications when copied or adapted.",
    modifications,
    ...(localSha256 === undefined ? {} : { localSha256 }),
    approvedDeviations,
    behaviorCategories: categories,
    behaviorIds: categories.flatMap(category => behaviorByCategory.get(category) ?? []),
    acceptanceTasks: acceptanceTasks(upstreamPath, categories),
    tests: testTargets(upstreamPath, categories),
  };
  const previous = previousRecords.get(id);
  if (previous !== undefined) {
    const preservedFields = resolvedUnit === undefined
      ? ["classification", "localDestination", "implementationStatus", "modifications", "approvedDeviations", "acceptanceTasks", "tests"]
      : ["acceptanceTasks", "tests"];
    for (const field of preservedFields) {
      if (previous[field] !== undefined) record[field] = previous[field];
    }
    if (previous.localSha256 !== undefined && await fileExists(join(repository, record.localDestination))) {
      record.localSha256 = createHash("sha256").update(await readFile(join(repository, record.localDestination))).digest("hex");
    }
  }
  if (record.classification === "host-adaptation" && record.implementationStatus === "adapter-present-conformance-pending") {
    record.implementationStatus = "adapter-present-conformance-passed";
  }
  return record;
}

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function assetRecord(pkg, distRelative) {
  const path = join(pkg.distRoot, distRelative);
  const content = await readFile(path);
  const upstreamRelative = distRelative.replace(/^modes\/interactive\//, "src/modes/interactive/");
  const upstreamPath = `${pkg.sourceRoot}/${upstreamRelative}`;
  const categories = behaviorCategories(upstreamPath);
  const publicThemeAsset = /\/theme\/(?:dark|light|theme-schema)\.json$/.test(upstreamPath);
  const publicBundledAsset = publicThemeAsset || upstreamPath.endsWith("/assets/clankolas.png");
  const id = `${packageSlug(pkg.name)}:${upstreamRelative}`;
  const record = {
    id,
    kind: "asset",
    scope: "interactive-tree",
    package: pkg.name,
    upstreamPath,
    sourceMap: null,
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
    classification: publicBundledAsset ? "public-api-reuse" : "owned-presentation",
    localDestination: publicThemeAsset
      ? "src/integrations/pi/components/index.ts"
      : publicBundledAsset
        ? "src/integrations/pi/components/upstream/components/earendil-announcement.ts"
        : `src/integrations/pi/components/upstream/${upstreamRelative.replace(/^src\/modes\/interactive\//, "")}`,
    implementationStatus: publicBundledAsset ? "available-through-pinned-package" : "not-ported",
    attribution: "MIT; preserve upstream repository, commit, license, and local modifications when copied or adapted.",
    modifications: publicThemeAsset
      ? "None planned; resolve through pinned public theme APIs."
      : publicBundledAsset
        ? "Read the unchanged bundled asset through the public package directory boundary; do not copy, transform, or patch installed package content."
        : "Copy unchanged before any documented A1 asset transformation.",
    approvedDeviations: [],
    behaviorCategories: categories,
    behaviorIds: categories.flatMap(category => behaviorByCategory.get(category) ?? []),
    acceptanceTasks: acceptanceTasks(upstreamPath, categories),
    tests: testTargets(upstreamPath, categories),
  };
  const previous = previousRecords.get(id);
  if (previous !== undefined) {
    const preservedFields = upstreamPath.endsWith("/assets/clankolas.png")
      ? ["acceptanceTasks", "tests"]
      : ["classification", "localDestination", "implementationStatus", "modifications", "approvedDeviations", "acceptanceTasks", "tests"];
    for (const field of preservedFields) {
      if (previous[field] !== undefined) record[field] = previous[field];
    }
    if (previous.localSha256 !== undefined && await fileExists(join(repository, record.localDestination))) {
      record.localSha256 = createHash("sha256").update(await readFile(join(repository, record.localDestination))).digest("hex");
    }
  }
  return record;
}

function normalizeSourcePath(source) {
  const normalized = source.replaceAll("\\", "/");
  const index = normalized.lastIndexOf("src/");
  if (index < 0) throw new Error(`source map path has no src root: ${source}`);
  return normalized.slice(index);
}

function reconciledSourceUnit(upstreamPath) {
  const ownedPorts = new Map([
    ["packages/coding-agent/src/modes/interactive/components/custom-entry.ts", "custom-entry"],
    ["packages/coding-agent/src/modes/interactive/components/daxnuts.ts", "daxnuts"],
    ["packages/coding-agent/src/modes/interactive/components/earendil-announcement.ts", "earendil-announcement"],
    ["packages/coding-agent/src/modes/interactive/components/first-time-setup.ts", "first-time-setup"],
    ["packages/coding-agent/src/modes/interactive/components/markdown-transform.ts", "markdown-transform"],
    ["packages/coding-agent/src/modes/interactive/components/mermaid.ts", "mermaid"],
  ]);
  const ownedName = ownedPorts.get(upstreamPath);
  if (ownedName) {
    return {
      classification: "owned-presentation",
      localDestination: `src/integrations/pi/components/upstream/components/${ownedName}.ts`,
      implementationStatus: "source-synchronized-port",
      modifications: "Mechanical pinned source port with private imports remapped to public package-root types/APIs and A1-owned theme boundaries; behavior remains acceptance-tested.",
      approvedDeviations: [],
    };
  }
  if (upstreamPath === "packages/coding-agent/src/cli/startup-ui.ts") {
    return {
      classification: "host-adaptation",
      localDestination: "src/integrations/pi/components/shell-components.ts",
      implementationStatus: "adapter-present-conformance-passed",
      modifications: "Split startup UI authority across the A1 shell/component adapter while preserving pinned first-time setup, startup notices, resources, and preflight behavior without constructing the stock CLI root.",
      approvedDeviations: [],
    };
  }
  if (upstreamPath === "packages/coding-agent/src/core/slash-commands.ts") {
    return {
      classification: "host-adaptation",
      localDestination: "src/integrations/pi/engine/workflows.ts",
      implementationStatus: "adapter-present-conformance-passed",
      modifications: "Expose the pinned command manifest and dispatch categories through typed A1 workflow contracts; source-derived governance rejects omitted advertised or hidden routes.",
      approvedDeviations: [],
    };
  }
  if (upstreamPath === "packages/coding-agent/src/modes/interactive/components/config-selector.ts") {
    return {
      classification: "host-adaptation",
      localDestination: "src/integrations/pi/components/index.ts",
      implementationStatus: "pinned-cli-only-inventory-mapped",
      modifications: "The pinned unit is reachable from the separate CLI config route, not InteractiveMode or the owned session shell; retain it in source inventory while configuration remains outside this owned-UI launch contract.",
      approvedDeviations: [],
    };
  }
  if (upstreamPath === "packages/coding-agent/src/modes/interactive/interactive-mode.ts") {
    return {
      classification: "host-adaptation",
      localDestination: "src/integrations/pi/components/index.ts",
      implementationStatus: "adapter-present-conformance-passed",
      modifications: "Decompose stock InteractiveMode authority across typed engine, component, TUI, and owned-shell adapters; construction, private inspection, and mutation of the stock root remain forbidden.",
      approvedDeviations: [],
    };
  }
  if (upstreamPath === "packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts") {
    return {
      classification: "host-adaptation",
      localDestination: "src/integrations/pi/engine/adapter.ts",
      implementationStatus: "adapter-present-conformance-passed",
      modifications: "Expose model-runtime refresh, timeout, cached-state, and failure outcomes through the typed engine adapter and stateful scoped-model controller.",
      approvedDeviations: [],
    };
  }
  return undefined;
}

function classify(packageName, upstreamPath) {
  const filename = upstreamPath.split("/").at(-1);
  if (packageName === "@earendil-works/pi-tui") {
    const host = tuiHostModules.has(filename);
    return host
      ? {
          classification: "host-adaptation",
          localDestination: "src/integrations/pi/tui-runtime/index.ts",
          implementationStatus: "adapter-present-conformance-pending",
          modifications: "Use pinned public pi-tui terminal/runtime APIs behind A1 lifecycle ownership.",
        }
      : {
          classification: "public-api-reuse",
          localDestination: "src/integrations/pi/components/index.ts",
          implementationStatus: "available-through-pinned-package",
          modifications: "None planned; import only from the pinned public pi-tui package root.",
        };
  }

  const componentPrefix = "packages/coding-agent/src/modes/interactive/components/";
  if (upstreamPath.startsWith(componentPrefix) && publicCodingAgentComponents.has(filename)) {
    return {
      classification: "public-api-reuse",
      localDestination: "src/integrations/pi/components/index.ts",
      implementationStatus: "available-through-pinned-package",
      modifications: "None planned; import the exact component or helper from the pinned public coding-agent package root.",
    };
  }
  if (upstreamPath === "packages/coding-agent/src/modes/interactive/theme/theme.ts") {
    return {
      classification: "public-api-reuse",
      localDestination: "src/integrations/pi/components/index.ts",
      implementationStatus: "available-through-pinned-package",
      modifications: "None planned; use pinned public theme exports and package-owned built-in assets.",
    };
  }
  if (upstreamPath.includes("/src/modes/interactive/") || upstreamPath.endsWith("/src/cli/startup-ui.ts")
    || upstreamPath.endsWith("/src/core/keybindings.ts") || upstreamPath.endsWith("/src/core/slash-commands.ts")) {
    const relativeInteractive = upstreamPath
      .replace("packages/coding-agent/src/modes/interactive/", "")
      .replace("packages/coding-agent/src/", "adjacent/");
    return {
      classification: "owned-presentation",
      localDestination: `src/integrations/pi/components/upstream/${relativeInteractive}`,
      implementationStatus: "not-ported",
      modifications: "Mechanical port planned: remap imports, inject A1 engine/runtime ownership, preserve control flow and state, and record every deviation.",
    };
  }
  return {
    classification: "host-adaptation",
    localDestination: "src/integrations/pi/engine/index.ts",
    implementationStatus: "adapter-present-conformance-pending",
    modifications: "Retain authority in the pinned public SDK and expose it only through A1 engine contracts.",
  };
}

function behaviorCategories(path) {
  if (path.endsWith("interactive-mode.ts")) return [...baseline.requiredCategories];
  if (/theme|diff|visual-truncate|markdown|mermaid|image|text|box|stack|spacer|layout/.test(path)) return ["startup-composition", "stateful-components", "resize"];
  if (/editor|autocomplete|keybinding|keys|kill-ring|undo-stack|word-navigation/.test(path)) return ["editor", "autocomplete", "keybindings", "clipboard"];
  if (/selector|config-selector|model-search|input\.ts/.test(path)) return ["selectors", "settings", "sessions", "models", "thinking"];
  if (/assistant-message|user-message|custom-message|custom-entry|skill-invocation|summary-message|tool-execution|bash-execution/.test(path)) return ["stateful-components", "events", "tools", "errors"];
  if (/footer|status-indicator|countdown|loader/.test(path)) return ["footer-status", "events", "errors"];
  if (/extension/.test(path)) return ["stateful-components", "autocomplete", "events", "tools", "footer-status", "errors", "shutdown"];
  if (/slash-commands/.test(path)) return ["built-in-commands", "prompt-loop"];
  if (/startup-ui|first-time-setup|announcement|armin|daxnuts/.test(path)) return ["startup-composition", "built-in-commands", "errors"];
  if (/agent-session|sdk|resource-loader|settings-manager|session-manager|model-runtime|prompt-templates|skills|bash-executor/.test(path)) {
    return ["prompt-loop", "settings", "sessions", "models", "events", "tools", "errors", "shutdown"];
  }
  if (/clipboard|external-editor/.test(path)) return ["editor", "clipboard", "errors"];
  if (/terminal|tui|stdin-buffer|native-modifiers/.test(path)) return ["keybindings", "resize", "shutdown"];
  return ["stateful-components"];
}

function acceptanceTasks(path, categories) {
  const tasks = new Set();
  if (path.includes("/theme/")) tasks.add("7.4");
  if (categories.includes("startup-composition")) tasks.add("7.7");
  if (categories.includes("stateful-components")) tasks.add("7.5");
  if (categories.some(category => ["editor", "autocomplete", "keybindings", "clipboard"].includes(category))) tasks.add("7.6");
  if (categories.some(category => ["selectors", "settings", "sessions", "models", "thinking"].includes(category))) tasks.add("7.8");
  if (categories.includes("built-in-commands")) tasks.add("7.9");
  if (categories.includes("prompt-loop")) tasks.add("7.10");
  if (categories.some(category => ["events", "tools", "errors"].includes(category))) tasks.add("7.11");
  if (/extension/.test(path)) tasks.add("7.12");
  if (categories.some(category => ["resize", "shutdown"].includes(category))) tasks.add("7.21");
  return [...tasks];
}

function testTargets(path, categories) {
  const tests = new Set();
  if (path.includes("/theme/")) tests.add("test/foundation/pi-component-adapter/pinned-theme-parity.test.ts");
  if (path.includes("/components/")) tests.add("test/foundation/pi-component-adapter/pinned-transcript-lifecycle-parity.test.ts");
  if (path.endsWith("/components/status-indicator.ts") || path.endsWith("/components/countdown-timer.ts")) tests.add("test/foundation/pi-component-adapter/pinned-status-indicator-parity.test.ts");
  if (path.includes("/theme/") || categories.includes("startup-composition")) tests.add("test/foundation/pi-component-adapter/pinned-theme-composition-parity.test.ts");
  if (categories.includes("stateful-components")) tests.add("test/foundation/pi-component-adapter/pinned-component-lifecycle-parity.test.ts");
  if (categories.some(category => ["editor", "autocomplete", "keybindings", "clipboard"].includes(category))) tests.add("test/features/owned-ui/pinned-input-parity.test.ts");
  if (categories.some(category => ["selectors", "settings", "sessions", "models", "thinking"].includes(category))) tests.add("test/features/owned-ui/pinned-selector-parity.test.ts");
  if (categories.includes("built-in-commands")) tests.add("test/foundation/pi-engine-adapter/workflows.test.ts");
  if (categories.some(category => ["prompt-loop", "events", "tools", "errors"].includes(category))) tests.add("test/features/owned-ui/pinned-session-orchestration-parity.test.ts");
  if (/extension/.test(path)) tests.add("test/features/owned-ui/pinned-extension-ui-parity.test.ts");
  if (categories.some(category => ["resize", "shutdown"].includes(category))) tests.add("test/foundation/pi-tui-runtime-adapter/pinned-lifecycle-parity.test.ts");
  return [...tests];
}

function packageSlug(name) {
  return name.endsWith("pi-tui") ? "pi-tui" : "pi-coding-agent";
}
