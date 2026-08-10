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
    if (["node-pty", "@xterm/headless"].includes(specifier)
      && !/^src\/(drivers\/terminal\/|test-harness\/pty-runner)/.test(path)) {
      errors.push(`${path}: PTY/emulator import '${specifier}' is outside terminal adapters`);
    }
    if (/pi-tui/.test(specifier) && !path.startsWith("src/presentation/")) {
      errors.push(`${path}: TUI import '${specifier}' is outside presentation`);
    }
    if (path.startsWith("src/ui/") && ["node:child_process", "child_process", "node-pty"].includes(specifier)) {
      errors.push(`${path}: UI may not spawn agent processes`);
    }
  }

  if (/\bglobalThis\s*[.[]/.test(source)) {
    errors.push(`${path}: durable globalThis state is forbidden`);
  }
}

if (errors.length > 0) {
  console.error(`Architecture check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries OK");
}
