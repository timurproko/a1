/**
 * One pi-tui module identity per process.
 *
 * npm materializes @earendil-works/pi-tui twice under A1's package root: once
 * as A1's direct dependency at the node_modules root, and once nested inside
 * @earendil-works/pi-coding-agent, whose published npm-shrinkwrap.json makes
 * npm build its dependency tree exactly as shrinkwrapped instead of sharing a
 * hoisted copy. Both are the same version; npm just cannot tell them apart.
 *
 * Two copies means two of every TUI class. Pinned Pi hands extensions the
 * nested copy — its extension loader aliases the specifier to whatever it
 * resolves from its own directory — so an extension's `instanceof` check and
 * its prototype patches land on classes A1's renderer never uses. Extension
 * chrome silently disappears and routed input dead-ends, with no error.
 *
 * A1 therefore does not import the specifier at all. Its package declares the
 * subpath import `#pi-tui`, resolving to bin/pi-tui.js — a proxy that
 * re-exports pinned Pi's nested copy. The hop through the proxy is load-bearing:
 * Node rejects package-imports targets containing a `node_modules` path segment
 * (Invalid Package Target) and silently falls through to any fallback, which is
 * exactly how an earlier alias that named the nested path directly reintroduced
 * the split while appearing to declare the opposite. A plain import specifier
 * inside a module carries no such restriction.
 *
 * What remains here is the check that it worked. The alias is resolved by
 * asking Node itself — never by reimplementing resolution, which is how the
 * earlier check reported "unified" for a target Node had rejected — and the
 * proxy hop is followed to the module it re-exports. When that disagrees with
 * what pinned Pi resolves, launch says so, loudly and once, instead of leaving
 * a user to discover it as missing extension UI.
 *
 * This lives in bin/ (shipped, plain JS) because it inspects dependency
 * resolution, which the Pi API boundary policy rightly forbids ordinary
 * production code from touching.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * What A1's own modules resolve `#pi-tui` to, as a real path.
 *
 * Node answers for the alias itself (require.resolve honors package imports for
 * the package the parent belongs to). When the answer is A1's proxy file, the
 * module it re-exports is what A1 actually renders with, so the proxy's one
 * static `export * from` specifier is followed to its target.
 */
function resolveOwnPiTui(packageRoot) {
  const requireFromRoot = createRequire(pathToFileURL(join(packageRoot, "package.json")).href);
  let resolved;
  try {
    resolved = requireFromRoot.resolve("#pi-tui");
  } catch (error) {
    throw new Error(`#pi-tui does not resolve: ${message(error)}`);
  }
  return canonical(followProxyReExport(resolved));
}

/**
 * Follow A1's proxy hop: one relative `export * from "..."` per file, at most
 * one hop. A resolution that is not the proxy (or any file without such a
 * re-export) is returned as-is.
 */
function followProxyReExport(resolvedPath) {
  let source;
  try {
    source = readFileSync(resolvedPath, "utf8");
  } catch {
    return resolvedPath;
  }
  const reExport = source.match(/^export \* from "(\.\.?\/[^"]+)";?$/m);
  if (!reExport) return resolvedPath;
  const target = join(dirname(resolvedPath), reExport[1]);
  if (!existsSync(target)) {
    throw new Error(`#pi-tui proxy ${resolvedPath} re-exports a missing file: ${target}`);
  }
  return target;
}

/**
 * What pinned Pi resolves the same specifier to, as a real path — asked from
 * inside Pi's own directory, which is where Pi asks it.
 *
 * Pi's directory is located by walking node_modules outward, the way Node
 * itself would, rather than by resolving Pi's entry: its `exports` map offers
 * no CommonJS condition, so an ordinary require cannot name it. From there a
 * require resolves pi-tui, which publishes no `exports` map at all.
 */
export function resolvePinnedPiTui(packageRoot) {
  let directory = packageRoot;
  while (true) {
    const candidate = join(directory, "node_modules", "@earendil-works", "pi-coding-agent");
    if (existsSync(join(candidate, "package.json"))) {
      return canonical(createRequire(pathToFileURL(join(candidate, "package.json")).href).resolve("@earendil-works/pi-tui"));
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error("pinned Pi is not installed beneath this package root");
    directory = parent;
  }
}

function canonical(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

/**
 * Report whether A1 and pinned Pi resolve pi-tui to the same file.
 * Returns a discriminated outcome; never throws.
 */
export function inspectPiTuiModuleIdentity(packageRoot) {
  let own;
  let pinned;
  try {
    own = resolveOwnPiTui(packageRoot);
  } catch (error) {
    return { kind: "unresolved", side: "a1", message: message(error) };
  }
  try {
    pinned = resolvePinnedPiTui(packageRoot);
  } catch (error) {
    return { kind: "unresolved", side: "pi", message: message(error) };
  }
  return own === pinned ? { kind: "unified", path: own } : { kind: "split", own, pinned };
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

/** Launch-entry wrapper: warn on stderr when the two sides disagree. */
export function assertSinglePiTuiModuleAtLaunch(packageRoot, warn) {
  const outcome = inspectPiTuiModuleIdentity(packageRoot);
  if (outcome.kind === "split") {
    warn(`a1: pi-tui resolves to two different copies (${outcome.own} for a1, ${outcome.pinned} for Pi); extension UI may not render. The #pi-tui alias in a1's package.json no longer names Pi's copy.\n`);
  } else if (outcome.kind === "unresolved") {
    warn(`a1: could not resolve pi-tui from ${outcome.side === "a1" ? "a1" : "pinned Pi"} (${outcome.message}); extension UI may not render.\n`);
  }
}
