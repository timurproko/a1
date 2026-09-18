import { existsSync, readFileSync } from "node:fs";
import { dirname, posix, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Bind the generated facade to the package reached through Pi's public entry.
 * @param {string | URL} entryUrl
 */
export function configurePinnedPiPublicPackageEntry(entryUrl) {
  const root = dirname(dirname(fileURLToPath(entryUrl)));
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  if (manifest.name !== "@earendil-works/pi-coding-agent" || typeof manifest.version !== "string") {
    throw new Error("pinned Pi public package identity is invalid");
  }
  process.env.PI_PACKAGE_DIR = root;
  return { root, version: manifest.version };
}

/**
 * Preserve one bundled Pi module's original public-package URL semantics.
 * @param {string} relativeModule
 */
export function pinnedPiModuleUrl(relativeModule) {
  if (typeof relativeModule !== "string" || relativeModule.includes("\\") || relativeModule.startsWith("/")
    || posix.normalize(relativeModule).startsWith("../") || !relativeModule.endsWith(".js")) {
    throw new Error("pinned Pi module identity is invalid");
  }
  return pathToFileURL(resolve(pinnedRoot(), "dist", relativeModule)).href;
}

/**
 * Resolve documented Pi dependency exports from the pinned public package tree.
 * @param {string} specifier
 */
export function resolvePinnedPiImport(specifier) {
  if (typeof specifier !== "string" || specifier.includes("\\") || specifier.includes("\0")) {
    throw new Error("pinned Pi import specifier is invalid");
  }
  const root = pinnedRoot();
  if (specifier === "@earendil-works/pi-coding-agent") return pathToFileURL(resolve(root, "dist", "index.js")).href;
  const match = /^(@[^/]+\/[^/]+|[^/]+)(\/.*)?$/.exec(specifier);
  if (match === null) throw new Error(`pinned Pi import is invalid: ${specifier}`);
  const packageName = match[1] ?? "";
  const subpath = match[2]?.slice(1) ?? "";
  const packageRoot = resolve(root, "node_modules", ...packageName.split("/"));
  const manifestPath = resolve(packageRoot, "package.json");
  if (!existsSync(manifestPath)) throw new Error(`pinned Pi dependency is unavailable: ${packageName}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const declaredTarget = exportedTarget(manifest.exports, subpath) ?? (subpath.length === 0 ? manifest.module ?? manifest.main : undefined);
  const target = typeof declaredTarget === "string" && !declaredTarget.startsWith(".") ? `./${declaredTarget}` : declaredTarget;
  if (typeof target !== "string" || !target.startsWith("./")) throw new Error(`pinned Pi dependency export is unavailable: ${specifier}`);
  const path = resolve(packageRoot, target);
  if (!path.startsWith(`${packageRoot}${sep}`) || !existsSync(path)) throw new Error(`pinned Pi dependency export is missing: ${specifier}`);
  return pathToFileURL(path).href;
}

function pinnedRoot() {
  const root = process.env.PI_PACKAGE_DIR;
  if (!root || !existsSync(resolve(root, "package.json"))) throw new Error("pinned Pi public package directory is not configured");
  return resolve(root);
}

/**
 * @param {unknown} exports
 * @param {string} subpath
 * @returns {string | undefined}
 */
function exportedTarget(exports, subpath) {
  const key = subpath.length === 0 ? "." : `./${subpath}`;
  if (typeof exports === "string") return subpath.length === 0 ? exports : undefined;
  if (!exports || typeof exports !== "object") return undefined;
  const exact = /** @type {Record<string, unknown>} */ (exports)[key];
  if (exact !== undefined) return importCondition(exact);
  for (const [pattern, value] of Object.entries(exports)) {
    const star = pattern.indexOf("*");
    if (star < 0 || !key.startsWith(pattern.slice(0, star)) || !key.endsWith(pattern.slice(star + 1))) continue;
    const matched = key.slice(star, key.length - (pattern.length - star - 1));
    const target = importCondition(value);
    return typeof target === "string" ? target.replaceAll("*", matched) : undefined;
  }
  return undefined;
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function importCondition(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const conditions = /** @type {{ import?: unknown; default?: unknown }} */ (value);
  return importCondition(conditions.import ?? conditions.default);
}
