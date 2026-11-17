import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, relative, isAbsolute, sep } from "node:path";

function entryTarget(exports) {
  if (typeof exports === "string") return exports;
  if (Array.isArray(exports)) return exports.map(entryTarget).find(Boolean);
  if (!exports || typeof exports !== "object") return null;
  if (Object.hasOwn(exports, ".")) return entryTarget(exports["."]);
  for (const [condition, target] of Object.entries(exports)) {
    if (["node", "import", "default"].includes(condition)) {
      const selected = entryTarget(target);
      if (selected) return selected;
    }
  }
  return null;
}

function fileExists(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}

function entriesPresent(directory, installed) {
  const require = createRequire(resolve(directory, "package.json"));
  const entries = [installed.main, installed.types, installed.typings, entryTarget(installed.exports),
    ...(typeof installed.bin === "string" ? [installed.bin] : Object.values(installed.bin ?? {}))].filter(Boolean);
  return entries.every(entry => {
    if (typeof entry !== "string") return false;
    const path = resolve(directory, entry), child = relative(directory, path);
    if (isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`)) return false;
    if (fileExists(path)) return true;
    // Compatibility: CommonJS main may omit its extension or refer to a directory.
    try { return fileExists(require.resolve(path)); } catch { return false; }
  });
}

/** Read-only readiness shared by doctor and publication startup; no dependency code is executed. */
export function inspectDependencies(root, manifest) {
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };
  const names = Object.keys(declared);
  if (!existsSync(resolve(root, "node_modules"))) return { present: false, declared: names.length, missing: names, mismatched: [], incomplete: [] };
  const missing = [], mismatched = [], incomplete = [];
  for (const name of names) {
    const directory = resolve(root, "node_modules", name);
    let installed;
    try { installed = JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8")); }
    catch { missing.push(name); continue; }
    if (!installed || typeof installed.version !== "string") { missing.push(name); continue; }
    if (/^\d/u.test(declared[name]) && installed.version !== declared[name]) {
      mismatched.push({ name, expected: declared[name], actual: installed.version });
    }
    if (!entriesPresent(directory, installed)) incomplete.push(name);
  }
  return { present: true, declared: names.length, missing, mismatched, incomplete };
}
