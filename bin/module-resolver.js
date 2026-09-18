/**
 * One pi-tui module identity per process, decided at the loader.
 *
 * npm may materialize @earendil-works/pi-tui twice under A1's package root: as A1's own
 * dependency at the node_modules root and nested inside @earendil-works/pi-coding-agent,
 * whose shrinkwrap pins its own copy. Two copies means two of every TUI class: pinned Pi
 * hands extensions the copy it resolves itself, so an extension's `instanceof` check and
 * prototype patches would land on classes A1's renderer never uses, and extension chrome
 * would silently vanish.
 *
 * Rather than repairing the layout after the fact, this module asks Node which copy pinned
 * Pi resolves and installs a synchronous resolve hook that rewrites every pi-tui module URL,
 * from any importer and in any form (bare specifier, subpath, or an absolute path into the
 * other copy), to that one copy. When npm hoisted a single copy the two answers coincide and
 * the hook changes nothing. The hook is registered by the bin/ entries before any A1 module
 * loads, so the composition, the bundled Pi public artifact, and Pi's own extension loader
 * all share one module. bin/module-identity.js keeps the launch-time assertion that it
 * worked.
 *
 * This lives in bin/ (shipped, plain JS) because it inspects dependency resolution, which
 * the Pi API boundary policy rightly forbids ordinary production code from touching.
 */
import { createRequire, registerHooks } from "node:module";
import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PACKAGE = "@earendil-works/pi-tui";
const SEGMENT = `/node_modules/${PACKAGE}/`;

let installed = null;

/** The package root pinned Pi resolves `@earendil-works/pi-tui` to, as a real path. */
export function pinnedPiTuiPackageRoot(packageRoot) {
  return pinnedPiTuiLayout(packageRoot).pinnedRoot;
}

/**
 * Where pinned Pi lives and which pi-tui copy it resolves. The installation root is the directory
 * whose node_modules holds pinned Pi; the hook rewrites only modules beneath it, so fixture trees
 * and other release copies inspected from this process keep their own resolution.
 */
export function pinnedPiTuiLayout(packageRoot) {
  const piRoot = pinnedPiRoot(packageRoot);
  const requireFromPi = createRequire(pathToFileURL(join(piRoot, "package.json")).href);
  return {
    installationRoot: dirname(dirname(dirname(piRoot))),
    pinnedRoot: packageRootOf(canonical(requireFromPi.resolve(PACKAGE))),
  };
}

// Rationale: pinned Pi exports no `./package.json` subpath, so its directory is found by walking
// up from the package root the way Node itself would, never by reimplementing export resolution.
function pinnedPiRoot(packageRoot) {
  let directory = packageRoot;
  while (true) {
    const candidate = join(directory, "node_modules", "@earendil-works", "pi-coding-agent");
    if (existsSync(join(candidate, "package.json"))) return canonical(candidate);
    const parent = dirname(directory);
    if (parent === directory) throw new Error("pinned Pi is not installed beneath this package root");
    directory = parent;
  }
}

/**
 * Install the resolve hook once per process. Returns the pinned package root URL. Idempotent:
 * every bin/ entry calls it and only the first call registers.
 */
export function installPinnedPiTuiResolver(packageRoot) {
  if (installed !== null) return installed;
  const layout = pinnedPiTuiLayout(packageRoot);
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const result = nextResolve(specifier, context);
      const rewritten = redirectToPinned(result.url, layout);
      return rewritten === result.url ? result : { ...result, url: rewritten };
    },
  });
  installed = pathToFileURL(layout.pinnedRoot).href.replace(/\/$/, "");
  return installed;
}

/**
 * Rewrite a resolved pi-tui module URL beneath the installation root to the pinned copy; any
 * other URL is returned unchanged. Paths are compared as canonical real paths, never as URL
 * strings: a temp directory reached by its short 8.3 name or a different drive-letter case is
 * still the same installation.
 */
export function redirectToPinned(url, layout) {
  if (!url.startsWith("file:")) return url;
  const index = url.lastIndexOf(SEGMENT);
  if (index < 0) return url;
  const packagePath = canonical(fileURLToPath(url.slice(0, index + SEGMENT.length - 1)));
  if (packagePath === layout.pinnedRoot || !isWithin(layout.installationRoot, packagePath)) return url;
  return `${pathToFileURL(layout.pinnedRoot).href.replace(/\/$/, "")}${url.slice(index + SEGMENT.length - 1)}`;
}

function isWithin(root, path) {
  const relativePath = relative(root, path);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function canonical(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

function packageRootOf(modulePath) {
  let directory = dirname(modulePath);
  while (!directory.endsWith(join("node_modules", "@earendil-works", "pi-tui"))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`${modulePath} is not inside a ${PACKAGE} package`);
    directory = parent;
  }
  return directory;
}
