import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const rootArgument = process.argv.indexOf("--root");
const root = resolve(rootArgument >= 0 ? process.argv[rootArgument + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const errors = [];
const files = [];
const acceptedExtensions = new Set([".json", ".md", ".mjs", ".js", ".ts", ".tsx", ".yaml", ".yml"]);

for (const candidate of ["package.json", "package-lock.json", "README.md"]) {
  await addFile(candidate);
}
for (const directory of ["docs", "src", "scripts", ".github", "openspec/changes"]) {
  await walk(resolve(root, directory));
}

for (const file of files) {
  const path = relative(root, file).split(sep).join("/");
  if (path === "scripts/check-package-identity.mjs" || path.startsWith("test/")) continue;
  if (path.startsWith("openspec/changes/archive/") || path.includes("/evidence/") || path.startsWith("openspec/changes/republish-as-a1/")) continue;
  const source = await readFile(file, "utf8");
  if (source.includes("@timurproko/addone")) errors.push(`${path}: obsolete npm package identity is forbidden`);
  if (/`addone(?:\s+(?:pi|sandbox|version|update(?::next)?|agent|ui))?`/.test(source)
    || /\baddone\s+(?:pi|sandbox|version|update(?::next)?|agent|ui)\b/.test(source)
    || /\ba1\/addone\b/.test(source)
    || /["']addone["']\s*:\s*["']bin\//.test(source)
    || /(?:\baddone\b[^\n]*\ba1\b|\ba1\b[^\n]*\baddone\b)[^\n]*(?:alias|equivalent)/.test(source)) {
    errors.push(`${path}: obsolete public addone command is forbidden`);
  }
}

if (errors.length > 0) {
  process.stderr.write(`Package identity check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Package identity OK: @timurproko/a1 exposes only a1\n");
}

async function addFile(path) {
  const absolute = resolve(root, path);
  try {
    const metadata = await import("node:fs/promises").then(({ stat }) => stat(absolute));
    if (metadata.isFile()) files.push(absolute);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (["node_modules", "dist", "artifacts", "target"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (acceptedExtensions.has(extname(entry.name))) files.push(path);
  }
}
