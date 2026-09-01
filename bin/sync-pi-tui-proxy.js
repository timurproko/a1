/**
 * Point the `#pi-tui` proxy at the copy pinned Pi actually resolves.
 *
 * The proxy (bin/pi-tui.js) re-exports one static path, but npm does not
 * materialize one layout: `npm ci` against A1's lockfile keeps pinned Pi's
 * shrinkwrapped nested pi-tui copy, while a global `npm install -g` of the
 * published tarball hoists pi-tui to A1's node_modules root and materializes
 * no nested copy at all. A static path can only name one of those layouts —
 * whichever the other layout lacks, the proxy's import fails at launch and
 * extension UI never renders.
 *
 * This script runs on postinstall, asks Node what pinned Pi resolves
 * `@earendil-works/pi-tui` to — the copy Pi's extension loader hands to
 * extensions — and rewrites the proxy's single re-export (and its declaration
 * twin) to that file. Whatever tree npm built, the proxy names the module Pi
 * uses, so A1's renderer and Pi's extensions share one class identity.
 *
 * It never fails an install: a tree in which pinned Pi or its pi-tui cannot
 * be resolved is reported on stderr and left untouched, and launch's
 * module-identity check names the same condition to the user.
 *
 * This lives in bin/ (shipped, plain JS) because it inspects and names
 * dependency resolution, which the Pi API boundary policy rightly forbids
 * ordinary production code from touching.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolvePinnedPiTui } from "./module-identity.js";

const RE_EXPORT_LINE = /^export \* from "[^"]+";$/m;

/**
 * Rewrite the proxy pair under packageRoot/bin to re-export the pi-tui module
 * pinned Pi resolves. Returns a discriminated outcome; never throws.
 */
export function syncPiTuiProxy(packageRoot) {
  // Platform: resolvePinnedPiTui answers with a canonical real path, so the directory the
  // relative specifier is computed from must be canonical too (Windows short
  // names, symlinked installs).
  const canonicalRoot = canonical(packageRoot);
  let target;
  try {
    target = resolvePinnedPiTui(canonicalRoot);
  } catch (error) {
    return { kind: "unresolved", message: error instanceof Error ? error.message : String(error) };
  }

  const binDirectory = join(canonicalRoot, "bin");
  const runtimeSpecifier = relativeSpecifier(binDirectory, target);
  const declarationSpecifier = runtimeSpecifier.replace(/\.js$/, ".d.ts").replace(/\.d\.d\.ts$/, ".d.ts");
  const changed = [];
  for (const [file, specifier] of [
    ["pi-tui.js", runtimeSpecifier],
    ["pi-tui.d.ts", declarationSpecifier],
  ]) {
    if (rewriteReExport(join(binDirectory, file), specifier)) changed.push(file);
  }
  return { kind: "synced", target, changed };
}

function canonical(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

function relativeSpecifier(fromDirectory, toFile) {
  const specifier = relative(fromDirectory, toFile).split("\\").join("/");
  return specifier.startsWith(".") ? specifier : `./${specifier}`;
}

/** Replace the file's single re-export line; returns whether the file changed. */
function rewriteReExport(file, specifier) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    return false;
  }
  const line = `export * from "${specifier}";`;
  if (source.includes(line) || !RE_EXPORT_LINE.test(source)) return false;
  writeFileSync(file, source.replace(RE_EXPORT_LINE, line));
  return true;
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const outcome = syncPiTuiProxy(packageRoot);
  if (outcome.kind === "unresolved") {
    process.stderr.write(`a1: could not point #pi-tui at pinned Pi's copy (${outcome.message}); extension UI may not render.\n`);
  }
}
