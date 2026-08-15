import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { inspectProjectStructureImports, projectOwnerForPath, testOwnerForPath } from "./project-structure-policy.mjs";

const rootArgument = process.argv.indexOf("--root");
const root = resolve(rootArgument >= 0 ? process.argv[rootArgument + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const sourceRoot = resolve(root, "src");
const nativeRoots = [resolve(root, "native"), resolve(root, "scripts", "native")];
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

async function walkNative(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["target", "vendor", ".zig-cache", "zig-out"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkNative(path));
    else if ([".rs", ".zig", ".toml", ".ts", ".js", ".mjs"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const file of await walk(sourceRoot)) {
  const source = await readFile(file, "utf8");
  const path = relative(root, file).split(sep).join("/");
  sourceFiles[path] = source;
  if (!projectOwnerForPath(path)) errors.push(`${path}: production source has no declared owner`);
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)].map(match => match[2]);

  for (const specifier of imports) {
    const isPi = !specifier.startsWith(".") && /(?:^|\/)(?:pi-agent|pi-ai|pi-coding-agent|pi-tui|@mariozechner\/pi-|@oh-my-pi\/pi-)/.test(specifier);
    const piAdapterPath = /^src\/(?:foundation\/(?:pi-engine-adapter|pi-component-adapter|pi-tui-runtime-adapter)|drivers\/pi|profiles\/pi)\//.test(path);
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
    if (["node-pty", "@xterm/headless"].includes(specifier)) {
      errors.push(`${path}: PTY/emulator import '${specifier}' is forbidden in the transparent baseline`);
    }
    if (!specifier.startsWith(".") && /pi-tui/.test(specifier) && !/^src\/foundation\/(?:pi-component-adapter|pi-tui-runtime-adapter)\//.test(path)) {
      errors.push(`${path}: Pi TUI import '${specifier}' is outside the runtime or component adapter boundary`);
    }
    if (path.startsWith("src/ui/") && ["node:child_process", "child_process", "node-pty"].includes(specifier)) {
      errors.push(`${path}: UI may not spawn agent processes`);
    }
  }

  if (/\bglobalThis\s*[.[]/.test(source)) {
    errors.push(`${path}: durable globalThis state is forbidden`);
  }
  if (/^src\/(?:domain\/model|protocol\/messages)\.ts$/.test(path) && /["']terminal-output["']/.test(source)) {
    errors.push(`${path}: raw child terminal output is forbidden in the UI-facing control contract`);
  }
  if (path.startsWith("src/ui/") && /\.write\(\s*(?:bytes|chunk|data)\s*\)/.test(source)) {
    errors.push(`${path}: UI may render virtual terminal state but may not relay opaque child bytes`);
  }

    if (/^(?:src\/features\/owned-ui|src\/foundation\/(?:owned-ui-contracts|pi-engine-adapter|pi-component-adapter|pi-tui-runtime-adapter))\//.test(path)) {
    const ownedUiForbidden = [
      { pattern: /\b(?:InteractiveMode|TuiAltScreen|TuiMainScreen|ProcessTerminal)\b.*prototype|prototype\s*\.(?:render|start|stop|handle[A-Za-z]+)\s*=/, label: "stock Pi interactive prototype mutation" },
      { pattern: /\b(?:previousLines|previousWidth|previousHeight|cursorRow|hardwareCursorRow|maxLinesRendered|previousViewportTop)\b/, label: "private Pi renderer-state inspection" },
      { pattern: /\bReflect\.getOwnPropertyDescriptor\b|__proto__|\bprototype\b/, label: "host prototype inspection or mutation" },
      { pattern: /(?:distribution|dist|package)[A-Za-z]*(?:Hash|Integrity)|hashFiles|SHA-256.*(?:Pi|TUI)|(?:Pi|TUI).*SHA-256/i, label: "distribution-hash gating" },
      { pattern: /native-host-protocol|terminal-host|composedTerminal/i, label: "terminal-host coupling" },
    ];
    for (const { pattern, label } of ownedUiForbidden) {
      if (pattern.test(source)) errors.push(`${path}: owned UI contains forbidden ${label}`);
    }
    if (!path.startsWith("src/foundation/pi-component-adapter/")
      && path !== "src/foundation/owned-ui-contracts/extension-ui.ts"
      && /\b(?:ExtensionUIContext|setEditorComponent|setWidget|setFooter|onTerminalInput)\b/.test(source)) {
      errors.push(`${path}: owned UI depends on stock Pi extension UI context`);
    }
  }

  if (/^(?:src\/drivers\/terminal|src\/host-terminal|src\/presentation|src\/test-harness)(?:\/|$)/.test(path)
    || /^(?:src\/terminal-input|src\/windows-console-mode|src\/ui\/host-(?:terminal-renderer|frame-writer))\.ts$/.test(path)) {
    errors.push(`${path}: retired terminal module remains in production sources`);
  }

  if (path.startsWith("src/foundation/structured-agent-runtime/")) {
    const structuredForbidden = [
      { pattern: /(?:\u001b|\u009b|\x1[bB]|\x9[bB]|ansi(?:Escapes?|Regex)|terminalOutput|terminalBytes|framebuffer|renderedCells?|shadowParser)/i, label: "terminal text or screen interpretation" },
      { pattern: /(?:node-pty|conpty|portable-pty|pty\.|PtyProcess|child terminal)/i, label: "terminal PTY ownership" },
    ];
    for (const { pattern, label } of structuredForbidden) {
      if (pattern.test(source)) errors.push(`${path}: structured runtime contains forbidden ${label}`);
    }
  }

  if (path.startsWith("src/foundation/native-host-protocol/")) {
    const nativeProtocolForbidden = [
      { pattern: /(?:node-pty|conpty|portable-pty|PtyProcess|pty\.|terminalBytes|terminalOutput|ptyBytes|inputBytes|renderedCells?|framebuffer|cellGrid|screenBuffer|ansiStream)/i, label: "terminal byte, input, or rendered-cell transport" },
      { pattern: /(?:node:child_process|child_process|execFile|spawn\s*\()/i, label: "native host process ownership" },
    ];
    for (const { pattern, label } of nativeProtocolForbidden) {
      if (pattern.test(source)) errors.push(`${path}: native-host protocol contains forbidden ${label}`);
    }
  }

  if (path.startsWith("src/features/launch/")) {
    const explicitModeForbidden = [
      { pattern: /(?:native-host-protocol|structured-agent-runtime|features\/workspace|features\/owned-ui|nativeTerminalHost|composedTerminal)/i, label: "composed infrastructure dependency" },
    ];
    for (const { pattern, label } of explicitModeForbidden) {
      if (pattern.test(source)) errors.push(`${path}: launch profile code contains forbidden ${label}`);
    }
  }

  if (path.startsWith("native/") || path.startsWith("scripts/native/")) {
    const nativeForbidden = [
      { pattern: /(?:node-pty|@xterm\/headless|custom(?:Ansi|Vt)(?:Parser|Renderer)|lightweight(?:Terminal|Ansi)(?:Parser|Renderer))/i, label: "new lightweight terminal parser or renderer" },
    ];
    for (const { pattern, label } of nativeForbidden) {
      if (pattern.test(source)) errors.push(`${path}: native host contains forbidden ${label}`);
    }
  }

  const retiredMechanisms = [
    { pattern: /\b(?:PtyTerminalDriver|ResidentTerminalState|OutputTransactionAssembler|TerminalRenderTransaction)\b/, label: "retired terminal rendering authority" },
    { pattern: /\b(?:TerminalModeTracker|TerminalResponse(?:Router|Handler)?|interceptTerminalQuer(?:y|ies)|parseTerminal(?:Mode|Query))\b/, label: "custom terminal mode/query parser" },
    { pattern: /\b(?:SemanticTerminalInput|encode(?:Kitty|ModifyOtherKeys|Win32|TerminalKey)|ReadConsoleInputW|windowsRecordReader)\b|\?\s*9001|modifyOtherKeys/i, label: "custom terminal input parser/encoder" },
    { pattern: /\b(?:sourceFrame|frameCadence|quiescence(?:Ms|Timer|Deadline)?|adaptiveFrame|cadenceWindow)\b/i, label: "cadence-derived frame inference" },
  ];
  for (const { pattern, label } of retiredMechanisms) {
    if (pattern.test(source)) errors.push(`${path}: ${label} is forbidden`);
  }

  if (path.startsWith("src/foundation/transparent-terminal/")) {
    const transparentForbidden = [
      { pattern: /(?:node-pty|@xterm|conpty|portable-pty|wezterm)/i, label: "PTY or terminal emulator dependency" },
      { pattern: /(?:process\.(?:stdin|stdout|stderr)|\.on\(\s*["']data|\.pipe\(|TextDecoder|StringDecoder)/, label: "terminal input/output read or relay" },
      { pattern: /(?:setRawMode|ReadConsoleInputW|SendInput|WriteConsole|SetConsoleMode|tcsetpgrp|termios)/i, label: "terminal input or mode mediation" },
      { pattern: /(?:framebuffer|render|repaint|damage|cell|cursor|escape(?:Sequence)?|terminalQuery)/i, label: "terminal parsing or display reconstruction" },
    ];
    for (const { pattern, label } of transparentForbidden) {
      if (pattern.test(source)) errors.push(`${path}: transparent boundary contains forbidden ${label}`);
    }
    if (/native-launcher\.ts$/.test(path) && !/stdio:\s*["']inherit["']/.test(source)) {
      errors.push(`${path}: transparent native launcher must inherit physical standard handles`);
    }
    if (/native-launcher\.ts$/.test(path) && !/shell:\s*false/.test(source)) {
      errors.push(`${path}: transparent native launcher must disable shell execution`);
    }
  }

  if (isTerminalBoundary(path)) {
    const identityPatterns = [
      { pattern: /native[\s_-]*pi|ADDONE_NATIVE_PI|PI_CODING_AGENT|PI_CONFIG|--tui-mode|\b(?:Claude|Codex)\b/i, label: "CLI identity or CLI-named configuration" },
      { pattern: /(?:if|switch)\s*\([^\n]*(?:executable|arguments?)\b/i, label: "executable or argument inspection" },
      { pattern: /process\.env(?:\.|\[)(?:["']?)?(?:PI_|CLAUDE_|CODEX_)/i, label: "CLI-named environment inspection" },
      { pattern: /(?:if|switch)\s*\([^\n]*(?:output|text|content|chunk|data)[^\n]*(?:includes|match|test)\s*\(/i, label: "visible-content rendering branch" },
      { pattern: /(?:conpty|windows|unix)[A-Za-z]*(?:Pi|Claude|Codex|Cli)[A-Za-z]*Fallback/i, label: "CLI-specific input-mode fallback" },
      { pattern: /(?:mode|query)[A-Za-z]*(?:Regex|Regexp|Parser|Tracker|Interceptor|Responder)|(?:parse|intercept|respond)[A-Za-z]*(?:Mode|Query)/i, label: "custom mode/query parser" },
      { pattern: /(?:key|input)[A-Za-z]*(?:Encoder|Translator)|(?:encode|translate)[A-Za-z]*(?:Key|Input)/i, label: "custom input encoder" },
      { pattern: /(?:cadence|quiescence|adaptive)[A-Za-z]*(?:Frame|Flush|Delay|Timer|Window)|(?:frame|flush)[A-Za-z]*(?:Cadence|Quiescence)/i, label: "cadence inference" },
    ];
    for (const { pattern, label } of identityPatterns) {
      if (pattern.test(source)) errors.push(`${path}: terminal boundary contains forbidden ${label}`);
    }
  }
}

for (const nativeRoot of nativeRoots) {
  let nativeFiles = [];
  try {
    nativeFiles = await walkNative(nativeRoot);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  for (const file of nativeFiles) {
    const source = await readFile(file, "utf8");
    const path = relative(root, file).split(sep).join("/");
    if (/(?:node-pty|@xterm\/headless|custom(?:Ansi|Vt)(?:Parser|Renderer)|lightweight(?:Terminal|Ansi)(?:Parser|Renderer))/i.test(source)) {
      errors.push(`${path}: native host contains forbidden new lightweight terminal parser or renderer`);
    }
  }
}

errors.push(...inspectProjectStructureImports(sourceFiles));
await inspectRepositoryStructure();
await inspectReleasePolicy();

if (errors.length > 0) {
  console.error(`Architecture check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries OK");
}

function isTerminalBoundary(path) {
  return /^src\//.test(path) && /(?:^|\/)(?:terminal|pty|console|transparent|composed|foreground(?:-terminal)?)(?:[-/_.]|$)/i.test(path);
}

async function inspectRepositoryStructure() {
  const paths = await walkRepository(root);
  const genericSourceSegments = /(?:^|\/)src\/(?:core|common|utils|misc)(?:\/|$)/;
  const generatedSegments = /(?:^|\/)(?:node_modules|logs?|sessions?|cache|caches|browser-profile|browser-profiles|dist|coverage)(?:\/|$)/i;
  const nestedAuthority = /(?:^|\/)(?:package(?:-lock)?\.json)$/;
  for (const path of paths) {
    if (genericSourceSegments.test(path)) errors.push(`${path}: generic source dumping-ground directory is forbidden`);
    if (path.startsWith("src/") && generatedSegments.test(path)) errors.push(`${path}: generated or runtime state is forbidden in production source`);
    if (nestedAuthority.test(path) && !["package.json", "package-lock.json"].includes(path)) errors.push(`${path}: nested package manifest or lockfile is forbidden`);
    if (path.startsWith("test/") && /\.test\.ts$/.test(path) && !testOwnerForPath(path)) errors.push(`${path}: test has no declared owner`);
  }

  const staleMarkers = /(?:during (?:the )?redesign|terminal redesign|milestone branch|will be added later|temporary lifecycle-only)/i;
  for (const path of paths.filter(path => path === "README.md" || path.startsWith("docs/"))) {
    const source = await readFile(resolve(root, path), "utf8");
    if (staleMarkers.test(source)) errors.push(`${path}: stale redesign marker is forbidden in current documentation`);
  }
}

async function walkRepository(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if ([".git", "artifacts", "dist", "node_modules"].includes(entry.name) && prefix === "") continue;
    if (["target", ".zig-cache", "zig-out"].includes(entry.name)) continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...await walkRepository(resolve(directory, entry.name), path));
    else paths.push(path);
  }
  return paths;
}

async function inspectReleasePolicy() {
  const manifestPath = resolve(root, "package.json");
  let manifestSource = "";
  try {
    manifestSource = await readFile(manifestPath, "utf8");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const releaseFiles = ["scripts/prepack-gate.mjs", "scripts/run-release-gates.mjs", "scripts/publish-next.ts"];
  const values = [["package.json", manifestSource]];
  for (const path of releaseFiles) {
    try {
      values.push([path, await readFile(resolve(root, path), "utf8")]);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  const obsoleteGate = /test:scenario|test\/scenarios|walking-skeleton|conversation-stability|packaged-(?:real-pi|extension|multi-cli)|ADDONE_CERTIFICATION_TARBALL|ADDONE_INTERNAL_PACKAGING|simulation-first certification|generic-terminal-(?:corpus|parity)/i;
  for (const [path, source] of values) {
    if (obsoleteGate.test(source)) errors.push(`${path}: obsolete retired-pipeline release gate is forbidden`);
  }
  const publishNext = values.find(([path]) => path === "scripts/publish-next.ts")?.[1] ?? "";
  if (/publication is frozen until transparent capability certification/i.test(publishNext)) {
    errors.push("scripts/publish-next.ts: obsolete uncertified-preview publication freeze is forbidden");
  }
  if (/uncertified-development-preview/.test(publishNext) && !/stableReleaseEligible\s*!==\s*false/.test(publishNext)) {
    errors.push("scripts/publish-next.ts: uncertified next evidence must prohibit stable release eligibility");
  }
  if (/createUncertifiedDevelopmentPreviewEvidence/.test(publishNext) && !/requireManuallyAcceptedDevelopmentPreview/.test(publishNext)) {
    errors.push("scripts/publish-next.ts: uncertified next publication must require exact manual acceptance");
  }
}
