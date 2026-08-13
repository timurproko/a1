import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
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
      errors.push(`${path}: retired PTY/emulator import '${specifier}' is forbidden during redesign`);
    }
    if (/pi-tui/.test(specifier)) {
      errors.push(`${path}: retired terminal presentation import '${specifier}' is forbidden during redesign`);
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

  const terminalCore = /^(?:src\/drivers\/terminal\/(?:pty-terminal-driver|resident-terminal-state|output-transaction-assembler)|src\/presentation\/terminal(?:-projection)?|src\/ui\/host-(?:terminal-renderer|frame-writer))\.ts$/.test(path);
  if (terminalCore) {
    const identityPatterns = [
      { pattern: /native[\s_-]*pi|ADDONE_NATIVE_PI|PI_CODING_AGENT|PI_CONFIG|--tui-mode/i, label: "CLI identity or CLI-named configuration" },
      { pattern: /profile\.(?:executable|arguments)\b/, label: "executable or argument inspection" },
      { pattern: /process\.env\[(?:"|')?(?:PI_|CLAUDE_|CODEX_)/i, label: "CLI-named environment inspection" },
      { pattern: /(?:if|switch)\s*\([^\n]*(?:includes|match|test)\s*\(\s*["'`][A-Za-z][^\n]*\)/i, label: "visible-content rendering branch" },
      { pattern: /(?:conpty|windows|unix)[A-Za-z]*(?:Pi|Claude|Codex|Cli)[A-Za-z]*Fallback/i, label: "CLI-specific input-mode fallback" },
    ];
    for (const { pattern, label } of identityPatterns) {
      if (pattern.test(source)) errors.push(`${path}: terminal core contains forbidden ${label}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Architecture check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries OK");
}
