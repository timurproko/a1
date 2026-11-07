import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { inspectLayerBoundaries, inspectPiFeatureBoundaryImports, inspectProjectOwnerLayout, inspectProjectStructureImports, projectOwnerForPath, testOwnerForPath } from "./project-structure-policy.mjs";
import { inspectPiProductionBoundary } from "./pi-api-boundary-policy.mjs";
import { inspectBaselinePaths } from "./baseline-paths-policy.mjs";
import { inspectModuleGraph } from "./module-graph-policy.mjs";
import { inspectStartupReachability, validateStartupReachabilityBaseline } from "./startup-graph-policy.mjs";
import { inspectSizeRatchet, measureSizeRatchet } from "./size-ratchet-policy.mjs";

const rootArgument = process.argv.indexOf("--root");
const allowPartialLayout = process.argv.includes("--allow-partial-layout");
const root = resolve(rootArgument >= 0 ? process.argv[rootArgument + 1] : new URL("../..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const sourceRoot = resolve(root, "src");
const errors = [];
const sourceFiles = {};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if ([".ts", ".tsx", ".js", ".mjs"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

/**
 * The product draws its one agent UI directly on the user's terminal. A pseudoterminal or a
 * terminal emulator in production would be a second screen authority, so both stay test-only.
 */
const terminalEmulationImport = /^(?:node-pty|@[^/]+\/node-pty[^/]*|node-pty-prebuilt[^/]*|@xterm\/.+|xterm(?:-headless)?)(?:\/.*)?$/;
const pseudoterminalSpawn = /\b(?:forkpty|openpty|posix_openpt|CreatePseudoConsole)\b|\bpty\.(?:spawn|fork|open)\s*\(/;

for (const file of await walk(sourceRoot)) {
  const source = await readFile(file, "utf8");
  const path = relative(root, file).split(sep).join("/");
  sourceFiles[path] = source;
  if (!projectOwnerForPath(path)) errors.push(`${path}: production source has no declared owner`);
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)].map(match => match[2]);

  for (const specifier of imports) {
    // Invariant: pi-tui is imported under its package name everywhere; the bin/ resolver hook
    // decides which copy loads, so the specifier belongs to the same adapter boundary as Pi.
    const isPi = !specifier.startsWith(".") && /(?:^|[#/])(?:pi-agent|pi-ai|pi-coding-agent|pi-tui|@mariozechner\/pi-|@oh-my-pi\/pi-)/.test(specifier);
    const piAdapterPath = path === "src/integrations/pi/startup-public.ts"
      || /^src\/integrations\/pi\/(?:engine|components|tui-runtime)\//.test(path);
    if (/@oh-my-pi\//.test(specifier)) {
      errors.push(`${path}: oh-my-pi fork package import '${specifier}' is forbidden`);
    }
    if (specifier === "bun" || specifier.startsWith("bun:")) {
      errors.push(`${path}: Bun-only dependency '${specifier}' is forbidden`);
    }
    if (isPi && !piAdapterPath) {
      errors.push(`${path}: Pi import '${specifier}' is outside the owned Pi adapter boundary`);
    }
    if (/(?:^|\/)(?:dist|src|build)\//.test(specifier) && /pi/i.test(specifier)) {
      errors.push(`${path}: private Pi distribution import '${specifier}' is forbidden`);
    }
    if (terminalEmulationImport.test(specifier)) {
      errors.push(`${path}: pseudoterminal or terminal emulator import '${specifier}' is forbidden in production source`);
    }
    if (!specifier.startsWith(".") && /pi-tui/.test(specifier) && !/^src\/integrations\/pi\/(?:components|tui-runtime)\//.test(path)) {
      errors.push(`${path}: Pi TUI import '${specifier}' is outside the runtime or component adapter boundary`);
    }
    if (path.startsWith("src/ui/") && ["node:child_process", "child_process", "node-pty"].includes(specifier)) {
      errors.push(`${path}: UI may not spawn agent processes`);
    }
  }

  if (pseudoterminalSpawn.test(source)) {
    errors.push(`${path}: production source may not spawn a pseudoterminal`);
  }

  if (/\bglobalThis\s*[.[]/.test(source)) {
    errors.push(`${path}: durable globalThis state is forbidden`);
  }

  if (/^(?:src\/features\/owned-ui|src\/app\/session-shell|src\/integrations\/pi\/(?:engine|components|tui-runtime))\//.test(path)) {
    const ownedUiForbidden = [
      { pattern: /\b(?:InteractiveMode|TuiAltScreen|TuiMainScreen|ProcessTerminal)\b.*prototype|prototype\s*\.(?:render|start|stop|handle[A-Za-z]+)\s*=/, label: "stock Pi interactive prototype mutation" },
      { pattern: /\b(?:previousLines|previousWidth|previousHeight|cursorRow|hardwareCursorRow|maxLinesRendered|previousViewportTop)\b/, label: "private Pi renderer-state inspection" },
      { pattern: /\bReflect\.getOwnPropertyDescriptor\b|__proto__|\bprototype\b/, label: "host prototype inspection or mutation" },
      { pattern: /(?:distribution|dist|package)[A-Za-z]*(?:Hash|Integrity)|hashFiles|SHA-256.*(?:Pi|TUI)|(?:Pi|TUI).*SHA-256/i, label: "distribution-hash gating" },
    ];
    for (const { pattern, label } of ownedUiForbidden) {
      if (pattern.test(source)) errors.push(`${path}: owned UI contains forbidden ${label}`);
    }
    if (!path.startsWith("src/integrations/pi/components/")
      && !path.startsWith("src/integrations/pi/engine/")
      && path !== "src/contracts/owned-ui/extension-ui.ts"
      && /\b(?:ExtensionUIContext|setEditorComponent|setWidget|setFooter|onTerminalInput)\b/.test(source)) {
      errors.push(`${path}: owned UI depends on stock Pi extension UI context`);
    }
  }
}

let startupReachability = { modules: [], errors: [] };
let startupBaseline = null;
try {
  startupBaseline = JSON.parse(await readFile(resolve(root, "config", "startup-graph-baseline.json"), "utf8"));
  startupReachability = await inspectStartupReachability(root);
} catch (error) {
  // Rationale: synthetic architecture fixtures intentionally contain only the boundary under test;
  // the real repository must always provide the startup roots and reviewed baseline.
  if (rootArgument < 0) errors.push(`startup graph baseline or root is missing: ${error instanceof Error ? error.message : String(error)}`);
}
const startupModules = new Set(startupReachability.modules.map(module => module.path));
errors.push(...inspectProjectStructureImports(sourceFiles, startupModules));
errors.push(...inspectLayerBoundaries(sourceFiles));
errors.push(...inspectPiFeatureBoundaryImports(sourceFiles));
errors.push(...inspectPiProductionBoundary(sourceFiles));
if (rootArgument < 0) {
  errors.push(...await inspectBaselinePaths(root));
  let architectureAllowlist = null;
  try {
    architectureAllowlist = JSON.parse(await readFile(resolve(root, "config", "architecture-allowlist.json"), "utf8"));
  } catch (error) {
    errors.push(`architecture allowlist is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (architectureAllowlist !== null) errors.push(...await inspectModuleGraph(root, architectureAllowlist, sourceFiles));
  try {
    const sizeBaseline = JSON.parse(await readFile(resolve(root, "config", "baselines", "size-ratchet.json"), "utf8"));
    errors.push(...inspectSizeRatchet(await measureSizeRatchet(root), sizeBaseline));
  } catch (error) {
    errors.push(`size ratchet baseline is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}
await inspectRepositoryStructure();
await inspectPackageManifest();
await inspectFileNames();
inspectOwnedShellModules();
errors.push(...startupReachability.errors);
if (startupBaseline !== null) errors.push(...validateStartupReachabilityBaseline(startupReachability, startupBaseline));

if (errors.length > 0) {
  console.error(`Architecture check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries OK");
}

function inspectOwnedShellModules() {
  const prefix = "src/integrations/pi/components/";
  const modules = [
    "shell-shared-facade.ts",
    "shell-editor-autocomplete.ts",
    "shell-selectors-dialogs.ts",
    "shell-presenters-transcript.ts",
    "shell-presenters-info.ts",
    "shell-footer-status.ts",
    "shell-extension-ui.ts",
  ];
  if (!modules.some(module => sourceFiles[`${prefix}${module}`] !== undefined)) return;
  for (const module of modules) {
    const path = `${prefix}${module}`;
    const source = sourceFiles[path];
    if (source === undefined) {
      errors.push(`${path}: required owned-shell responsibility module is missing`);
      continue;
    }
    const lines = source.split(/\r?\n/).length;
    if (lines > 550) errors.push(`${path}: owned-shell responsibility module exceeds 550 lines (${lines})`);
    const siblingImport = source.match(/(?:from\s+|import\s+)["']\.\/(shell-(?!shared-facade)[a-z-]+)\.js["']/);
    if (siblingImport) errors.push(`${path}: responsibility modules may depend only on shell-shared-facade, not ${siblingImport[1]}`);
  }
}

async function inspectRepositoryStructure() {
  const paths = await walkRepository(root);
  if (!allowPartialLayout) errors.push(...inspectProjectOwnerLayout(paths));
  const genericSourceSegments = /(?:^|\/)src\/(?:core|common|utils|misc)(?:\/|$)/;
  const generatedSegments = /(?:^|\/)(?:node_modules|logs?|sessions?|cache|caches|browser-profile|browser-profiles|dist|coverage)(?:\/|$)/i;
  const nestedAuthority = /(?:^|\/)(?:package(?:-lock)?\.json)$/;
  for (const path of paths) {
    if (genericSourceSegments.test(path)) {
      errors.push(`${path}: generic source dumping-ground directory is forbidden`);
    }
    if (path.startsWith("src/") && generatedSegments.test(path)) errors.push(`${path}: generated or runtime state is forbidden in production source`);
    if (nestedAuthority.test(path) && !["package.json", "package-lock.json", "packages/a1-install/package.json"].includes(path)) errors.push(`${path}: nested package manifest or lockfile is forbidden`);
    if (path.startsWith("test/") && /\.test\.ts$/.test(path) && !testOwnerForPath(path)) errors.push(`${path}: test has no declared owner`);
  }
}

async function walkRepository(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if ([".git", ".builds", ".worktrees", ".artifacts", "dist", "node_modules"].includes(entry.name) && prefix === "") continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...await walkRepository(resolve(directory, entry.name), path));
    else paths.push(path);
  }
  return paths;
}

async function inspectPackageManifest() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    return;
  }
  // Security: a terminal emulator belongs to tests alone; shipped in the product it would be a
  // second way to draw the screen.
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (terminalEmulationImport.test(dependency)) errors.push(`package.json: terminal emulator dependency '${dependency}' must be development-only`);
  }
  if ((manifest.files ?? []).some(path => path === "scripts" || path.startsWith("scripts/"))) {
    errors.push("package.json: test-only scripts must not be published");
  }
}

/**
 * Inside this repository the product is a given, so a file named after it says
 * nothing a reader does not know and makes renaming the product a rename of the
 * tree. The product's name belongs where something outside addresses A1: the
 * command, the package, `A1_*` variables, state directories, and schemas.
 */
async function inspectFileNames() {
  const roots = ["bin", "src", "scripts", "test", "docs", "config"];
  const productName = /(^|[^a-z0-9])a1([^a-z0-9]|$)/i;
  const skipped = new Set(["node_modules", "dist", ".git"]);
  for (const root_ of roots) {
    for (const path of await filesUnder(resolve(root, root_), root_)) {
      const name = path.split("/").at(-1) ?? "";
      if (productName.test(name)) errors.push(`${path}: file is named for the product; name it for what it does`);
    }
  }

  async function filesUnder(absolute, prefix) {
    let entries;
    try { entries = await readdir(absolute, { withFileTypes: true }); } catch { return []; }
    const found = [];
    for (const entry of entries) {
      if (skipped.has(entry.name)) continue;
      const path = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) found.push(...await filesUnder(resolve(absolute, entry.name), path));
      else found.push(path);
    }
    return found;
  }
}
