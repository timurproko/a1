import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const rootArgument = process.argv.indexOf("--root");
const root = resolve(rootArgument >= 0 ? process.argv[rootArgument + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const sourceRoot = resolve(root, "src");
const errors = [];

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

for (const file of await walk(sourceRoot)) {
  const source = await readFile(file, "utf8");
  const path = relative(root, file).split(sep).join("/");
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)].map(match => match[2]);

  for (const specifier of imports) {
    const isPi = /(?:^|\/)(?:pi-agent|pi-ai|pi-coding-agent|@mariozechner\/pi-|@oh-my-pi\/pi-)/.test(specifier);
    if (isPi && !/^src\/(drivers\/pi|profiles\/pi)\//.test(path)) {
      errors.push(`${path}: Pi import '${specifier}' is outside Pi adapter/profile tooling`);
    }
    if (/(?:^|\/)(?:dist|src|build)\//.test(specifier) && /pi/i.test(specifier)) {
      errors.push(`${path}: private Pi distribution import '${specifier}' is forbidden`);
    }
    if (["node-pty", "@xterm/headless"].includes(specifier)) {
      errors.push(`${path}: PTY/emulator import '${specifier}' is forbidden in the transparent baseline`);
    }
    if (/pi-tui/.test(specifier)) {
      errors.push(`${path}: terminal presentation import '${specifier}' is forbidden in the transparent baseline`);
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

  if (/^src\/(?:drivers\/terminal|host-terminal|presentation|test-harness)(?:\/|$)/.test(path)
    || /^(?:src\/terminal-input|src\/windows-console-mode|src\/ui\/host-(?:terminal-renderer|frame-writer))\.ts$/.test(path)) {
    errors.push(`${path}: retired terminal module remains in production sources`);
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

  if (path.startsWith("src/transparent/")) {
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
